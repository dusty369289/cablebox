<script lang="ts">
	import TVGuideRow from './TVGuideRow.svelte';
	import { getScheduleRange } from '$lib/scheduling/scheduler.js';
	import type { Channel } from '$lib/scheduling/types.js';

	type Props = {
		channels: Channel[];
		currentChannelIndex: number;
		now: number;
		onTune: (channel: Channel) => void;
		onImport: () => void;
	};

	let { channels, currentChannelIndex, now, onTune, onImport }: Props = $props();

	// Guide shows a 2-hour window centered around now (30min past, 90min future)
	const LOOKBACK = 30 * 60; // 30 minutes
	const LOOKAHEAD = 90 * 60; // 90 minutes
	const RANGE_DURATION = LOOKBACK + LOOKAHEAD;

	let rangeStart = $derived(now - LOOKBACK);

	// Generate time markers every 30 minutes
	let timeMarkers = $derived.by(() => {
		const markers: { time: number; label: string }[] = [];
		// Round start to nearest 30-min boundary
		const firstMarker = Math.ceil(rangeStart / 1800) * 1800;
		for (let t = firstMarker; t < rangeStart + RANGE_DURATION; t += 1800) {
			const date = new Date(t * 1000);
			const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			markers.push({ time: t, label });
		}
		return markers;
	});

	// Current time indicator position as percentage
	let nowPosition = $derived(((now - rangeStart) / RANGE_DURATION) * 100);

	// Compute schedule slots for each channel
	let channelSlots = $derived(
		channels.map((ch) => ({
			channel: ch,
			slots: getScheduleRange(ch, rangeStart, rangeStart + RANGE_DURATION)
		}))
	);

	let guideEl: HTMLDivElement | undefined = $state();

	// Auto-scroll to keep active channel visible
	$effect(() => {
		if (guideEl && currentChannelIndex >= 0) {
			const row = guideEl.querySelector('.guide-row.active');
			row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	});
</script>

<div class="tv-guide">
	<div class="guide-header">
		<div class="header-label">
			<span class="header-title">GUIDE</span>
			<button class="header-btn" onclick={onImport} title="Import Channels (I)">+ Import</button>
		</div>
		<div class="time-axis">
			{#each timeMarkers as marker (marker.time)}
				<div
					class="time-marker"
					style="left: {((marker.time - rangeStart) / RANGE_DURATION) * 100}%"
				>
					{marker.label}
				</div>
			{/each}
			<div class="now-line" style="left: {nowPosition}%"></div>
		</div>
	</div>

	<div class="guide-body" bind:this={guideEl}>
		{#each channelSlots as { channel, slots }, i (channel.slug)}
			<TVGuideRow
				{channel}
				{slots}
				isActive={i === currentChannelIndex}
				{rangeStart}
				rangeDuration={RANGE_DURATION}
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
		background: var(--color-guide-bg);
		border-top: 2px solid var(--color-primary);
		font-family: var(--font-family);
		z-index: 20;
		display: flex;
		flex-direction: column;
		animation: slide-up 0.3s ease-out;
		border-radius: var(--border-radius) var(--border-radius) 0 0;
	}

	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.guide-header {
		display: flex;
		border-bottom: 2px solid var(--color-border);
		flex-shrink: 0;
	}

	.header-label {
		flex-shrink: 0;
		width: 160px;
		height: 32px;
		padding: 0 6px;
		border-right: 2px solid var(--color-border);
		background: var(--color-surface);
		display: flex;
		align-items: center;
		gap: 4px;
		overflow: hidden;
	}

	.header-title {
		color: var(--color-primary);
		font-weight: bold;
		font-size: 0.8rem;
		text-shadow: var(--text-glow);
		white-space: nowrap;
	}

	.header-btn {
		margin-left: auto;
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-primary);
		font-family: var(--font-family);
		font-size: 0.7rem;
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
		flex: 1;
		position: relative;
		height: 32px;
		overflow: hidden;
	}

	.time-marker {
		position: absolute;
		top: 8px;
		color: var(--color-text-dim);
		font-size: 0.7rem;
		transform: translateX(-50%);
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

	.guide-body {
		overflow-y: auto;
		flex: 1;
	}

	/* Scrollbar styling */
	.guide-body::-webkit-scrollbar {
		width: 8px;
	}

	.guide-body::-webkit-scrollbar-track {
		background: var(--color-surface);
	}

	.guide-body::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 4px;
	}

	/* Mobile: full-height overlay, hide time axis */
	@media (max-width: 640px) {
		.tv-guide {
			max-height: 70vh;
		}

		.header-label {
			width: 100%;
			border-right: none;
			justify-content: center;
		}

		.time-axis {
			display: none;
		}
	}
</style>
