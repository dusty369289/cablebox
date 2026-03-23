/**
 * Channel store: manages the channel lineup and current selection.
 * Persists last watched channel in localStorage.
 */
import type { Channel } from '$lib/scheduling/types.js';

const LAST_CHANNEL_KEY = 'cablebox-last-channel';

let channels = $state<Channel[]>([]);
let currentIndex = $state(0);

function saveLastChannel() {
	const ch = channels[currentIndex];
	if (ch && typeof localStorage !== 'undefined') {
		localStorage.setItem(LAST_CHANNEL_KEY, ch.slug);
	}
}

function restoreLastChannel() {
	if (typeof localStorage === 'undefined') return;
	const slug = localStorage.getItem(LAST_CHANNEL_KEY);
	if (!slug) return;
	const idx = channels.findIndex((ch) => ch.slug === slug);
	if (idx >= 0) {
		currentIndex = idx;
	}
}

export function setChannels(list: Channel[]) {
	const previousSlug = channels[currentIndex]?.slug;
	channels = list;

	// Try to restore: first the previous channel (for imports), then localStorage
	if (previousSlug) {
		const idx = list.findIndex((ch) => ch.slug === previousSlug);
		if (idx >= 0) {
			currentIndex = idx;
			return;
		}
	}
	restoreLastChannel();
}

export function getChannels(): Channel[] {
	return channels;
}

export function getCurrentChannel(): Channel | null {
	return channels[currentIndex] ?? null;
}

export function getCurrentIndex(): number {
	return currentIndex;
}

export function switchToChannel(index: number) {
	if (index >= 0 && index < channels.length) {
		currentIndex = index;
		saveLastChannel();
	}
}

export function switchToChannelByNumber(num: number) {
	const idx = channels.findIndex((ch) => ch.number === num);
	if (idx >= 0) {
		currentIndex = idx;
		saveLastChannel();
	}
}

export function channelUp() {
	if (channels.length === 0) return;
	currentIndex = (currentIndex + 1) % channels.length;
	saveLastChannel();
}

export function channelDown() {
	if (channels.length === 0) return;
	currentIndex = (currentIndex - 1 + channels.length) % channels.length;
	saveLastChannel();
}
