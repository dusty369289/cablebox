<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import TVPlayer from '$lib/components/TVPlayer.svelte';
	import TVGuide from '$lib/components/TVGuide.svelte';
	import ChannelBanner from '$lib/components/ChannelBanner.svelte';
	import VolumeControl from '$lib/components/VolumeControl.svelte';
	import { loadDefaultChannels } from '$lib/data/loader.js';
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
		getVolume,
		isMuted,
		toggleMuted,
		setVolume
	} from '$lib/stores/settings.svelte.js';
	import type { Channel, ScheduleResult } from '$lib/scheduling/types.js';

	let loaded = $state(false);
	let schedule = $state<ScheduleResult | null>(null);
	let showGuide = $state(false);
	let paused = $state(false);
	let tickInterval: ReturnType<typeof setInterval> | null = null;
	let tvPlayer: TVPlayer | undefined = $state();

	// Number input buffer for direct channel entry
	let numberBuffer = '';
	let numberTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(async () => {
		const channels = await loadDefaultChannels();
		setChannels(channels);
		startClock();
		loaded = true;

		tickInterval = setInterval(updateSchedule, 1000);
		updateSchedule();
	});

	onDestroy(() => {
		stopClock();
		if (tickInterval) clearInterval(tickInterval);
	});

	function updateSchedule() {
		if (paused) return; // Don't update while paused
		const channel = getCurrentChannel();
		if (!channel) return;
		const now = getCurrentTime();
		schedule = getScheduleAt(channel, now);
	}

	function handleVideoEnd() {
		paused = false;
		updateSchedule();
	}

	function handleTune(channel: Channel) {
		const channels = getChannels();
		const idx = channels.findIndex((ch) => ch.slug === channel.slug);
		if (idx >= 0) {
			paused = false;
			switchToChannel(idx);
			updateSchedule();
		}
	}

	function togglePause() {
		if (paused) {
			// Resume: snap back to live schedule
			paused = false;
			tvPlayer?.play();
			updateSchedule();
		} else {
			paused = true;
			tvPlayer?.pause();
		}
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
				channelUp();
				paused = false;
				updateSchedule();
				break;
			case 'ArrowDown':
			case '-':
				event.preventDefault();
				channelDown();
				paused = false;
				updateSchedule();
				break;
			case ' ':
				event.preventDefault();
				togglePause();
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
						switchToChannelByNumber(num);
						paused = false;
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
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Channel Surfer</title>
</svelte:head>

{#if !loaded}
	<div class="loading">
		<p>Loading channels...</p>
	</div>
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
			{#if paused}
				<div class="pause-indicator">PAUSED</div>
			{/if}
		</div>

		<div class="controls-bar">
			<VolumeControl onVolumeChange={handleVolumeChange} onMuteToggle={handleMuteToggle} />

			<div class="control-buttons">
				<button class="ctrl-btn" onclick={togglePause} title="Pause/Play (Space)">
					{paused ? '▶' : '⏸'}
				</button>
				<button class="ctrl-btn" onclick={toggleFullscreen} title="Fullscreen (F)">
					⛶
				</button>
				<button class="ctrl-btn" onclick={() => (showGuide = !showGuide)} title="Guide (G)">
					☰
				</button>
			</div>
		</div>

		{#if showGuide}
			<TVGuide
				channels={allChannels}
				currentChannelIndex={currentIndex}
				{now}
				onTune={handleTune}
			/>
		{/if}
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #000;
		overflow: hidden;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		color: #3a3;
		font-family: monospace;
		font-size: 1.5rem;
		background: #000;
	}

	.tv-container {
		position: relative;
		width: 100vw;
		height: 100vh;
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
		font-family: monospace;
		font-size: 1.2rem;
		color: #3a3;
		background: rgba(0, 0, 0, 0.6);
		padding: 4px 12px;
	}

	.pause-indicator {
		font-family: monospace;
		font-size: 1rem;
		color: #f33;
		background: rgba(0, 0, 0, 0.6);
		padding: 4px 12px;
		animation: blink 1s step-end infinite;
	}

	@keyframes blink {
		50% { opacity: 0; }
	}

	.controls-bar {
		position: absolute;
		bottom: 20px;
		right: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid #1a3a1a;
		border-radius: 6px;
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
		color: #3a3;
		font-size: 1.1rem;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		line-height: 1;
	}

	.ctrl-btn:hover {
		background: rgba(51, 170, 51, 0.2);
		border-color: #3a3;
	}
</style>
