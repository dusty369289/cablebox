<script lang="ts">
	import { validateAndParse } from '$lib/bookmarklet/importer.js';
	import { saveUserChannel } from '$lib/data/channel-store.js';
	import type { Channel } from '$lib/scheduling/types.js';

	type Props = {
		onImport: (channels: Channel[]) => void;
		onClose: () => void;
		nextChannelNumber: number;
	};

	let { onImport, onClose, nextChannelNumber }: Props = $props();

	let jsonInput = $state('');
	let error = $state('');
	let preview = $state<Channel[]>([]);
	let importing = $state(false);

	function handlePaste() {
		error = '';
		preview = [];

		if (!jsonInput.trim()) return;

		const result = validateAndParse(jsonInput);
		if (!result.ok) {
			error = result.error;
			return;
		}

		// Assign channel numbers
		result.channels.forEach((ch, i) => {
			ch.number = nextChannelNumber + i;
		});

		preview = result.channels;
	}

	async function doImport() {
		if (preview.length === 0) return;
		importing = true;

		try {
			for (const ch of preview) {
				await saveUserChannel(ch);
			}
			onImport(preview);
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

		<div class="modal-body">
			<p class="instructions">
				Paste the JSON from the Channel Surfer bookmarklet below.
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
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.instructions { font-size: 12px; color: #888; margin: 0; }

	.json-input {
		width: 100%;
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
</style>
