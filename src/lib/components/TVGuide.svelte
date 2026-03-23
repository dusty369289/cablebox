<script lang="ts">
	import TVGuideRow from './TVGuideRow.svelte';
	import { getScheduleRange } from '$lib/scheduling/scheduler.js';
	import type { Channel } from '$lib/scheduling/types.js';
	import { onMount } from 'svelte';

	type Props = {
		channels: Channel[];
		currentChannelIndex: number;
		now: number;
		onTune: (channel: Channel) => void;
		onImport: () => void;
	};

	let { channels, currentChannelIndex, now, onTune, onImport }: Props = $props();

	// Total visible window: 30min past + 6hrs future
	const LOOKBACK = 30 * 60;
	const LOOKAHEAD = 6 * 60 * 60;
	const RANGE_DURATION = LOOKBACK + LOOKAHEAD;

	// Each hour = 300px of horizontal space
	const PX_PER_SECOND = 300 / 3600;
	const TOTAL_WIDTH = Math.ceil(RANGE_DURATION * PX_PER_SECOND);
	const CHANNEL_COL_WIDTH = 140;

	let rangeStart = $derived(now - LOOKBACK);

	// Time markers every 30 minutes
	let timeMarkers = $derived.by(() => {
		const markers: { time: number; label: string; left: number }[] = [];
		const firstMarker = Math.ceil(rangeStart / 1800) * 1800;
		for (let t = firstMarker; t < rangeStart + RANGE_DURATION; t += 1800) {
			const date = new Date(t * 1000);
			const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			markers.push({ time: t, label, left: (t - rangeStart) * PX_PER_SECOND });
		}
		return markers;
	});

	let nowLeft = $derived((now - rangeStart) * PX_PER_SECOND);

	let channelSlots = $derived(
		channels.map((ch) => ({
			channel: ch,
			slots: getScheduleRange(ch, rangeStart, rangeStart + RANGE_DURATION)
		}))
	);

	let scrollContainer: HTMLDivElement | undefined = $state();

	// On mount, scroll to show "now" near the left
	onMount(() => {
		if (scrollContainer) {
			scrollContainer.scrollLeft = Math.max(0, nowLeft - 60);
		}
	});

	// Keep active channel row visible vertically
	$effect(() => {
		if (scrollContainer && currentChannelIndex >= 0) {
			const row = scrollContainer.querySelector('.guide-row.active');
			row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	});
</script>

<div class="tv-guide">
	<div class="guide-scroll" bind:this={scrollContainer}>
		<!-- Header row -->
		<div class="guide-header" style="width: {TOTAL_WIDTH + CHANNEL_COL_WIDTH}px;">
			<div class="header-label">
				<span class="header-title">GUIDE</span>
				<button class="header-btn" onclick={onImport} title="Import Channels (I)">+ Import</button>
			</div>
			<div class="time-axis" style="width: {TOTAL_WIDTH}px;">
				{#each timeMarkers as marker (marker.time)}
					<div class="time-marker" style="left: {marker.left}px;">
						{marker.label}
					</div>
				{/each}
				<div class="now-line" style="left: {nowLeft}px;"></div>
			</div>
		</div>

		<!-- Channel rows -->
		{#each channelSlots as { channel, slots }, i (channel.slug)}
			<TVGuideRow
				{channel}
				{slots}
				isActive={i === currentChannelIndex}
				{rangeStart}
				pxPerSecond={PX_PER_SECOND}
				totalWidth={TOTAL_WIDTH}
				channelColWidth={CHANNEL_COL_WIDTH}
				{now}
				{onTune}
			/>
		{/each}
	</div>
</div>

<style>
	.tv-guide {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		max-height: 50vh;
		max-height: 50dvh;
		background: var(--color-guide-bg);
		border-top: 2px solid var(--color-primary);
		font-family: var(--font-family);
		z-index: 30;
		display: flex;
		flex-direction: column;
		animation: slide-up 0.3s ease-out;
		border-radius: var(--border-radius) var(--border-radius) 0 0;
	}

	@keyframes slide-up {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	.guide-scroll {
		overflow: auto;
		flex: 1;
	}

	/* Scrollbar styling */
	.guide-scroll::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}
	.guide-scroll::-webkit-scrollbar-track {
		background: var(--color-surface);
	}
	.guide-scroll::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 4px;
	}

	.guide-header {
		display: flex;
		border-bottom: 2px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--color-guide-bg);
	}

	.header-label {
		flex-shrink: 0;
		height: 32px;
		padding: 0 6px;
		border-right: 2px solid var(--color-border);
		background: var(--color-surface);
		display: flex;
		align-items: center;
		gap: 4px;
		overflow: hidden;
		position: sticky;
		left: 0;
		z-index: 3;
	}

	.header-title {
		color: var(--color-primary);
		font-weight: bold;
		font-size: var(--guide-font-size);
		text-shadow: var(--text-glow);
		white-space: nowrap;
	}

	.header-btn {
		margin-left: auto;
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-primary);
		font-family: var(--font-family);
		font-size: var(--guide-font-size-sm);
		cursor: pointer;
		padding: 3px 8px;
		border-radius: var(--border-radius-sm);
		line-height: 1;
		white-space: nowrap;
	}
	.header-btn:hover {
		color: var(--color-primary-bright);
		border-color: var(--color-primary);
		background: var(--color-surface-hover);
	}

	.time-axis {
		position: relative;
		height: 32px;
		flex-shrink: 0;
	}

	.time-marker {
		position: absolute;
		top: 8px;
		color: var(--color-text-dim);
		font-size: var(--guide-font-size-sm);
		white-space: nowrap;
	}

	.now-line {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--color-now-line);
		z-index: 1;
	}

	@media (max-width: 640px) {
		.tv-guide {
			max-height: 70vh;
			max-height: 70dvh;
		}
	}
</style>
