<script lang="ts">
	import { getVolume, setVolume, isMuted, toggleMuted } from '$lib/stores/settings.svelte.js';

	type Props = {
		onVolumeChange: (volume: number) => void;
		onMuteToggle: (muted: boolean) => void;
	};

	let { onVolumeChange, onMuteToggle }: Props = $props();

	let volume = $derived(getVolume());
	let muted = $derived(isMuted());

	function handleInput(e: Event) {
		const val = parseInt((e.target as HTMLInputElement).value, 10);
		setVolume(val);
		onVolumeChange(val);
	}

	function handleMute() {
		toggleMuted();
		onMuteToggle(isMuted());
	}
</script>

<div class="volume-control">
	<button class="mute-btn" onclick={handleMute} title={muted ? 'Unmute (M)' : 'Mute (M)'}>
		{#if muted || volume === 0}
			<span class="icon">&#128263;</span>
		{:else if volume < 50}
			<span class="icon">&#128264;</span>
		{:else}
			<span class="icon">&#128266;</span>
		{/if}
	</button>
	<input
		type="range"
		min="0"
		max="100"
		value={volume}
		oninput={handleInput}
		class="volume-slider"
		class:dimmed={muted}
		style="background: linear-gradient(to right, var(--color-primary) {volume}%, var(--color-border) {volume}%);"
	/>
</div>

<style>
	.volume-control {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mute-btn {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		padding: 2px;
		font-size: 1.2rem;
		line-height: 1;
	}

	.mute-btn:hover {
		color: var(--color-primary-bright);
	}

	.icon {
		display: inline-block;
		width: 20px;
		text-align: center;
	}

	.volume-slider {
		width: 80px;
		height: 4px;
		appearance: none;
		background: var(--color-border);
		border-radius: 2px;
		outline: none;
		cursor: pointer;
	}

	.volume-slider::-webkit-slider-thumb {
		appearance: none;
		width: 12px;
		height: 12px;
		background: var(--color-primary);
		border-radius: 50%;
		cursor: pointer;
	}

	.volume-slider.dimmed {
		opacity: 0.4;
	}
</style>
