/**
 * Build script: fetches video data for topic-based channels from YouTube Data API v3.
 *
 * Each TV channel is a topic (Science, History, etc.) containing videos from
 * multiple YouTube channels. Videos are balanced so no single source dominates
 * by count or total duration.
 *
 * Usage:   npm run build:channels
 * Requires YOUTUBE_API_KEY in .env file.
 * Outputs  static/data/channels.json
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const TARGET_DURATION = 18 * 60 * 60; // 18 hours per TV channel
const MIN_VIDEO_DURATION = 299; // Filter out Shorts and very short clips
const MAX_VIDEO_DURATION = 95 * 60; // 1hr 35min — skip marathon-length videos
const MAX_VIDEOS_PER_SOURCE = 80; // Cap per YouTube channel to prevent dominance
const MAX_PAGES_PER_SOURCE = 6; // Pages of 50 = 300 videos max scanned per source

type YTChannel = { id: string; name: string };

type ChannelDefinition = {
	name: string;
	slug: string;
	number: number;
	category: string;
	youtubeChannels: YTChannel[];
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
	sources: [{ type: 'default'; youtubeChannelIds: string[]; videos: VideoData[] }];
};

// --- YouTube Data API helpers ---

async function apiFetch(endpoint: string, params: Record<string, string>, apiKey: string) {
	const url = new URL(`${API_BASE}/${endpoint}`);
	url.searchParams.set('key', apiKey);
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

	const response = await fetch(url.toString());
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`YouTube API ${endpoint} error (${response.status}): ${text}`);
	}
	return response.json();
}

async function getUploadsPlaylistId(channelId: string, apiKey: string): Promise<string> {
	const data = await apiFetch('channels', { part: 'contentDetails', id: channelId }, apiKey) as any;
	if (!data.items?.length) throw new Error(`Channel ${channelId} not found`);
	return data.items[0].contentDetails.relatedPlaylists.uploads;
}

function parseISO8601Duration(iso: string): number {
	const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return 0;
	return (parseInt(match[1] || '0') * 3600) + (parseInt(match[2] || '0') * 60) + parseInt(match[3] || '0');
}

async function fetchVideoDurations(videoIds: string[], apiKey: string): Promise<Map<string, number>> {
	const durations = new Map<string, number>();
	for (let i = 0; i < videoIds.length; i += 50) {
		const batch = videoIds.slice(i, i + 50);
		const data = await apiFetch('videos', { part: 'contentDetails', id: batch.join(',') }, apiKey) as any;
		for (const item of data.items) {
			durations.set(item.id, parseISO8601Duration(item.contentDetails.duration));
		}
	}
	return durations;
}

/** Fetch videos from a single YouTube channel's uploads playlist. */
async function fetchSourceVideos(
	channelId: string,
	apiKey: string
): Promise<VideoData[]> {
	const playlistId = await getUploadsPlaylistId(channelId, apiKey);
	const videos: VideoData[] = [];
	let pageToken: string | undefined;

	for (let page = 0; page < MAX_PAGES_PER_SOURCE; page++) {
		const params: Record<string, string> = { part: 'snippet', playlistId, maxResults: '50' };
		if (pageToken) params.pageToken = pageToken;

		const data = await apiFetch('playlistItems', params, apiKey) as any;
		if (!data.items?.length) break;

		const ids = data.items.map((item: any) => item.snippet.resourceId.videoId);
		const durations = await fetchVideoDurations(ids, apiKey);

		for (const item of data.items) {
			const id = item.snippet.resourceId.videoId;
			const duration = durations.get(id);
			if (duration && duration >= MIN_VIDEO_DURATION && duration <= MAX_VIDEO_DURATION) {
				videos.push({
					id,
					title: item.snippet.title,
					duration,
					thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`
				});
			}
		}

		if (videos.length >= MAX_VIDEOS_PER_SOURCE) break;
		if (!data.nextPageToken) break;
		pageToken = data.nextPageToken;
	}

	return videos.slice(0, MAX_VIDEOS_PER_SOURCE);
}

function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return `${h}h${m}m`;
}

/**
 * Balance videos from multiple sources by equalising screen time.
 * Always picks from the source with the least accumulated duration,
 * so each YouTube channel gets roughly equal airtime regardless of
 * individual video lengths.
 */
function balanceVideos(sourceVideos: Map<string, VideoData[]>): VideoData[] {
	const balanced: VideoData[] = [];
	const seen = new Set<string>();
	let totalDuration = 0;

	const sources = [...sourceVideos.entries()].map(([name, videos]) => ({
		name,
		videos,
		index: 0,
		duration: 0
	}));

	while (totalDuration < TARGET_DURATION) {
		let best: typeof sources[0] | null = null;
		for (const s of sources) {
			if (s.index >= s.videos.length) continue;
			if (!best || s.duration < best.duration) best = s;
		}
		if (!best) break;

		const video = best.videos[best.index];
		best.index++;

		if (seen.has(video.id)) continue;
		seen.add(video.id);

		balanced.push(video);
		best.duration += video.duration;
		totalDuration += video.duration;
	}

	return balanced;
}

// --- Main ---

async function main() {
	const apiKey = process.env.YOUTUBE_API_KEY;
	if (!apiKey) {
		console.error('Error: YOUTUBE_API_KEY required. Create .env with YOUTUBE_API_KEY=your_key');
		process.exit(1);
	}

	const definitionsPath = resolve(__dirname, 'channel-definitions.json');
	const definitions: ChannelDefinition[] = JSON.parse(readFileSync(definitionsPath, 'utf-8'));

	console.log(`Target: ${formatDuration(TARGET_DURATION)} per channel, ${definitions.length} topics\n`);

	const output: OutputChannel[] = [];

	for (const def of definitions) {
		console.log(`  ${def.name} (${def.youtubeChannels.length} sources)`);
		const sourceVideos = new Map<string, VideoData[]>();

		for (const ytCh of def.youtubeChannels) {
			try {
				const videos = await fetchSourceVideos(ytCh.id, apiKey);
				sourceVideos.set(ytCh.name, videos);
				const dur = videos.reduce((s, v) => s + v.duration, 0);
				console.log(`    ${ytCh.name}: ${videos.length} videos, ${formatDuration(dur)}`);
			} catch (err) {
				console.error(`    ${ytCh.name}: FAILED - ${err}`);
			}
		}

		const balanced = balanceVideos(sourceVideos);
		const totalDur = balanced.reduce((s, v) => s + v.duration, 0);
		const met = totalDur >= TARGET_DURATION;
		console.log(`    → ${balanced.length} videos, ${formatDuration(totalDur)}${met ? '' : ' (under target)'}\n`);

		output.push({
			name: def.name,
			slug: def.slug,
			number: def.number,
			category: def.category,
			sources: [{
				type: 'default' as const,
				youtubeChannelIds: def.youtubeChannels.map((c) => c.id),
				videos: balanced
			}]
		});
	}

	const outputDir = resolve(__dirname, '..', 'static', 'data');
	mkdirSync(outputDir, { recursive: true });
	const outputPath = resolve(outputDir, 'channels.json');
	writeFileSync(outputPath, JSON.stringify(output, null, '\t'));

	const totalVideos = output.reduce((sum, ch) => sum + ch.sources[0].videos.length, 0);
	const totalDuration = output.reduce((sum, ch) =>
		sum + ch.sources[0].videos.reduce((s, v) => s + v.duration, 0), 0);
	console.log(`Done! ${output.length} channels, ${totalVideos} videos, ${formatDuration(totalDuration)} total`);
	console.log(`  → ${outputPath}`);
}

main().catch((err) => {
	console.error('Build failed:', err);
	process.exit(1);
});
