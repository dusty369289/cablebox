<script lang="ts">
	import type { Channel, GuideSlot } from '$lib/scheduling/types.js';

	type Props = {
		channel: Channel;
		slots: GuideSlot[];
		isActive: boolean;
		rangeStart: number;
		pxPerSecond: number;
		totalWidth: number;
		channelColWidth: number;
		now: number;
		onTune: (channel: Channel) => void;
	};

	let { channel, slots, isActive, rangeStart, pxPerSecond, totalWidth, channelColWidth, now, onTune }: Props = $props();

	function getSlotStyle(slot: GuideSlot): string {
		const left = (slot.startTime - rangeStart) * pxPerSecond;
		const width = (slot.endTime - slot.startTime) * pxPerSecond;
		return `left: ${left + 1}px; width: ${width - 2}px;`;
	}

	function isCurrentSlot(slot: GuideSlot): boolean {
		return now >= slot.startTime && now < slot.endTime;
	}

	// Distinguish scroll/pan from tap on touch devices
	let touchStartX = 0;
	let touchStartY = 0;
	let touchMoved = false;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
		touchMoved = false;
	}

	function handleTouchMove(e: TouchEvent) {
		const dx = Math.abs(e.touches[0].clientX - touchStartX);
		const dy = Math.abs(e.touches[0].clientY - touchStartY);
		if (dx > 5 || dy > 5) {
			touchMoved = true;
		}
	}

	function handleClick() {
		if (!touchMoved) {
			onTune(channel);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div
	class="guide-row"
	class:active={isActive}
	style="width: {totalWidth + channelColWidth}px;"
	onclick={handleClick}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === 'Enter' && onTune(channel)}
>
	<div class="channel-label" style="width: {channelColWidth}px;">
		<span class="channel-num">{channel.number}</span>
		<span class="channel-name">{channel.name}</span>
	</div>
	<div class="program-track" style="width: {totalWidth}px;">
		{#each slots as slot (slot.startTime)}
			<div
				class="program-block"
				class:now-playing={isCurrentSlot(slot)}
				style={getSlotStyle(slot)}
				title={slot.video.title}
			>
				<span class="program-title">{slot.video.title}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.guide-row {
		display: flex;
		height: var(--guide-row-height);
		border-bottom: 1px solid var(--color-border);
		background: transparent;
		cursor: pointer;
		padding: 0;
		font-family: var(--font-family);
	}

	.guide-row:hover {
		background: var(--color-surface-hover);
	}

	.guide-row.active {
		background: var(--color-guide-active-row);
	}

	.guide-row.active .channel-label {
		background: var(--color-surface-active);
		color: var(--color-text-bright);
		border-left: 3px solid var(--color-primary);
	}

	.guide-row.active .channel-num {
		color: var(--color-primary-bright);
	}

	.guide-row.active .program-block {
		background: var(--color-guide-active-program);
		border-color: var(--color-guide-active-border);
		color: var(--color-text);
	}

	.guide-row.active .program-block.now-playing {
		background: var(--color-guide-now);
		border-color: var(--color-guide-now-border);
		color: var(--color-text-bright);
	}

	.channel-label {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
		background: var(--color-surface);
		border-right: 2px solid var(--color-border);
		color: var(--color-text);
		font-size: var(--guide-font-size);
		text-align: left;
		position: sticky;
		left: 0;
		z-index: 1;
	}

	.channel-num {
		color: var(--color-primary);
		font-weight: bold;
		min-width: 24px;
		text-shadow: var(--text-glow);
	}

	.channel-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.program-track {
		position: relative;
		flex-shrink: 0;
	}

	.program-block {
		position: absolute;
		top: 2px;
		bottom: 2px;
		background: var(--color-guide-program);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-sm);
		color: var(--color-text-dim);
		font-size: var(--guide-font-size-sm);
		padding: 0 6px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: flex;
		align-items: center;
	}

	.program-block:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-bright);
	}

	.program-block.now-playing {
		background: var(--color-guide-now);
		border-color: var(--color-guide-now-border);
		color: var(--color-text-bright);
		text-shadow: var(--text-glow);
	}

	.program-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
