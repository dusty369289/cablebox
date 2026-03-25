/**
 * Import pipeline for local video files.
 * Extracts metadata, generates thumbnails, stores blobs in IndexedDB.
 */

import { hashString } from '$lib/scheduling/prng.js';
import type { Channel, Video } from '$lib/scheduling/types.js';
import { saveVideoBlob } from './video-blob-store.js';

/** Generate a deterministic ID for a local file. */
export function generateVideoId(file: File): string {
	const key = `${file.name}:${file.size}:${file.lastModified}`;
	return `local::${hashString(key)}`;
}

function slugify(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Extract duration and a thumbnail from a video file.
 * Creates a hidden <video> element, seeks to 10%, captures a canvas frame.
 */
export function extractVideoMetadata(file: File): Promise<{ duration: number; thumbnail: string }> {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video');
		video.preload = 'auto';
		video.muted = true;
		video.playsInline = true;
		video.style.display = 'none';
		document.body.appendChild(video);
		let resolved = false;

		const url = URL.createObjectURL(file);
		console.log(`[LocalImport] Loading metadata for: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
		video.src = url;

		const cleanup = () => {
			URL.revokeObjectURL(url);
			video.remove();
		};

		const finalize = (duration: number, thumbnail: string) => {
			if (resolved) return;
			resolved = true;
			cleanup();
			resolve({ duration, thumbnail });
		};

		video.onloadedmetadata = () => {
			console.log(`[LocalImport] Metadata loaded: ${file.name}, duration=${video.duration}`);
			const duration = Math.floor(video.duration);
			if (!duration || !isFinite(duration)) {
				console.warn(`[LocalImport] Invalid duration for ${file.name}: ${video.duration}`);
				if (!resolved) { resolved = true; cleanup(); reject(new Error(`No duration: ${file.name}`)); }
				return;
			}

			// Try to seek for thumbnail, but don't block on it
			try {
				video.currentTime = Math.min(duration * 0.1, 30);
			} catch {
				// Seek failed — resolve with duration only
				finalize(duration, '');
			}

			// If seek doesn't complete in 5s, resolve without thumbnail
			setTimeout(() => finalize(duration, ''), 5000);
		};

		video.onseeked = () => {
			const duration = Math.floor(video.duration);
			let thumbnail = '';
			try {
				const canvas = document.createElement('canvas');
				canvas.width = 320;
				canvas.height = 180;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
					thumbnail = canvas.toDataURL('image/jpeg', 0.7);
				}
			} catch {}
			finalize(duration, thumbnail);
		};

		video.onerror = (e) => {
			console.error(`[LocalImport] Error loading ${file.name}:`, video.error?.message || e);
			if (!resolved) { resolved = true; cleanup(); reject(new Error(`Could not load: ${file.name} (${video.error?.message || 'unknown error'})`)); }
		};

		// Generous timeout for large files
		setTimeout(() => {
			if (!resolved) { resolved = true; cleanup(); reject(new Error(`Timed out: ${file.name}`)); }
		}, 60000);
	});
}

export type ImportProgress = {
	current: number;
	total: number;
	filename: string;
};

/**
 * Import local video files as a CableBox channel.
 * Extracts metadata, stores blobs, returns a Channel object.
 */
export async function importLocalFiles(
	files: FileList,
	channelName: string,
	onProgress?: (progress: ImportProgress) => void
): Promise<Channel> {
	const videos: Video[] = [];

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		onProgress?.({ current: i + 1, total: files.length, filename: file.name });

		try {
			const id = generateVideoId(file);
			const { duration, thumbnail } = await extractVideoMetadata(file);

			// Store the blob
			await saveVideoBlob(id, file);

			// Clean up the title from filename
			const title = file.name
				.replace(/\.[^.]+$/, '')           // remove extension
				.replace(/[｜|]/g, '-')             // normalize unicode pipes
				.replace(/[_]+/g, ' ')              // underscores to spaces
				.replace(/\s*-\s*/g, ' - ')         // normalize dashes
				.replace(/\s{2,}/g, ' ')            // collapse multiple spaces
				.trim();

			videos.push({ id, title, duration, thumbnail });
		} catch (err) {
			console.error(`[LocalImport] FAILED ${file.name}:`, err);
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('QuotaExceededError') || msg.includes('quota')) {
				throw new Error(`Storage full — imported ${videos.length} of ${files.length} files before running out of space`);
			}
		}
	}

	if (videos.length === 0) {
		throw new Error('No valid video files could be imported. Check that the files are playable video formats (mp4, webm).');
	}

	return {
		name: channelName,
		slug: slugify(channelName),
		number: 0, // assigned by caller
		category: 'Local',
		sources: [{ type: 'local', videos }]
	};
}
