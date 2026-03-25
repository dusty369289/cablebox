<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getVideoBlob } from '$lib/data/video-blob-store.js';
	import { getVolume, isMuted as getIsMuted } from '$lib/stores/settings.svelte.js';

	type Props = {
		videoId: string;
		startSeconds: number;
		onVideoEnd?: () => void;
	};

	let { videoId, startSeconds, onVideoEnd }: Props = $props();

	let videoEl: HTMLVideoElement | undefined = $state();
	let currentVideoId = '';
	let currentBlobUrl = '';
	let errorMessage = $state('');
	let settingsApplied = false;
	let consecutiveErrors = 0;
	const MAX_CONSECUTIVE_ERRORS = 3;

	onMount(() => {
		consecutiveErrors = 0;
		if (videoId) {
			loadVideo(videoId, startSeconds);
		}
	});

	onDestroy(() => {
		if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
	});

	async function loadVideo(id: string, offset: number) {
		if (!videoEl || !id) return;
		if (id === currentVideoId) return;

		currentVideoId = id;
		errorMessage = '';

		// Revoke previous blob URL
		if (currentBlobUrl) {
			URL.revokeObjectURL(currentBlobUrl);
			currentBlobUrl = '';
		}

		try {
			const blob = await getVideoBlob(id);
			if (!blob) {
				consecutiveErrors++;
				if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
					errorMessage = 'Local video files are missing from storage. Re-import this channel to restore.';
					return; // Stop cycling — don't call onVideoEnd
				}
				errorMessage = 'Video file not found — skipping...';
				setTimeout(() => onVideoEnd?.(), 1500);
				return;
			}

			consecutiveErrors = 0; // Reset on success

			currentBlobUrl = URL.createObjectURL(blob);
			videoEl.src = currentBlobUrl;
			videoEl.currentTime = offset;

			// Apply settings on first load
			if (!settingsApplied) {
				settingsApplied = true;
				videoEl.volume = getVolume() / 100;
				videoEl.muted = getIsMuted();
			}

			await videoEl.play().catch(() => {
				// Autoplay blocked — user interaction needed
				errorMessage = 'Tap to play';
			});
		} catch (err) {
			errorMessage = `Failed to load video: ${err}`;
			setTimeout(() => onVideoEnd?.(), 3000);
		}
	}

	// React to prop changes
	$effect(() => {
		if (videoEl && videoId && videoId !== currentVideoId) {
			loadVideo(videoId, startSeconds);
		}
	});

	function handleEnded() {
		onVideoEnd?.();
	}

	function handlePause() {
		// No pause allowed — matches YouTube behavior
		videoEl?.play().catch(() => {});
	}

	export function setVolume(vol: number) {
		if (videoEl) videoEl.volume = vol / 100;
	}

	export function mute() {
		if (videoEl) videoEl.muted = true;
	}

	export function unmute() {
		if (videoEl) videoEl.muted = false;
	}

	export function isMuted(): boolean {
		return videoEl?.muted ?? false;
	}
</script>

<div class="local-player">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={videoEl}
		onended={handleEnded}
		onpause={handlePause}
		playsinline
	></video>
	{#if errorMessage}
		<div class="error-overlay">
			<div class="error-text">{errorMessage}</div>
			<div class="error-sub">Skipping to next video...</div>
		</div>
	{/if}
</div>

<style>
	.local-player {
		width: 100%;
		height: 100%;
		background: #000;
		position: relative;
		overflow: hidden;
	}

	.local-player video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
	}

	.error-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.85);
		z-index: 2;
		font-family: monospace;
	}

	.error-text {
		color: #f66;
		font-size: 1.2rem;
		margin-bottom: 8px;
	}

	.error-sub {
		color: #666;
		font-size: 0.9rem;
	}
</style>
