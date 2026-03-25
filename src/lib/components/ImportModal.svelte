<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { validateAndParse } from '$lib/bookmarklet/importer.js';
	import { saveUserChannel, getUserChannels } from '$lib/data/channel-store.js';
	import { importLocalFiles, type ImportProgress } from '$lib/data/local-video-importer.js';
	import { getStorageEstimate } from '$lib/data/video-blob-store.js';
	import type { Channel } from '$lib/scheduling/types.js';

	type Props = {
		onImport: (channels: Channel[]) => void;
		onClose: () => void;
		nextChannelNumber: number;
		existingChannels: Channel[];
	};

	let { onImport, onClose, nextChannelNumber, existingChannels }: Props = $props();
	let bookmarkletHref = $state('');
	let mode = $state<'youtube' | 'local'>('youtube');

	onMount(async () => {
		try {
			const res = await fetch(`${base}/bookmarklet.js`);
			const code = await res.text();
			bookmarkletHref = `javascript:void(${encodeURIComponent(`(function(){${code}})()`)})`;
		} catch {}
		updateStorageInfo();
	});

	// YouTube import state
	let jsonInput = $state('');
	let error = $state('');
	let preview = $state<Channel[]>([]);
	let importing = $state(false);

	// Local file import state
	let localChannelName = $state('My Local Channel');
	let localFiles: FileList | null = $state(null);
	let localProgress = $state<ImportProgress | null>(null);
	let localImporting = $state(false);
	let localError = $state('');
	let storageInfo = $state('');

	async function updateStorageInfo() {
		const est = await getStorageEstimate();
		if (est) {
			const usedMB = (est.used / 1024 / 1024).toFixed(1);
			const quotaMB = (est.quota / 1024 / 1024).toFixed(0);
			storageInfo = `${usedMB} MB used of ${quotaMB} MB`;
		}
	}

	async function doLocalImport() {
		if (!localFiles || localFiles.length === 0) return;
		localImporting = true;
		localError = '';

		try {
			const channel = await importLocalFiles(localFiles, localChannelName, (p) => {
				localProgress = p;
			});

			// Assign channel number and deduplicate slug
			const existingSlugs = new Set(existingChannels.map((ch) => ch.slug));
			if (existingSlugs.has(channel.slug)) {
				let n = 2;
				while (existingSlugs.has(`${channel.slug}-${n}`)) n++;
				channel.name = `${channel.name} (${n})`;
				channel.slug = `${channel.slug}-${n}`;
			}
			channel.number = nextChannelNumber;

			await saveUserChannel(JSON.parse(JSON.stringify(channel)));
			await updateStorageInfo();
			onImport([channel]);
		} catch (err) {
			localError = `Import failed: ${err}`;
		} finally {
			localImporting = false;
			localProgress = null;
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	function makeUnique(name: string, slug: string, existingSlugs: Set<string>): { name: string; slug: string } {
		if (!existingSlugs.has(slug)) return { name, slug };
		let n = 2;
		while (existingSlugs.has(`${slug}-${n}`)) n++;
		return { name: `${name} (${n})`, slug: `${slug}-${n}` };
	}

	function handlePaste() {
		error = '';
		preview = [];

		if (!jsonInput.trim()) return;

		const result = validateAndParse(jsonInput);
		if (!result.ok) {
			error = result.error;
			return;
		}

		// Deduplicate against existing channels
		const existingSlugs = new Set(existingChannels.map((ch) => ch.slug));
		const usedSlugs = new Set(existingSlugs);

		result.channels.forEach((ch, i) => {
			const unique = makeUnique(ch.name, ch.slug, usedSlugs);
			ch.name = unique.name;
			ch.slug = unique.slug;
			usedSlugs.add(ch.slug);
			ch.number = nextChannelNumber + i;
		});

		preview = result.channels;
	}

	async function doImport() {
		if (preview.length === 0) return;
		importing = true;

		try {
			// Deep clone to strip Svelte $state proxies — IndexedDB can't clone proxies
			const plain = JSON.parse(JSON.stringify(preview));
			for (const ch of plain) {
				await saveUserChannel(ch);
			}
			onImport(plain);
		} catch (err) {
			error = `Import failed: ${err}`;
		} finally {
			importing = false;
		}
	}

	function totalVideos(channels: Channel[]): number {
		return channels.reduce((sum, ch) =>
			sum + ch.sources.reduce((s, src) => s + src.videos.length, 0), 0);
	}

	function totalDuration(channels: Channel[]): string {
		const secs = channels.reduce((sum, ch) =>
			sum + ch.sources.reduce((s, src) =>
				s + src.videos.reduce((vs, v) => vs + v.duration, 0), 0), 0);
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
		return `${h}h${m}m`;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" role="button" tabindex="-1" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<span class="modal-title">IMPORT CHANNELS</span>
			<button class="modal-close" onclick={onClose}>&times;</button>
		</div>

		<div class="import-tabs">
			<button class="import-tab" class:active={mode === 'youtube'} onclick={() => (mode = 'youtube')}>YouTube</button>
			<button class="import-tab" class:active={mode === 'local'} onclick={() => (mode = 'local')}>Local Files</button>
		</div>

		<div class="modal-body">
		{#if mode === 'youtube'}
			<div class="bookmarklet-box">
				<div class="bookmarklet-label">1. Drag this to your bookmarks bar:</div>
				{#if bookmarkletHref}
					<a class="bookmarklet-link" href={bookmarkletHref} onclick={(e) => e.preventDefault()}>
						CableBox
					</a>
				{:else}
					<span class="bookmarklet-loading">Loading bookmarklet...</span>
				{/if}
				<div class="bookmarklet-hint">
					Then visit any YouTube page and click it to scan videos.
					<br /><a href="{base}/guide" class="guide-link" target="_blank">Full step-by-step guide</a>
				</div>
			</div>

			<p class="instructions">
				2. Paste the exported JSON below:
			</p>

			<textarea
				class="json-input"
				bind:value={jsonInput}
				oninput={handlePaste}
				placeholder={'[{"name": "...", "slug": "...", ...}]'}
				rows="6"
			></textarea>

			{#if error}
				<div class="error">{error}</div>
			{/if}

			{#if preview.length > 0}
				<div class="preview">
					<div class="preview-header">
						Preview: {preview.length} channel(s), {totalVideos(preview)} videos, {totalDuration(preview)}
					</div>
					{#each preview as ch}
						<div class="preview-channel">
							<span class="preview-num">CH {ch.number}</span>
							<span class="preview-name">{ch.name}</span>
							<span class="preview-count">
								{ch.sources.reduce((s, src) => s + src.videos.length, 0)} videos
							</span>
						</div>
					{/each}
				</div>

				<button class="import-btn" onclick={doImport} disabled={importing}>
					{importing ? 'Importing...' : `Import ${preview.length} Channel(s)`}
				</button>
			{/if}

		{:else}
			<!-- Local Files Mode -->
			<div class="local-import">
				<div class="local-field">
					<label class="local-label">Channel name
					<input class="local-input" type="text" bind:value={localChannelName} placeholder="My Local Channel" />
					</label>
				</div>

				<div class="local-field">
					<label class="local-label">Video files
					<input class="local-file-input" type="file" accept="video/*" multiple
						onchange={(e) => { localFiles = (e.target as HTMLInputElement).files; }} />
					</label>
				</div>

				{#if localFiles && localFiles.length > 0}
					<div class="local-preview">
						{localFiles.length} file(s) selected
						({Array.from(localFiles).reduce((s, f) => s + f.size, 0) > 0
							? formatFileSize(Array.from(localFiles).reduce((s, f) => s + f.size, 0))
							: ''})
					</div>
				{/if}

				{#if localProgress}
					<div class="local-progress">
						<div class="local-progress-text">
							Processing {localProgress.current}/{localProgress.total}: {localProgress.filename}
						</div>
						<div class="local-progress-bar">
							<div class="local-progress-fill" style="width: {(localProgress.current / localProgress.total) * 100}%"></div>
						</div>
					</div>
				{/if}

				{#if localError}
					<div class="error">{localError}</div>
				{/if}

				<button class="import-btn" onclick={doLocalImport}
					disabled={localImporting || !localFiles || localFiles.length === 0}>
					{localImporting ? 'Importing...' : 'Import Local Files'}
				</button>

				{#if storageInfo}
					<div class="storage-info">{storageInfo}</div>
				{/if}
			</div>
		{/if}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		width: 500px;
		max-width: 90vw;
		max-height: 80vh;
		max-height: 80dvh;
		background: #111;
		border: 2px solid #3a3;
		border-radius: 8px;
		font-family: monospace;
		color: #ccc;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: #0a1a0a;
		border-bottom: 1px solid #333;
	}

	.modal-title { color: #3a3; font-weight: bold; font-size: 14px; }

	.modal-close {
		background: none; border: none; color: #666;
		font-size: 18px; cursor: pointer;
	}
	.modal-close:hover { color: #f33; }

	.modal-body {
		padding: 16px;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.import-tabs {
		display: flex;
		border-bottom: 1px solid #333;
	}
	.import-tab {
		flex: 1;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: #888;
		font-family: monospace;
		font-size: 0.85rem;
		padding: 8px 12px;
		cursor: pointer;
	}
	.import-tab:hover { color: #ccc; background: #1a1a1a; }
	.import-tab.active { color: #3a3; border-bottom-color: #3a3; }

	.instructions { font-size: 12px; color: #888; margin: 0; }

	.bookmarklet-box {
		background: #0a1a0a;
		border: 1px dashed #3a3;
		border-radius: 6px;
		padding: 14px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.bookmarklet-label { font-size: 12px; color: #888; }

	.bookmarklet-link {
		display: inline-block;
		background: #1a3a1a;
		border: 2px solid #3a3;
		color: #3a3;
		padding: 8px 20px;
		border-radius: 4px;
		font-family: monospace;
		font-size: 14px;
		font-weight: bold;
		text-decoration: none;
		cursor: grab;
	}
	.bookmarklet-link:hover { background: #2a4a2a; color: #5c5; }
	.bookmarklet-link:active { cursor: grabbing; }

	.bookmarklet-loading { font-size: 12px; color: #555; }

	.bookmarklet-hint { font-size: 11px; color: #555; line-height: 1.6; }

	.guide-link {
		color: var(--color-primary);
		text-decoration: none;
		font-weight: bold;
	}
	.guide-link:hover { text-decoration: underline; color: var(--color-primary-bright); }

	.json-input {
		width: 100%;
		box-sizing: border-box;
		background: #0a0a0a;
		border: 1px solid #333;
		color: #ccc;
		font-family: monospace;
		font-size: 11px;
		padding: 8px;
		border-radius: 4px;
		resize: vertical;
	}
	.json-input:focus { border-color: #3a3; outline: none; }

	.error {
		color: #f66;
		font-size: 12px;
		padding: 8px;
		background: rgba(255, 0, 0, 0.1);
		border-radius: 4px;
	}

	.preview {
		border: 1px solid #222;
		border-radius: 4px;
		overflow: hidden;
	}

	.preview-header {
		padding: 8px 12px;
		background: #0a1a0a;
		font-size: 12px;
		color: #3a3;
		font-weight: bold;
	}

	.preview-channel {
		padding: 6px 12px;
		font-size: 12px;
		border-top: 1px solid #1a1a1a;
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.preview-num { color: #3a3; font-weight: bold; min-width: 50px; }
	.preview-name { flex: 1; }
	.preview-count { color: #666; }

	.import-btn {
		background: #3a3;
		color: #000;
		border: none;
		padding: 10px;
		border-radius: 4px;
		font-family: monospace;
		font-size: 13px;
		font-weight: bold;
		cursor: pointer;
	}
	.import-btn:hover { background: #5c5; }
	.import-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	/* Local file import */
	.local-import {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.local-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.local-label {
		font-size: 0.8rem;
		color: #888;
	}
	.local-input {
		background: #0a0a0a;
		border: 1px solid #333;
		color: #ccc;
		font-family: monospace;
		font-size: 0.9rem;
		padding: 6px 8px;
		border-radius: 4px;
	}
	.local-input:focus { border-color: #3a3; outline: none; }
	.local-file-input {
		font-family: monospace;
		font-size: 0.8rem;
		color: #ccc;
	}
	.local-preview {
		font-size: 0.8rem;
		color: #888;
		padding: 6px 8px;
		background: #0a0a0a;
		border-radius: 4px;
	}
	.local-progress {
		padding: 6px 8px;
		background: #0a1a0a;
		border-radius: 4px;
	}
	.local-progress-text {
		font-size: 0.8rem;
		color: #3a3;
		margin-bottom: 6px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.local-progress-bar {
		height: 4px;
		background: #1a1a1a;
		border-radius: 2px;
		overflow: hidden;
	}
	.local-progress-fill {
		height: 100%;
		background: #3a3;
		transition: width 0.3s ease;
	}
	.storage-info {
		font-size: 0.7rem;
		color: #666;
		text-align: center;
	}
</style>
