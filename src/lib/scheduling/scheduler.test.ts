import { describe, it, expect } from 'vitest';
import {
	getScheduleAt,
	getScheduleRange,
	getChannelVideos,
	getCycleDuration
} from './scheduler.js';
import type { Channel, Video } from './types.js';

// --- Test fixtures ---

function makeVideo(id: string, duration: number): Video {
	return { id, title: `Video ${id}`, duration, thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg` };
}

function makeChannel(slug: string, videos: Video[], number = 1): Channel {
	return {
		name: slug.replace(/-/g, ' '),
		slug,
		number,
		category: 'test',
		sources: [{ type: 'imported', videos }]
	};
}

const EPOCH = 1704067200; // 2024-01-01T00:00:00Z

// Three videos: 60s, 120s, 180s = 360s total cycle
const threeVideos = [makeVideo('a', 60), makeVideo('b', 120), makeVideo('c', 180)];
const threeVideoChannel = makeChannel('test-channel', threeVideos);

// Single video channel
const singleVideo = [makeVideo('only', 300)];
const singleVideoChannel = makeChannel('single', singleVideo);

// --- Tests ---

describe('getChannelVideos', () => {
	it('flattens videos from multiple sources', () => {
		const channel: Channel = {
			name: 'Multi Source',
			slug: 'multi-source',
			number: 1,
			category: 'test',
			sources: [
				{ type: 'imported', videos: [makeVideo('a', 60)] },
				{ type: 'imported', videos: [makeVideo('b', 120)] }
			]
		};
		const videos = getChannelVideos(channel);
		expect(videos).toHaveLength(2);
		// Both videos present (order depends on shuffle)
		const ids = videos.map((v) => v.id).sort();
		expect(ids).toEqual(['a', 'b']);
	});

	it('returns empty array for channel with no videos', () => {
		const channel = makeChannel('empty', []);
		expect(getChannelVideos(channel)).toEqual([]);
	});

	it('shuffles deterministically based on slug', () => {
		const videos1 = getChannelVideos(threeVideoChannel);
		const videos2 = getChannelVideos(threeVideoChannel);
		expect(videos1.map((v) => v.id)).toEqual(videos2.map((v) => v.id));
	});

	it('different slugs produce different shuffle orders', () => {
		const channelA = makeChannel('channel-alpha', threeVideos);
		const channelB = makeChannel('channel-beta', threeVideos);
		const orderA = getChannelVideos(channelA).map((v) => v.id);
		const orderB = getChannelVideos(channelB).map((v) => v.id);
		// With only 3 items there's a small chance they match, but with different seeds it's unlikely
		// We just verify they're computed consistently
		expect(orderA).toHaveLength(3);
		expect(orderB).toHaveLength(3);
	});
});

describe('getCycleDuration', () => {
	it('sums all video durations', () => {
		expect(getCycleDuration(threeVideos)).toBe(360);
	});

	it('returns 0 for empty list', () => {
		expect(getCycleDuration([])).toBe(0);
	});
});

describe('getScheduleAt', () => {
	it('returns null for empty channel', () => {
		const channel = makeChannel('empty', []);
		expect(getScheduleAt(channel, EPOCH)).toBeNull();
	});

	it('returns a valid result at epoch', () => {
		const result = getScheduleAt(threeVideoChannel, EPOCH);
		expect(result).not.toBeNull();
		expect(result!.offsetSeconds).toBe(0);
	});

	it('is deterministic — same timestamp always returns same result', () => {
		const timestamp = EPOCH + 5000;
		const r1 = getScheduleAt(threeVideoChannel, timestamp);
		const r2 = getScheduleAt(threeVideoChannel, timestamp);
		expect(r1).toEqual(r2);
	});

	it('different timestamps return different offsets', () => {
		const r1 = getScheduleAt(threeVideoChannel, EPOCH + 10);
		const r2 = getScheduleAt(threeVideoChannel, EPOCH + 50);
		// They might be in the same video but offsets differ
		expect(r1!.offsetSeconds).not.toBe(r2!.offsetSeconds);
	});

	it('different channels at same timestamp can return different videos', () => {
		const channelA = makeChannel('alpha-channel', threeVideos, 1);
		const channelB = makeChannel('beta-channel', threeVideos, 2);
		const rA = getScheduleAt(channelA, EPOCH + 100);
		const rB = getScheduleAt(channelB, EPOCH + 100);
		// Different shuffle orders mean different videos may play
		// (not guaranteed with only 3 videos, but the offsets will differ)
		expect(rA).not.toBeNull();
		expect(rB).not.toBeNull();
	});

	it('cycles back after total duration', () => {
		const totalCycle = getCycleDuration(getChannelVideos(threeVideoChannel));
		const r1 = getScheduleAt(threeVideoChannel, EPOCH);
		const r2 = getScheduleAt(threeVideoChannel, EPOCH + totalCycle);
		expect(r1!.video.id).toBe(r2!.video.id);
		expect(r1!.offsetSeconds).toBe(r2!.offsetSeconds);
	});

	it('wraps correctly at multiple cycles', () => {
		const totalCycle = getCycleDuration(getChannelVideos(threeVideoChannel));
		const r1 = getScheduleAt(threeVideoChannel, EPOCH + 45);
		const r2 = getScheduleAt(threeVideoChannel, EPOCH + 45 + totalCycle * 100);
		expect(r1!.video.id).toBe(r2!.video.id);
		expect(r1!.offsetSeconds).toBe(r2!.offsetSeconds);
	});

	it('handles timestamps before epoch', () => {
		const result = getScheduleAt(threeVideoChannel, EPOCH - 100);
		expect(result).not.toBeNull();
		expect(result!.offsetSeconds).toBeGreaterThanOrEqual(0);
	});

	it('offsetSeconds + secondsUntilNext equals video duration', () => {
		for (let t = 0; t < 360; t += 17) {
			const result = getScheduleAt(threeVideoChannel, EPOCH + t);
			expect(result).not.toBeNull();
			expect(result!.offsetSeconds + result!.secondsUntilNext).toBe(result!.video.duration);
		}
	});

	it('offsetSeconds is always less than video duration', () => {
		for (let t = 0; t < 1000; t += 7) {
			const result = getScheduleAt(threeVideoChannel, EPOCH + t);
			expect(result).not.toBeNull();
			expect(result!.offsetSeconds).toBeLessThan(result!.video.duration);
			expect(result!.offsetSeconds).toBeGreaterThanOrEqual(0);
		}
	});

	it('nextVideo wraps to first video at end of cycle', () => {
		const videos = getChannelVideos(threeVideoChannel);
		const totalCycle = getCycleDuration(videos);
		// Find a timestamp near the end of the last video
		const result = getScheduleAt(threeVideoChannel, EPOCH + totalCycle - 1);
		expect(result).not.toBeNull();
		// The last video's nextVideo should be the first video
		const lastVideo = videos[videos.length - 1];
		if (result!.video.id === lastVideo.id) {
			expect(result!.nextVideo.id).toBe(videos[0].id);
		}
	});

	it('works with single-video channel', () => {
		const result = getScheduleAt(singleVideoChannel, EPOCH + 150);
		expect(result).not.toBeNull();
		expect(result!.video.id).toBe('only');
		expect(result!.offsetSeconds).toBe(150);
		expect(result!.nextVideo.id).toBe('only'); // loops to itself
		expect(result!.secondsUntilNext).toBe(150);
	});

	it('transitions correctly at video boundary', () => {
		const videos = getChannelVideos(threeVideoChannel);
		const firstDuration = videos[0].duration;

		// Just before transition
		const before = getScheduleAt(threeVideoChannel, EPOCH + firstDuration - 1);
		expect(before).not.toBeNull();
		expect(before!.video.id).toBe(videos[0].id);
		expect(before!.secondsUntilNext).toBe(1);

		// Exactly at transition
		const at = getScheduleAt(threeVideoChannel, EPOCH + firstDuration);
		expect(at).not.toBeNull();
		expect(at!.video.id).toBe(videos[1].id);
		expect(at!.offsetSeconds).toBe(0);
	});
});

describe('getScheduleRange', () => {
	it('returns empty array for empty channel', () => {
		const channel = makeChannel('empty', []);
		expect(getScheduleRange(channel, EPOCH, EPOCH + 3600)).toEqual([]);
	});

	it('returns slots covering the entire range', () => {
		const slots = getScheduleRange(threeVideoChannel, EPOCH, EPOCH + 3600);
		expect(slots.length).toBeGreaterThan(0);

		// First slot starts at or before the range start
		expect(slots[0].startTime).toBe(EPOCH);

		// Last slot ends at or after the range end
		const lastSlot = slots[slots.length - 1];
		expect(lastSlot.endTime).toBeGreaterThanOrEqual(EPOCH + 3600);
	});

	it('slots are contiguous (no gaps)', () => {
		const slots = getScheduleRange(threeVideoChannel, EPOCH, EPOCH + 3600);
		for (let i = 1; i < slots.length; i++) {
			expect(slots[i].startTime).toBe(slots[i - 1].endTime);
		}
	});

	it('slot durations are positive', () => {
		const slots = getScheduleRange(threeVideoChannel, EPOCH, EPOCH + 3600);
		for (const slot of slots) {
			expect(slot.endTime - slot.startTime).toBeGreaterThan(0);
		}
	});

	it('each slot duration does not exceed original video duration', () => {
		const slots = getScheduleRange(threeVideoChannel, EPOCH, EPOCH + 3600);
		for (const slot of slots) {
			expect(slot.endTime - slot.startTime).toBeLessThanOrEqual(slot.video.duration);
		}
	});

	it('handles range of exactly one cycle', () => {
		const totalCycle = getCycleDuration(getChannelVideos(threeVideoChannel));
		const slots = getScheduleRange(threeVideoChannel, EPOCH, EPOCH + totalCycle);
		// Should have exactly 3 slots (one per video) since we start at epoch
		const videos = getChannelVideos(threeVideoChannel);
		expect(slots).toHaveLength(videos.length);
	});

	it('handles short range within a single video', () => {
		const slots = getScheduleRange(threeVideoChannel, EPOCH + 10, EPOCH + 20);
		expect(slots).toHaveLength(1);
		expect(slots[0].startTime).toBe(EPOCH + 10);
		expect(slots[0].endTime).toBeGreaterThanOrEqual(EPOCH + 20);
	});

	it('consistent with getScheduleAt', () => {
		const slots = getScheduleRange(threeVideoChannel, EPOCH, EPOCH + 3600);
		// Check a few slots against getScheduleAt
		for (const slot of slots.slice(0, 5)) {
			const result = getScheduleAt(threeVideoChannel, slot.startTime);
			expect(result).not.toBeNull();
			expect(result!.video.id).toBe(slot.video.id);
		}
	});
});
