<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import TVPlayer from '$lib/components/TVPlayer.svelte';
	import TVGuide from '$lib/components/TVGuide.svelte';
	import ChannelBanner from '$lib/components/ChannelBanner.svelte';
	import VolumeControl from '$lib/components/VolumeControl.svelte';
	import CRTOverlay from '$lib/components/CRTOverlay.svelte';
	import StaticTransition from '$lib/components/StaticTransition.svelte';
	import ImportModal from '$lib/components/ImportModal.svelte';
	import ChannelManager from '$lib/components/ChannelManager.svelte';
	import { loadDefaultChannels } from '$lib/data/loader.js';
	import { getUserChannels } from '$lib/data/channel-store.js';
	import { getScheduleAt } from '$lib/scheduling/scheduler.js';
	import {
		setChannels,
		getCurrentChannel,
		getCurrentIndex,
		channelUp,
		channelDown,
		switchToChannel,
		switchToChannelByNumber,
		getChannels
	} from '$lib/stores/channels.svelte.js';
	import { startClock, stopClock, getCurrentTime } from '$lib/stores/clock.svelte.js';
	import {
		isMuted,
		toggleMuted,
		isCrtEnabled,
		toggleCrt,
		getTheme,
		cycleTheme,
		getHiddenDefaults,
		THEMES
	} from '$lib/stores/settings.svelte.js';
	import type { Channel, ScheduleResult } from '$lib/scheduling/types.js';

	let loaded = $state(false);
	let loadError = $state('');
	let started = $state(false);
	let schedule = $state<ScheduleResult | null>(null);
	let showGuide = $state(false);
	let showImport = $state(false);
	let showManager = $state(false);
	let showStatic = $state(false);
	let allChannelsUnfiltered = $state<Channel[]>([]);
	let tickInterval: ReturnType<typeof setInterval> | null = null;
	let tvPlayer: TVPlayer | undefined = $state();

	// Number input buffer for direct channel entry
	let numberBuffer = '';
	let numberTimeout: ReturnType<typeof setTimeout> | null = null;

	async function loadAllChannels() {
		const defaults = await loadDefaultChannels();
		let userChannels: Channel[] = [];
		try {
			userChannels = await getUserChannels();
		} catch (err) {
			console.warn('Failed to load user channels:', err);
		}

		const maxDefault = Math.max(0, ...defaults.map((c) => c.number));
		userChannels.forEach((ch, i) => {
			if (ch.number === 0) ch.number = maxDefault + 1 + i;
		});

		allChannelsUnfiltered = [...defaults, ...userChannels];
		applyChannelFilters();
	}

	function applyChannelFilters() {
		const hidden = new Set(getHiddenDefaults());
		const visible = allChannelsUnfiltered.filter((ch) => !hidden.has(ch.slug));
		setChannels(visible);
	}

	onMount(async () => {
		try {
			const timeout = new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('Channel load timed out')), 10000)
			);
			await Promise.race([loadAllChannels(), timeout]);
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Failed to load channels';
			console.error('Channel load failed:', err);
		}
		startClock();
		loaded = true;
		updateSchedule();
	});

	function start() {
		started = true;
		tickInterval = setInterval(updateSchedule, 1000);
	}

	onDestroy(() => {
		stopClock();
		if (tickInterval) clearInterval(tickInterval);
	});

	function updateSchedule() {
		const channel = getCurrentChannel();
		if (!channel) return;
		const now = getCurrentTime();
		schedule = getScheduleAt(channel, now);
	}

	function triggerStatic() {
		showStatic = true;
		setTimeout(() => { showStatic = false; }, 400);
	}

	function handleVideoEnd() {
		updateSchedule();
	}

	function handleTune(channel: Channel) {
		const channels = getChannels();
		const idx = channels.findIndex((ch) => ch.slug === channel.slug);
		if (idx >= 0 && idx !== getCurrentIndex()) {
			triggerStatic();
			switchToChannel(idx);
			updateSchedule();
		}
	}

	async function handleImport(channels: Channel[]) {
		showImport = false;
		await loadAllChannels();
		updateSchedule();
	}

	async function handleManagerChanged() {
		await loadAllChannels();
		updateSchedule();
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			document.documentElement.requestFullscreen();
		}
	}

	function handleVolumeChange(vol: number) {
		tvPlayer?.setVolume(vol);
	}

	function handleMuteToggle(muted: boolean) {
		if (muted) {
			tvPlayer?.mute();
		} else {
			tvPlayer?.unmute();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		switch (event.key) {
			case 'ArrowUp':
			case '+':
				event.preventDefault();
				triggerStatic();
				channelUp();
				updateSchedule();
				break;
			case 'ArrowDown':
			case '-':
				event.preventDefault();
				triggerStatic();
				channelDown();
				updateSchedule();
				break;
			case 'f':
			case 'F':
				event.preventDefault();
				toggleFullscreen();
				break;
			case 'g':
			case 'G':
				event.preventDefault();
				showGuide = !showGuide;
				break;
			case 'i':
			case 'I':
				event.preventDefault();
				showImport = !showImport;
				break;
			case 'e':
			case 'E':
				event.preventDefault();
				showManager = !showManager;
				break;
			case 'c':
			case 'C':
				event.preventDefault();
				toggleCrt();
				break;
			case 't':
			case 'T':
				event.preventDefault();
				cycleTheme();
				break;
			case 'm':
			case 'M':
				event.preventDefault();
				toggleMuted();
				if (isMuted()) {
					tvPlayer?.mute();
				} else {
					tvPlayer?.unmute();
				}
				break;
			case 'Escape':
				event.preventDefault();
				if (document.fullscreenElement) {
					document.exitFullscreen();
				} else if (showGuide) {
					showGuide = false;
				}
				break;
			default:
				if (event.key >= '0' && event.key <= '9') {
					event.preventDefault();
					numberBuffer += event.key;
					if (numberTimeout) clearTimeout(numberTimeout);
					numberTimeout = setTimeout(() => {
						const num = parseInt(numberBuffer, 10);
						triggerStatic();
						switchToChannelByNumber(num);
						updateSchedule();
						numberBuffer = '';
					}, 800);
				}
		}
	}

	let currentChannel = $derived(getCurrentChannel());
	let currentIndex = $derived(getCurrentIndex());
	let allChannels = $derived(getChannels());
	let now = $derived(getCurrentTime());
	let videoId = $derived(schedule?.video.id ?? '');
	let startSeconds = $derived(schedule?.offsetSeconds ?? 0);
	let videoTitle = $derived(schedule?.video.title ?? '');
	let crtEnabled = $derived(isCrtEnabled());
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>CableBox</title>
</svelte:head>

{#if !loaded}
	<div class="loading">
		<p>Loading channels...</p>
	</div>
{:else if loadError}
	<div class="loading">
		<p style="color: #f66;">{loadError}</p>
		<button class="retry-btn" onclick={() => location.reload()}>Retry</button>
	</div>
{:else if !started}
	<button class="splash" onclick={start}>
		<div class="splash-content">
			<div class="splash-title">CABLEBOX</div>
			<div class="splash-subtitle">Press anywhere to start</div>
			<div class="splash-hint">
				{#if currentChannel}
					{allChannels.length} channels ready
				{/if}
			</div>
		</div>
	</button>
{:else}
	<div class="tv-container">
		<TVPlayer
			bind:this={tvPlayer}
			{videoId}
			{startSeconds}
			onVideoEnd={handleVideoEnd}
		/>
		<ChannelBanner channel={currentChannel} {videoTitle} />

		<div class="top-bar">
			<div class="channel-indicator">
				{#if currentChannel}
					CH {currentChannel.number}
				{/if}
			</div>
		</div>

		<div class="controls-bar">
			<VolumeControl onVolumeChange={handleVolumeChange} onMuteToggle={handleMuteToggle} />

			<div class="control-buttons">
				<button class="ctrl-btn" onclick={toggleFullscreen} title="Fullscreen (F)">
					⛶
				</button>
				<button class="ctrl-btn" onclick={() => (showGuide = !showGuide)} title="Guide (G)">
					GUIDE
				</button>
				<button class="ctrl-btn" onclick={() => (showManager = !showManager)} title="Settings (E)">
					&#9881;
				</button>
			</div>
		</div>

		{#if showGuide}
			<button class="guide-dismiss" onclick={() => (showGuide = false)} aria-label="Close guide"></button>
		{/if}

		<StaticTransition active={showStatic} />
		<CRTOverlay enabled={crtEnabled} />

		{#if showManager}
			<ChannelManager
				channels={allChannelsUnfiltered}
				onChanged={handleManagerChanged}
				onClose={() => (showManager = false)}
			/>
		{/if}

		{#if showImport}
			<ImportModal
				onImport={handleImport}
				onClose={() => (showImport = false)}
				nextChannelNumber={allChannels.length > 0 ? Math.max(...allChannels.map(c => c.number)) + 1 : 1}
				existingChannels={allChannelsUnfiltered}
			/>
		{/if}

		{#if showGuide}
			<TVGuide
				channels={allChannels}
				currentChannelIndex={currentIndex}
				{now}
				onTune={handleTune}
				onImport={() => (showImport = true)}
			/>
		{/if}
	</div>
{/if}

<style>
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
		background: var(--color-bg);
		overflow: hidden;
		font-family: var(--font-family);
		position: fixed;
		width: 100%;
		height: 100%;
		height: 100dvh;
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		height: 100dvh;
		color: var(--color-primary);
		font-family: var(--font-family);
		font-size: 1.5rem;
		background: var(--color-bg);
		gap: 16px;
	}

	.retry-btn {
		background: var(--color-surface); border: 1px solid var(--color-primary); color: var(--color-primary);
		padding: 8px 20px; border-radius: var(--border-radius); font-family: var(--font-family);
		font-size: 1rem; cursor: pointer;
	}
	.retry-btn:hover { background: var(--color-surface-hover); color: var(--color-primary-bright); }

	.splash {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100vw;
		height: 100vh;
		height: 100dvh;
		background: var(--color-bg);
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.splash-content {
		text-align: center;
		font-family: var(--font-family);
	}

	.splash-title {
		font-size: 3rem;
		font-weight: bold;
		color: var(--color-primary);
		letter-spacing: 0.2em;
		margin-bottom: 20px;
		text-shadow: var(--text-glow);
	}

	.splash-subtitle {
		font-size: 1.2rem;
		color: var(--color-text-dim);
		animation: blink 1.5s step-end infinite;
	}

	.splash-hint {
		font-size: 0.8rem;
		color: var(--color-text-dim);
		margin-top: 16px;
	}

	@keyframes blink {
		50% { opacity: 0; }
	}

	.tv-container {
		position: relative;
		width: 100vw;
		height: 100vh;
		height: 100dvh;
	}

	.top-bar {
		position: absolute;
		top: 20px;
		right: 20px;
		display: flex;
		gap: 12px;
		align-items: center;
		z-index: 10;
	}

	.channel-indicator {
		font-family: var(--font-family);
		font-size: 1.2rem;
		color: var(--color-primary);
		background: var(--color-overlay-bg);
		padding: 4px 12px;
		border-radius: var(--border-radius);
		text-shadow: var(--text-glow);
	}

	.guide-dismiss {
		position: absolute;
		inset: 0;
		z-index: 29;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
	}

	.controls-bar {
		position: absolute;
		bottom: calc(20px + env(safe-area-inset-bottom, 0px));
		right: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		background: var(--color-controls-bg);
		border: 1px solid var(--color-controls-border);
		border-radius: var(--border-radius);
		padding: 6px 14px;
		z-index: 25;
	}

	.control-buttons {
		display: flex;
		gap: 4px;
	}

	.ctrl-btn {
		background: none;
		border: 1px solid transparent;
		color: var(--color-primary);
		font-family: var(--font-family);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: var(--border-radius);
		line-height: 1;
	}

	.ctrl-btn:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-primary);
	}


	/* Mobile responsive */
	@media (max-width: 640px) {
		.top-bar {
			top: 10px;
			right: 10px;
		}

		.channel-indicator {
			font-size: 1rem;
			padding: 2px 8px;
		}

		.controls-bar {
			bottom: calc(10px + env(safe-area-inset-bottom, 0px));
			left: 10px;
			right: 10px;
			justify-content: space-between;
			padding: 8px 12px;
		}

		.ctrl-btn {
			font-size: 1.3rem;
			padding: 8px 12px;
			min-width: 44px;
			min-height: 44px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}
</style>
