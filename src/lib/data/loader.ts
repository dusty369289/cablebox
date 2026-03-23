import { base } from '$app/paths';
import type { Channel } from '$lib/scheduling/types.js';

/**
 * Load the default channel data from the static JSON file.
 */
export async function loadDefaultChannels(): Promise<Channel[]> {
	const response = await fetch(`${base}/data/channels.json`);
	if (!response.ok) {
		throw new Error(`Failed to load channels: ${response.status}`);
	}
	return response.json();
}
