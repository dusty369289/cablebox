<script lang="ts">
	import type { Channel } from '$lib/scheduling/types.js';
	import { deleteUserChannel } from '$lib/data/channel-store.js';
	import { isDefaultHidden, toggleDefaultChannel } from '$lib/stores/settings.svelte.js';

	type Props = {
		channels: Channel[];
		onChanged: () => void;
		onClose: () => void;
	};

	let { channels, onChanged, onClose }: Props = $props();

	let confirmDelete = $state<string | null>(null);

	function isDefault(ch: Channel): boolean {
		return ch.sources.some((s) => s.type === 'default');
	}

	function isHidden(ch: Channel): boolean {
		return isDefaultHidden(ch.slug);
	}

	function handleToggleDefault(slug: string) {
		toggleDefaultChannel(slug);
		onChanged();
	}

	async function handleDelete(slug: string) {
		await deleteUserChannel(slug);
		confirmDelete = null;
		onChanged();
	}

	function formatDuration(ch: Channel): string {
		const secs = ch.sources.reduce((sum, s) => sum + s.videos.reduce((vs, v) => vs + v.duration, 0), 0);
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
		return h > 0 ? `${h}h${m}m` : `${m}m`;
	}

	function videoCount(ch: Channel): number {
		return ch.sources.reduce((sum, s) => sum + s.videos.length, 0);
	}

	let defaultChannels = $derived(channels.filter(isDefault));
	let userChannels = $derived(channels.filter((ch) => !isDefault(ch)));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" role="button" tabindex="-1" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<span class="modal-title">CHANNEL MANAGER</span>
			<button class="modal-close" onclick={onClose}>&times;</button>
		</div>

		<div class="modal-body">
			{#if defaultChannels.length > 0}
				<div class="section">
					<h3 class="section-title">Default Channels</h3>
					<p class="section-desc">Toggle default channels on or off.</p>
					{#each defaultChannels as ch (ch.slug)}
						<div class="channel-row">
							<label class="toggle-row">
								<input
									type="checkbox"
									checked={!isHidden(ch)}
									onchange={() => handleToggleDefault(ch.slug)}
								/>
								<span class="ch-num">{ch.number}</span>
								<span class="ch-name">{ch.name}</span>
								<span class="ch-meta">{videoCount(ch)} videos &middot; {formatDuration(ch)}</span>
							</label>
						</div>
					{/each}
				</div>
			{/if}

			{#if userChannels.length > 0}
				<div class="section">
					<h3 class="section-title">Imported Channels</h3>
					{#each userChannels as ch (ch.slug)}
						<div class="channel-row">
							<div class="channel-info">
								<span class="ch-num">{ch.number}</span>
								<span class="ch-name">{ch.name}</span>
								<span class="ch-meta">{videoCount(ch)} videos &middot; {formatDuration(ch)}</span>
							</div>
							{#if confirmDelete === ch.slug}
								<div class="confirm-bar">
									<span class="confirm-text">Delete?</span>
									<button class="btn-confirm" onclick={() => handleDelete(ch.slug)}>Yes</button>
									<button class="btn-cancel" onclick={() => (confirmDelete = null)}>No</button>
								</div>
							{:else}
								<button class="btn-delete" onclick={() => (confirmDelete = ch.slug)} title="Delete channel">
									&times;
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty">
					No imported channels yet. Use the <strong>+</strong> button or press <kbd>I</kbd> to import.
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
		background: var(--color-surface);
		border: 2px solid var(--color-primary);
		border-radius: var(--border-radius);
		font-family: var(--font-family);
		color: var(--color-text);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.modal-title { color: var(--color-primary); font-weight: bold; font-size: 14px; text-shadow: var(--text-glow); }

	.modal-close {
		background: none; border: none; color: var(--color-text-dim);
		font-size: 18px; cursor: pointer;
	}
	.modal-close:hover { color: var(--color-danger); }

	.modal-body {
		padding: 12px 16px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-title {
		color: var(--color-primary);
		font-size: 0.9rem;
		margin: 0 0 4px;
		text-shadow: var(--text-glow);
	}

	.section-desc {
		color: var(--color-text-dim);
		font-size: 0.75rem;
		margin: 0 0 8px;
	}

	.channel-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 8px;
		border-bottom: 1px solid var(--color-border);
		gap: 8px;
	}
	.channel-row:last-child { border-bottom: none; }
	.channel-row:hover { background: var(--color-surface-hover); }

	.toggle-row {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		flex: 1;
	}

	.toggle-row input[type=checkbox] {
		accent-color: var(--color-primary);
		flex-shrink: 0;
	}

	.channel-info {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		overflow: hidden;
	}

	.ch-num {
		color: var(--color-primary);
		font-weight: bold;
		min-width: 28px;
		font-size: 0.85rem;
	}

	.ch-name {
		font-size: 0.85rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ch-meta {
		color: var(--color-text-dim);
		font-size: 0.7rem;
		white-space: nowrap;
		margin-left: auto;
	}

	.btn-delete {
		background: none;
		border: 1px solid transparent;
		color: var(--color-text-dim);
		font-size: 1.2rem;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: var(--border-radius-sm);
		line-height: 1;
		flex-shrink: 0;
	}
	.btn-delete:hover {
		color: var(--color-danger);
		border-color: var(--color-danger);
	}

	.confirm-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	.confirm-text {
		color: var(--color-danger);
		font-size: 0.8rem;
		font-weight: bold;
	}

	.btn-confirm, .btn-cancel {
		font-family: var(--font-family);
		font-size: 0.75rem;
		padding: 3px 10px;
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		border: 1px solid;
	}

	.btn-confirm {
		background: var(--color-danger);
		border-color: var(--color-danger);
		color: #000;
	}
	.btn-confirm:hover { opacity: 0.8; }

	.btn-cancel {
		background: var(--color-surface);
		border-color: var(--color-border);
		color: var(--color-text);
	}
	.btn-cancel:hover { background: var(--color-surface-hover); }

	.empty {
		color: var(--color-text-dim);
		font-size: 0.85rem;
		text-align: center;
		padding: 20px 0;
	}

	kbd {
		background: var(--color-surface-active);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 1px 6px;
		font-family: var(--font-family);
		font-size: 0.8em;
		color: var(--color-primary);
	}
</style>
