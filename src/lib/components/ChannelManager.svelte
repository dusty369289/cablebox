<script lang="ts">
	import { isLocalChannel, type Channel } from '$lib/scheduling/types.js';

	const version: string = __COMMIT_HASH__;
	import { deleteUserChannel, saveUserChannel } from '$lib/data/channel-store.js';
	import { deleteVideoBlobsByIds } from '$lib/data/video-blob-store.js';
	import { validateAndParse } from '$lib/bookmarklet/importer.js';
	import {
		isDefaultHidden, toggleDefaultChannel,
		isCrtEnabled, toggleCrt,
		getTheme, setTheme, THEMES, type Theme
	} from '$lib/stores/settings.svelte.js';

	type Props = {
		channels: Channel[];
		onChanged: () => void;
		onClose: () => void;
	};

	let { channels, onChanged, onClose }: Props = $props();

	let activeTab = $state<'channels' | 'appearance' | 'about'>('channels');
	let confirmDelete = $state<string | null>(null);
	let editingSlug = $state<string | null>(null);
	let editJson = $state('');
	let editError = $state('');

	function isDefault(ch: Channel): boolean {
		return ch.sources.some((s) => s.type === 'default');
	}

	function handleToggleDefault(slug: string) {
		toggleDefaultChannel(slug);
		onChanged();
	}

	async function handleDelete(slug: string) {
		// Clean up local video blobs if this is a local channel
		const ch = channels.find((c) => c.slug === slug);
		if (ch && isLocalChannel(ch)) {
			const videoIds = ch.sources.flatMap((s) => s.videos.map((v) => v.id));
			await deleteVideoBlobsByIds(videoIds);
		}
		await deleteUserChannel(slug);
		confirmDelete = null;
		onChanged();
	}

	function startEdit(ch: Channel) {
		editingSlug = ch.slug;
		editError = '';
		// Wrap in array to match import format
		editJson = JSON.stringify([ch], null, 2);
	}

	function cancelEdit() {
		editingSlug = null;
		editJson = '';
		editError = '';
	}

	async function saveEdit() {
		editError = '';
		const result = validateAndParse(editJson);
		if (!result.ok) {
			editError = result.error;
			return;
		}
		if (result.channels.length !== 1) {
			editError = 'JSON must contain exactly one channel';
			return;
		}

		const updated = result.channels[0];
		// Delete old slug if it changed
		if (editingSlug && editingSlug !== updated.slug) {
			await deleteUserChannel(editingSlug);
		}
		// Preserve channel number from original
		const original = channels.find((ch) => ch.slug === editingSlug);
		if (original) updated.number = original.number;

		await saveUserChannel(JSON.parse(JSON.stringify(updated)));
		editingSlug = null;
		editJson = '';
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
	let crt = $derived(isCrtEnabled());
	let currentTheme = $derived(getTheme());
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" role="button" tabindex="-1" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<span class="modal-title">SETTINGS</span>
			<button class="modal-close" onclick={onClose}>&times;</button>
		</div>

		<div class="tabs">
			<button class="tab" class:active={activeTab === 'channels'} onclick={() => (activeTab = 'channels')}>
				Channels
			</button>
			<button class="tab" class:active={activeTab === 'appearance'} onclick={() => (activeTab = 'appearance')}>
				Appearance
			</button>
			<button class="tab" class:active={activeTab === 'about'} onclick={() => (activeTab = 'about')}>
				About
			</button>
		</div>

		<div class="modal-body">
			{#if activeTab === 'channels'}
				<!-- Channels Tab -->
				{#if defaultChannels.length > 0}
					<div class="section">
						<h3 class="section-title">Default Channels</h3>
						{#each defaultChannels as ch (ch.slug)}
							<div class="channel-row">
								<label class="toggle-row">
									<input
										type="checkbox"
										checked={!isDefaultHidden(ch.slug)}
										onchange={() => handleToggleDefault(ch.slug)}
									/>
									<span class="ch-num">{ch.number}</span>
									<span class="ch-name">{ch.name}</span>
									<span class="ch-meta">{videoCount(ch)} &middot; {formatDuration(ch)}</span>
								</label>
							</div>
						{/each}
					</div>
				{/if}

				<div class="section">
					<h3 class="section-title">Imported Channels</h3>
					{#if userChannels.length > 0}
						{#each userChannels as ch (ch.slug)}
							{#if editingSlug === ch.slug}
								<div class="edit-panel">
									<textarea class="edit-json" bind:value={editJson} rows="12"></textarea>
									{#if editError}
										<div class="edit-error">{editError}</div>
									{/if}
									<div class="edit-actions">
										<button class="btn-save" onclick={saveEdit}>Save</button>
										<button class="btn-cancel" onclick={cancelEdit}>Cancel</button>
									</div>
								</div>
							{:else}
								<div class="channel-row">
									<div class="channel-info">
										<span class="ch-num">{ch.number}</span>
										<span class="ch-name">{ch.name}</span>
										{#if isLocalChannel(ch)}
											<span class="ch-badge">LOCAL</span>
										{/if}
										<span class="ch-meta">{videoCount(ch)} &middot; {formatDuration(ch)}</span>
									</div>
									<div class="row-actions">
										<button class="btn-edit" onclick={() => startEdit(ch)} title="Edit JSON">
											&#9998;
										</button>
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
								</div>
							{/if}
						{/each}
					{:else}
						<div class="empty">No imported channels. Press <kbd>I</kbd> to import from YouTube.</div>
					{/if}
				</div>

			{:else if activeTab === 'appearance'}
				<!-- Appearance Tab -->
				<div class="section">
					<h3 class="section-title">Theme</h3>
					<div class="theme-grid">
						{#each THEMES as theme (theme.id)}
							<button
								class="theme-option"
								class:selected={currentTheme === theme.id}
								onclick={() => setTheme(theme.id)}
							>
								<span class="theme-preview" data-theme={theme.id}></span>
								<span class="theme-name">{theme.label}</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="section">
					<h3 class="section-title">Effects</h3>
					<label class="setting-row">
						<input type="checkbox" checked={crt} onchange={toggleCrt} />
						<div class="setting-info">
							<span class="setting-label">CRT Scan Lines</span>
							<span class="setting-desc">Retro TV scan line overlay and vignette effect</span>
						</div>
					</label>
				</div>

				<div class="section">
					<h3 class="section-title">Keyboard Shortcuts</h3>
					<div class="shortcuts">
						<div class="shortcut"><kbd>G</kbd> Guide</div>
						<div class="shortcut"><kbd>I</kbd> Import</div>
						<div class="shortcut"><kbd>E</kbd> Settings</div>
						<div class="shortcut"><kbd>F</kbd> Fullscreen</div>
						<div class="shortcut"><kbd>R</kbd> Random</div>
						<div class="shortcut"><kbd>M</kbd> Mute</div>
						<div class="shortcut"><kbd>C</kbd> CRT Toggle</div>
						<div class="shortcut"><kbd>T</kbd> Cycle Theme</div>
						<div class="shortcut"><kbd>Up/Down</kbd> Channel</div>
						<div class="shortcut"><kbd>0-9</kbd> Direct Tune</div>
					</div>
				</div>

				<div class="version">Build: {version}</div>
			{:else}
				<!-- About Tab -->
				<div class="about">
					<div class="about-title">CableBox</div>
					<p class="about-desc">
						A retro cable TV experience for YouTube. Deterministic scheduling,
						channel surfing, and a 90s EPG — all in the browser.
					</p>
					<div class="about-credits">
						<div class="about-label">Created by</div>
						<a href="https://3net.dev" target="_blank" rel="noopener" class="about-link">
							Ethan Wright
						</a>
					</div>
					<div class="about-credits">
						<div class="about-label">Source code</div>
						<a href="https://github.com/dusty369289/cablebox" target="_blank" rel="noopener" class="about-link">
							github.com/dusty369289/cablebox
						</a>
					</div>
					<div class="about-credits">
						<div class="about-label">License</div>
						<span class="about-text">Apache 2.0</span>
					</div>
					<div class="version">Build: {version}</div>
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
		width: 520px;
		max-width: 90vw;
		max-height: 80vh;
		max-height: 80dvh;
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
		padding: 10px 16px;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.modal-title { color: var(--color-primary); font-weight: bold; font-size: 14px; text-shadow: var(--text-glow); }

	.modal-close {
		background: none; border: none; color: var(--color-text-dim);
		font-size: 18px; cursor: pointer;
	}
	.modal-close:hover { color: var(--color-danger); }

	/* Tabs */
	.tabs {
		display: flex;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg);
	}

	.tab {
		flex: 1;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--color-text-dim);
		font-family: var(--font-family);
		font-size: 0.85rem;
		padding: 8px 12px;
		cursor: pointer;
	}
	.tab:hover { color: var(--color-text); background: var(--color-surface-hover); }
	.tab.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}

	.modal-body {
		padding: 12px 16px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-title {
		color: var(--color-primary);
		font-size: 0.85rem;
		margin: 0 0 8px;
		text-shadow: var(--text-glow);
	}

	/* Channel rows */
	.channel-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 5px 8px;
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
	.toggle-row input[type=checkbox] { accent-color: var(--color-primary); flex-shrink: 0; }

	.channel-info { display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; }
	.ch-num { color: var(--color-primary); font-weight: bold; min-width: 28px; font-size: 0.85rem; }
	.ch-name { font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ch-meta { color: var(--color-text-dim); font-size: 0.7rem; white-space: nowrap; margin-left: auto; }

	.btn-delete {
		background: none; border: 1px solid transparent; color: var(--color-text-dim);
		font-size: 1.2rem; cursor: pointer; padding: 2px 6px;
		border-radius: var(--border-radius-sm); line-height: 1; flex-shrink: 0;
	}
	.btn-delete:hover { color: var(--color-danger); border-color: var(--color-danger); }

	.confirm-bar { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
	.confirm-text { color: var(--color-danger); font-size: 0.8rem; font-weight: bold; }
	.btn-confirm, .btn-cancel {
		font-family: var(--font-family); font-size: 0.75rem; padding: 3px 10px;
		border-radius: var(--border-radius-sm); cursor: pointer; border: 1px solid;
	}
	.btn-confirm { background: var(--color-danger); border-color: var(--color-danger); color: #000; }
	.btn-confirm:hover { opacity: 0.8; }
	.btn-cancel { background: var(--color-surface); border-color: var(--color-border); color: var(--color-text); }
	.btn-cancel:hover { background: var(--color-surface-hover); }

	.empty { color: var(--color-text-dim); font-size: 0.85rem; text-align: center; padding: 16px 0; }

	/* Theme grid */
	.theme-grid {
		display: flex;
		gap: 8px;
	}

	.theme-option {
		flex: 1;
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-sm);
		padding: 10px 8px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		font-family: var(--font-family);
	}
	.theme-option:hover { border-color: var(--color-text-dim); }
	.theme-option.selected { border-color: var(--color-primary); }

	.theme-preview {
		width: 100%;
		height: 24px;
		border-radius: 2px;
	}
	.theme-preview[data-theme='cable-90s'] { background: linear-gradient(#000033, #000055); border: 1px solid #0000aa; }
	.theme-preview[data-theme='phosphor'] { background: linear-gradient(#000, #0a1a0a); border: 1px solid #1a3a1a; }
	.theme-preview[data-theme='material'] { background: linear-gradient(#141218, #1d1b20); border: 1px solid #49454f; }

	.theme-name { font-size: 0.75rem; color: var(--color-text); }
	.theme-option.selected .theme-name { color: var(--color-primary); }

	/* Settings rows */
	.setting-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 0;
		cursor: pointer;
	}
	.setting-row input[type=checkbox] { accent-color: var(--color-primary); flex-shrink: 0; }
	.setting-info { display: flex; flex-direction: column; }
	.setting-label { font-size: 0.85rem; }
	.setting-desc { font-size: 0.7rem; color: var(--color-text-dim); margin-top: 2px; }

	/* Shortcuts */
	.shortcuts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px 16px;
	}
	.shortcut { font-size: 0.8rem; color: var(--color-text-dim); }

	kbd {
		background: var(--color-surface-active);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 1px 6px;
		font-family: var(--font-family);
		font-size: 0.8em;
		color: var(--color-primary);
	}

	/* About tab */
	.about {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 12px 0;
	}

	.about-title {
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--color-primary);
		text-shadow: var(--text-glow);
	}

	.about-desc {
		color: var(--color-text-dim);
		font-size: 0.85rem;
		text-align: center;
		line-height: 1.5;
		max-width: 320px;
		margin: 0;
	}

	.about-credits {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.about-label {
		font-size: 0.7rem;
		color: var(--color-text-dim);
		text-transform: uppercase;
	}

	.about-link {
		color: var(--color-primary);
		text-decoration: none;
		font-size: 0.9rem;
	}
	.about-link:hover { text-decoration: underline; color: var(--color-primary-bright); }

	.about-text {
		color: var(--color-text);
		font-size: 0.9rem;
	}

	.ch-badge {
		font-size: 0.6rem;
		color: var(--color-primary);
		border: 1px solid var(--color-primary);
		padding: 0 4px;
		border-radius: 2px;
		text-transform: uppercase;
		opacity: 0.7;
	}

	.version {
		text-align: center;
		font-size: 0.7rem;
		color: var(--color-text-dim);
		padding: 8px 0 0;
		opacity: 0.6;
	}

	/* Edit & row actions */
	.row-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

	.btn-edit {
		background: none; border: 1px solid transparent; color: var(--color-text-dim);
		font-size: 1rem; cursor: pointer; padding: 2px 6px;
		border-radius: var(--border-radius-sm); line-height: 1;
	}
	.btn-edit:hover { color: var(--color-primary); border-color: var(--color-primary); }

	.edit-panel {
		padding: 8px;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-sm);
		background: var(--color-bg);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.edit-json {
		width: 100%;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		font-family: 'Courier New', monospace;
		font-size: 0.75rem;
		padding: 8px;
		border-radius: var(--border-radius-sm);
		resize: vertical;
		line-height: 1.4;
	}
	.edit-json:focus { border-color: var(--color-primary); outline: none; }

	.edit-error {
		color: var(--color-danger);
		font-size: 0.75rem;
		padding: 4px 8px;
		background: rgba(255, 0, 0, 0.1);
		border-radius: var(--border-radius-sm);
	}

	.edit-actions { display: flex; gap: 6px; }

	.btn-save {
		font-family: var(--font-family); font-size: 0.8rem; padding: 4px 14px;
		border-radius: var(--border-radius-sm); cursor: pointer;
		background: var(--color-primary); border: 1px solid var(--color-primary); color: #000;
	}
	.btn-save:hover { opacity: 0.85; }
</style>
