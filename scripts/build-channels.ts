/**
 * Build script: fetches YouTube RSS feeds for curated channels,
 * then calls YouTube Data API v3 for video durations.
 *
 * Usage:
 *   npx tsx scripts/build-channels.ts
 *
 * Requires YOUTUBE_API_KEY environment variable.
 * Outputs static/data/channels.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// --- RSS Parsing ---

const RSS_URL = (channelId: string) =>
	`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

async function fetchRSSVideos(channelId: string): Promise<{ id: string; title: string }[]> {
	const url = RSS_URL(channelId);
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (compatible; ChannelSurfer/1.0; build-script)'
		}
	});

	if (!response.ok) {
		console.warn(`RSS fetch failed for ${channelId}: ${response.status}`);
		return [];
	}

	const xml = await response.text();
	const videos: { id: string; title: string }[] = [];

	// Simple regex-based XML parsing (no dependency needed for Atom feeds)
	const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
	let match;
	while ((match = entryRegex.exec(xml)) !== null) {
		const entry = match[1];
		const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
		const titleMatch = entry.match(/<media:title>([^<]+)<\/media:title>/);
		if (videoIdMatch && titleMatch) {
			videos.push({
				id: videoIdMatch[1],
				title: decodeXMLEntities(titleMatch[1])
			});
		}
	}

	return videos;
}

function decodeXMLEntities(str: string): string {
	return str
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'");
}

// --- YouTube Data API ---

function parseISO8601Duration(iso: string): number {
	const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return 0;
	const hours = parseInt(match[1] || '0', 10);
	const minutes = parseInt(match[2] || '0', 10);
	const seconds = parseInt(match[3] || '0', 10);
	return hours * 3600 + minutes * 60 + seconds;
}

async function fetchVideoDurations(
	videoIds: string[],
	apiKey: string
): Promise<Map<string, number>> {
	const durations = new Map<string, number>();

	// API accepts up to 50 IDs per request
	for (let i = 0; i < videoIds.length; i += 50) {
		const batch = videoIds.slice(i, i + 50);
		const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch.join(',')}&key=${apiKey}`;

		const response = await fetch(url);
		if (!response.ok) {
			const text = await response.text();
			throw new Error(`YouTube API error (${response.status}): ${text}`);
		}

		const data = (await response.json()) as {
			items: Array<{ id: string; contentDetails: { duration: string } }>;
		};

		for (const item of data.items) {
			durations.set(item.id, parseISO8601Duration(item.contentDetails.duration));
		}
	}

	return durations;
}

// --- Main ---

async function main() {
	const apiKey = process.env.YOUTUBE_API_KEY;
	if (!apiKey) {
		console.error('Error: YOUTUBE_API_KEY environment variable is required.');
		console.error('Get one at https://console.cloud.google.com/apis/credentials');
		process.exit(1);
	}

	const definitionsPath = resolve(__dirname, 'channel-definitions.json');
	const definitions: ChannelDefinition[] = JSON.parse(readFileSync(definitionsPath, 'utf-8'));

	console.log(`Processing ${definitions.length} channels...`);

	// Step 1: Fetch RSS feeds for all channels
	const allVideoIds: string[] = [];
	const channelVideosMap = new Map<string, { id: string; title: string }[]>();

	for (const def of definitions) {
		console.log(`  Fetching RSS: ${def.name} (${def.youtubeChannelId})`);
		const videos = await fetchRSSVideos(def.youtubeChannelId);
		channelVideosMap.set(def.slug, videos);
		allVideoIds.push(...videos.map((v) => v.id));
		console.log(`    Found ${videos.length} videos`);
	}

	// Step 2: Fetch durations for all videos in one batch
	const uniqueIds = [...new Set(allVideoIds)];
	console.log(`\nFetching durations for ${uniqueIds.length} unique videos...`);
	const durations = await fetchVideoDurations(uniqueIds, apiKey);
	console.log(`  Got durations for ${durations.size} videos`);

	// Step 3: Assemble output
	const output: OutputChannel[] = definitions.map((def) => {
		const rssVideos = channelVideosMap.get(def.slug) || [];
		const videos: VideoData[] = rssVideos
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
	console.log(`\nDone! Wrote ${output.length} channels with ${totalVideos} total videos to:`);
	console.log(`  ${outputPath}`);
}

main().catch((err) => {
	console.error('Build failed:', err);
	process.exit(1);
});
