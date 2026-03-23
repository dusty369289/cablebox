<script lang="ts">
	import type { Channel } from '$lib/scheduling/types.js';

	type Props = {
		channel: Channel | null;
		videoTitle: string;
	};

	let { channel, videoTitle }: Props = $props();
	let visible = $state(false);
	let timeout: ReturnType<typeof setTimeout> | null = null;

	// Show banner whenever channel changes
	$effect(() => {
		if (channel) {
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
		bottom: 80px;
		left: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		background: rgba(0, 0, 0, 0.85);
		border: 2px solid #3a3;
		padding: 12px 20px;
		font-family: monospace;
		color: #fff;
		z-index: 10;
		animation: slide-in 0.3s ease-out;
	}

	.channel-number {
		font-size: 2.5rem;
		font-weight: bold;
		color: #3a3;
		min-width: 60px;
		text-align: center;
	}

	.channel-name {
		font-size: 1.2rem;
		font-weight: bold;
	}

	.video-title {
		font-size: 0.9rem;
		color: #ccc;
		margin-top: 2px;
		max-width: 400px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.channel-category {
		font-size: 0.75rem;
		color: #888;
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
			bottom: 70px;
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
