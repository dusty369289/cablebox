/**
 * Validates and imports channel JSON pasted from the bookmarklet.
 */

import type { Channel, Video } from '$lib/scheduling/types.js';

type ImportedSource = {
	type: 'imported';
	videos: Array<{
		id: string;
		title: string;
		duration: number;
		thumbnail: string;
	}>;
};

type ImportedChannel = {
	name: string;
	slug: string;
	number: number;
	category: string;
	sources: ImportedSource[];
};

export type ImportResult =
	| { ok: true; channels: Channel[] }
	| { ok: false; error: string };

export function validateAndParse(json: string): ImportResult {
	let data: unknown;
	try {
		data = JSON.parse(json);
	} catch {
		return { ok: false, error: 'Invalid JSON — could not parse' };
	}

	if (!Array.isArray(data)) {
		return { ok: false, error: 'Expected a JSON array of channels' };
	}

	if (data.length === 0) {
		return { ok: false, error: 'No channels found in JSON' };
	}

	const channels: Channel[] = [];

	for (let i = 0; i < data.length; i++) {
		const ch = data[i] as Partial<ImportedChannel>;
		const label = `Channel ${i + 1}`;

		if (!ch.name || typeof ch.name !== 'string') {
			return { ok: false, error: `${label}: missing or invalid name` };
		}
		if (!ch.slug || typeof ch.slug !== 'string') {
			return { ok: false, error: `${label}: missing or invalid slug` };
		}
		if (!ch.sources || !Array.isArray(ch.sources) || ch.sources.length === 0) {
			return { ok: false, error: `${label}: missing sources array` };
		}

		const source = ch.sources[0];
		if (source.type !== 'imported' || !Array.isArray(source.videos)) {
			return { ok: false, error: `${label}: invalid source format` };
		}

		const validVideos: Video[] = [];
		for (const v of source.videos) {
			if (!v.id || typeof v.id !== 'string') continue;
			if (!v.title || typeof v.title !== 'string') continue;
			if (typeof v.duration !== 'number' || v.duration <= 0) continue;

			validVideos.push({
				id: v.id,
				title: v.title,
				duration: v.duration,
				thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`
			});
		}

		if (validVideos.length === 0) {
			return { ok: false, error: `${label} ("${ch.name}"): no valid videos found` };
		}

		channels.push({
			name: ch.name,
			slug: ch.slug,
			number: ch.number || 0,
			category: ch.category || 'Imported',
			sources: [{ type: 'imported', videos: validVideos }]
		});
	}

	return { ok: true, channels };
}
