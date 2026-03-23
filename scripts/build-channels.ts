/**
 * Build script: fetches video data for curated channels using YouTube Data API v3.
 *
 * Uses the uploads playlist (UC... → UU...) to get recent videos,
 * then fetches durations in a single batch call.
 *
 * Usage:
 *   npm run build:channels
 *
 * Requires YOUTUBE_API_KEY in .env file.
 * Outputs static/data/channels.json
 *
 * Quota cost: ~2 units per channel + 1 unit per 50 videos for durations.
 * For 10 channels with 15 videos each: ~12 units total (of 10,000/day free).
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const VIDEOS_PER_CHANNEL = 15;

type ChannelDefinition = {
	name: string;
	slug: string;
	number: number;
	category: string;
	youtubeChannelId: string;
};

type VideoData = {
	id: string;
	title: string;
	duration: number;
	thumbnail: string;
};

type OutputChannel = {
	name: string;
	slug: string;
	number: number;
	category: string;
	sources: [{ type: 'default'; youtubeChannelId: string; videos: VideoData[] }];
};

// --- YouTube Data API helpers ---

async function apiFetch(endpoint: string, params: Record<string, string>, apiKey: string) {
	const url = new URL(`${API_BASE}/${endpoint}`);
	url.searchParams.set('key', apiKey);
	for (const [k, v] of Object.entries(params)) {
		url.searchParams.set(k, v);
	}

	const response = await fetch(url.toString());
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`YouTube API ${endpoint} error (${response.status}): ${text}`);
	}
	return response.json();
}

/**
 * Get the uploads playlist ID for a channel via the channels endpoint.
 */
async function getUploadsPlaylistId(channelId: string, apiKey: string): Promise<string> {
	const data = await apiFetch('channels', {
		part: 'contentDetails',
		id: channelId
	}, apiKey) as {
		items: Array<{
			contentDetails: {
				relatedPlaylists: { uploads: string };
			};
		}>;
	};

	if (!data.items || data.items.length === 0) {
		throw new Error(`Channel ${channelId} not found`);
	}
	return data.items[0].contentDetails.relatedPlaylists.uploads;
}

/**
 * Fetch recent video IDs + titles from a channel's uploads playlist.
 */
async function fetchPlaylistVideos(
	channelId: string,
	maxResults: number,
	apiKey: string
): Promise<{ id: string; title: string }[]> {
	const playlistId = await getUploadsPlaylistId(channelId, apiKey);

	const data = await apiFetch('playlistItems', {
		part: 'snippet',
		playlistId,
		maxResults: String(maxResults)
	}, apiKey) as {
		items: Array<{
			snippet: {
				title: string;
				resourceId: { videoId: string };
			};
		}>;
	};

	return data.items.map((item) => ({
		id: item.snippet.resourceId.videoId,
		title: item.snippet.title
	}));
}

/**
 * Fetch durations for a batch of video IDs.
 */
async function fetchVideoDurations(
	videoIds: string[],
	apiKey: string
): Promise<Map<string, number>> {
	const durations = new Map<string, number>();

	for (let i = 0; i < videoIds.length; i += 50) {
		const batch = videoIds.slice(i, i + 50);

		const data = await apiFetch('videos', {
			part: 'contentDetails',
			id: batch.join(',')
		}, apiKey) as {
			items: Array<{ id: string; contentDetails: { duration: string } }>;
		};

		for (const item of data.items) {
			durations.set(item.id, parseISO8601Duration(item.contentDetails.duration));
		}
	}

	return durations;
}

function parseISO8601Duration(iso: string): number {
	const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return 0;
	const hours = parseInt(match[1] || '0', 10);
	const minutes = parseInt(match[2] || '0', 10);
	const seconds = parseInt(match[3] || '0', 10);
	return hours * 3600 + minutes * 60 + seconds;
}

// --- Main ---

async function main() {
	const apiKey = process.env.YOUTUBE_API_KEY;
	if (!apiKey) {
		console.error('Error: YOUTUBE_API_KEY environment variable is required.');
		console.error('Create .env with YOUTUBE_API_KEY=your_key');
		console.error('Get a key at https://console.cloud.google.com/apis/credentials');
		process.exit(1);
	}

	const definitionsPath = resolve(__dirname, 'channel-definitions.json');
	const definitions: ChannelDefinition[] = JSON.parse(readFileSync(definitionsPath, 'utf-8'));

	console.log(`Processing ${definitions.length} channels...\n`);

	// Step 1: Fetch recent videos from each channel's uploads playlist
	const allVideoIds: string[] = [];
	const channelVideosMap = new Map<string, { id: string; title: string }[]>();

	for (const def of definitions) {
		console.log(`  ${def.name} (${def.youtubeChannelId})`);
		try {
			const videos = await fetchPlaylistVideos(def.youtubeChannelId, VIDEOS_PER_CHANNEL, apiKey);
			channelVideosMap.set(def.slug, videos);
			allVideoIds.push(...videos.map((v) => v.id));
			console.log(`    ✓ ${videos.length} videos`);
		} catch (err) {
			console.error(`    ✗ Failed: ${err}`);
			channelVideosMap.set(def.slug, []);
		}
	}

	// Step 2: Fetch durations for all videos in one batch
	const uniqueIds = [...new Set(allVideoIds)];
	console.log(`\nFetching durations for ${uniqueIds.length} unique videos...`);
	const durations = await fetchVideoDurations(uniqueIds, apiKey);
	console.log(`  ✓ Got ${durations.size} durations`);

	// Step 3: Assemble output
	const output: OutputChannel[] = definitions.map((def) => {
		const playlistVideos = channelVideosMap.get(def.slug) || [];
		const videos: VideoData[] = playlistVideos
			.filter((v) => durations.has(v.id) && durations.get(v.id)! > 0)
			.map((v) => ({
				id: v.id,
				title: v.title,
				duration: durations.get(v.id)!,
				thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`
			}));

		return {
			name: def.name,
			slug: def.slug,
			number: def.number,
			category: def.category,
			sources: [
				{
					type: 'default' as const,
					youtubeChannelId: def.youtubeChannelId,
					videos
				}
			]
		};
	});

	// Step 4: Write output
	const outputDir = resolve(__dirname, '..', 'static', 'data');
	mkdirSync(outputDir, { recursive: true });
	const outputPath = resolve(outputDir, 'channels.json');
	writeFileSync(outputPath, JSON.stringify(output, null, '\t'));

	const totalVideos = output.reduce((sum, ch) => sum + ch.sources[0].videos.length, 0);
	console.log(`\nDone! ${output.length} channels, ${totalVideos} videos → ${outputPath}`);
}

main().catch((err) => {
	console.error('Build failed:', err);
	process.exit(1);
});
