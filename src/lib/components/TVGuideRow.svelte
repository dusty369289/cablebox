<script lang="ts">
	import type { Channel, GuideSlot } from '$lib/scheduling/types.js';

	type Props = {
		channel: Channel;
		slots: GuideSlot[];
		isActive: boolean;
		rangeStart: number;
		rangeDuration: number;
		now: number;
		onTune: (channel: Channel) => void;
	};

	let { channel, slots, isActive, rangeStart, rangeDuration, now, onTune }: Props = $props();

	function getSlotStyle(slot: GuideSlot): string {
		const left = ((slot.startTime - rangeStart) / rangeDuration) * 100;
		const width = ((slot.endTime - slot.startTime) / rangeDuration) * 100;
		return `left: ${left}%; width: ${width}%;`;
	}

	function isCurrentSlot(slot: GuideSlot): boolean {
		return now >= slot.startTime && now < slot.endTime;
	}

	let currentSlot = $derived(slots.find((s) => isCurrentSlot(s)));
</script>

<button class="guide-row" class:active={isActive} onclick={() => onTune(channel)}>
	<div class="channel-label">
		<span class="channel-num">{channel.number}</span>
		<span class="channel-name">{channel.name}</span>
	</div>
	<div class="program-track">
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
	<div class="mobile-now-playing">
		{currentSlot?.video.title ?? ''}
	</div>
</button>

<style>
	.guide-row {
		display: flex;
		height: 40px;
		border: none;
		border-bottom: 1px solid #1a3a1a;
		background: transparent;
		width: 100%;
		cursor: pointer;
		padding: 0;
	}

	.guide-row:hover {
		background: rgba(51, 170, 51, 0.08);
	}

	.guide-row.active {
		background: rgba(51, 170, 51, 0.25);
		border-left: 3px solid #3a3;
	}

	.guide-row.active .channel-label {
		background: #0f2a0f;
		color: #fff;
	}

	.guide-row.active .channel-num {
		color: #5c5;
	}

	.guide-row.active .program-block {
		background: #153515;
		border-color: #2a5a2a;
		color: #ccc;
	}

	.guide-row.active .program-block.now-playing {
		background: #1a5a1a;
		border-color: #4c4;
		color: #fff;
	}

	.channel-label {
		flex-shrink: 0;
		width: 160px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
		background: #0a1a0a;
		border-right: 2px solid #1a3a1a;
		color: #ccc;
		font-family: monospace;
		font-size: 0.8rem;
		text-align: left;
	}

	.channel-num {
		color: #3a3;
		font-weight: bold;
		min-width: 24px;
	}

	.channel-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.program-track {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.program-block {
		position: absolute;
		top: 2px;
		bottom: 2px;
		background: #0d2a0d;
		border: 1px solid #1a3a1a;
		border-radius: 2px;
		color: #aaa;
		font-family: monospace;
		font-size: 0.7rem;
		padding: 0 6px;
		cursor: pointer;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: flex;
		align-items: center;
	}

	.program-block:hover {
		background: #1a3a1a;
		color: #fff;
	}

	.program-block.now-playing {
		background: #1a4a1a;
		border-color: #3a3;
		color: #fff;
	}

	.program-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mobile-now-playing {
		display: none;
	}

	/* Mobile: show channel name + now playing text, hide timeline */
	@media (max-width: 640px) {
		.guide-row {
			height: 52px;
		}

		.channel-label {
			width: 100px;
			font-size: 0.75rem;
		}

		.program-track {
			display: none;
		}

		.mobile-now-playing {
			display: flex;
			align-items: center;
			flex: 1;
			padding: 0 10px;
			color: #aaa;
			font-family: monospace;
			font-size: 0.75rem;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}
</style>
