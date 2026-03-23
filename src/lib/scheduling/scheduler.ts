import type { Channel, Video, ScheduleResult, GuideSlot } from './types.js';
import { hashString, seededShuffle } from './prng.js';

/** Fixed epoch: 2024-01-01T00:00:00Z in seconds. */
const EPOCH = 1704067200;

/**
 * Flatten all videos from a channel's sources into a single ordered list,
 * then deterministically shuffle based on the channel slug.
 */
export function getChannelVideos(channel: Channel): Video[] {
	const allVideos: Video[] = [];
	for (const source of channel.sources) {
		allVideos.push(...source.videos);
	}
	if (allVideos.length === 0) return [];
	const seed = hashString(channel.slug);
	return seededShuffle(allVideos, seed);
}

/**
 * Compute the total cycle duration for a list of videos.
 */
export function getCycleDuration(videos: Video[]): number {
	return videos.reduce((sum, v) => sum + v.duration, 0);
}

/**
 * Given a channel and a unix timestamp (seconds), compute what's currently playing.
 * Returns null if the channel has no videos.
 */
export function getScheduleAt(channel: Channel, timestamp: number): ScheduleResult | null {
	const videos = getChannelVideos(channel);
	if (videos.length === 0) return null;

	const totalCycle = getCycleDuration(videos);
	if (totalCycle <= 0) return null;

	const elapsed = timestamp - EPOCH;
	// Handle timestamps before epoch by wrapping correctly
	const position = ((elapsed % totalCycle) + totalCycle) % totalCycle;

	let accumulated = 0;
	for (let i = 0; i < videos.length; i++) {
		const video = videos[i];
		if (accumulated + video.duration > position) {
			const offsetSeconds = position - accumulated;
			const nextIndex = (i + 1) % videos.length;
			const secondsUntilNext = video.duration - offsetSeconds;
			return {
				video,
				offsetSeconds,
				nextVideo: videos[nextIndex],
				secondsUntilNext
			};
		}
		accumulated += video.duration;
	}

	// Should never reach here, but handle floating point edge case
	const lastVideo = videos[videos.length - 1];
	return {
		video: lastVideo,
		offsetSeconds: 0,
		nextVideo: videos[0],
		secondsUntilNext: lastVideo.duration
	};
}

/**
 * Compute the schedule for a time range, returning guide slots.
 * Used to populate the TV guide grid.
 *
 * @param channel - The channel to compute slots for
 * @param startTime - Start of range (unix seconds)
 * @param endTime - End of range (unix seconds)
 */
export function getScheduleRange(
	channel: Channel,
	startTime: number,
	endTime: number
): GuideSlot[] {
	const videos = getChannelVideos(channel);
	if (videos.length === 0) return [];

	const totalCycle = getCycleDuration(videos);
	if (totalCycle <= 0) return [];

	const slots: GuideSlot[] = [];
	let currentTime = startTime;

	while (currentTime < endTime) {
		const elapsed = currentTime - EPOCH;
		const position = ((elapsed % totalCycle) + totalCycle) % totalCycle;

		// Find which video is playing at currentTime
		let accumulated = 0;
		for (let i = 0; i < videos.length; i++) {
			const video = videos[i];
			if (accumulated + video.duration > position) {
				const offsetIntoVideo = position - accumulated;
				const remainingDuration = video.duration - offsetIntoVideo;

				// The slot starts at currentTime and ends when the video ends
				// (or at endTime, whichever comes first)
				const slotStart = currentTime;
				const slotEnd = Math.min(currentTime + remainingDuration, endTime);

				slots.push({
					video,
					startTime: slotStart,
					endTime: slotEnd
				});

				currentTime = currentTime + remainingDuration;
				break;
			}
			accumulated += video.duration;
		}
	}

	return slots;
}
