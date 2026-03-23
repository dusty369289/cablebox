<script lang="ts">
	type Props = {
		enabled: boolean;
	};

	let { enabled }: Props = $props();
</script>

{#if enabled}
	<div class="crt-overlay" aria-hidden="true">
		<div class="scanlines"></div>
		<div class="vignette"></div>
		<div class="flicker"></div>
	</div>
{/if}

<style>
	.crt-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 50;
	}

	/* Horizontal scan lines */
	.scanlines {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			to bottom,
			transparent 0px,
			transparent 2px,
			rgba(0, 0, 0, 0.15) 2px,
			rgba(0, 0, 0, 0.15) 4px
		);
	}

	/* Corner vignette darkening */
	.vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			transparent 60%,
			rgba(0, 0, 0, 0.4) 100%
		);
	}

	/* Subtle brightness flicker */
	.flicker {
		position: absolute;
		inset: 0;
		opacity: 0;
		animation: crt-flicker 0.15s infinite;
		background: rgba(18, 16, 16, 0.1);
	}

	@keyframes crt-flicker {
		0% { opacity: 0.02; }
		5% { opacity: 0.04; }
		10% { opacity: 0.01; }
		15% { opacity: 0.03; }
		20% { opacity: 0.02; }
		50% { opacity: 0.04; }
		80% { opacity: 0.01; }
		100% { opacity: 0.03; }
	}
</style>
