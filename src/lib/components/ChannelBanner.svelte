<script lang="ts">
	import type { Channel } from '$lib/scheduling/types.js';

	type Props = {
		channel: Channel | null;
		videoTitle: string;
	};

	let { channel, videoTitle }: Props = $props();
	let visible = $state(false);
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let lastChannelSlug = '';
	let initialized = false;

	// Show banner only on channel *switches*, not initial load
	$effect(() => {
		if (!channel) return;
		const slug = channel.slug;
		if (!initialized) {
			initialized = true;
			lastChannelSlug = slug;
			return;
		}
		if (slug !== lastChannelSlug) {
			lastChannelSlug = slug;
			visible = true;
			if (timeout) clearTimeout(timeout);
			timeout = setTimeout(() => {
				visible = false;
			}, 3000);
		}
	});
</script>

{#if visible && channel}
	<div class="banner" class:fade-out={!visible}>
		<div class="channel-number">{channel.number}</div>
		<div class="channel-info">
			<div class="channel-name">{channel.name}</div>
			<div class="video-title">{videoTitle}</div>
			<div class="channel-category">{channel.category}</div>
		</div>
	</div>
{/if}

<style>
	.banner {
		position: absolute;
		bottom: calc(80px + env(safe-area-inset-bottom, 0px));
		left: 20px;
		right: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		background: var(--color-overlay-bg);
		border: 2px solid var(--color-primary);
		border-radius: var(--border-radius);
		padding: 12px 20px;
		font-family: var(--font-family);
		color: var(--color-text-bright);
		z-index: 10;
		animation: slide-in 0.3s ease-out;
		overflow: hidden;
	}

	.channel-info {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.channel-number {
		font-size: 2.5rem;
		font-weight: bold;
		color: var(--color-primary);
		min-width: 60px;
		text-align: center;
		text-shadow: var(--text-glow);
	}

	.channel-name {
		font-size: 1.2rem;
		font-weight: bold;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.video-title {
		font-size: 0.9rem;
		color: var(--color-text);
		margin-top: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.channel-category {
		font-size: 0.75rem;
		color: var(--color-text-dim);
		text-transform: uppercase;
		margin-top: 4px;
	}

	@keyframes slide-in {
		from {
			transform: translateX(-100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@media (max-width: 640px) {
		.banner {
			left: 10px;
			right: 10px;
			bottom: calc(70px + env(safe-area-inset-bottom, 0px));
			padding: 8px 12px;
			gap: 10px;
		}

		.channel-number {
			font-size: 1.8rem;
			min-width: 40px;
		}

		.channel-name {
			font-size: 1rem;
		}

		.video-title {
			font-size: 0.8rem;
			max-width: none;
		}
	}
</style>
