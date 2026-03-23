<script lang="ts">
	type Props = {
		active: boolean;
	};

	let { active }: Props = $props();
</script>

{#if active}
	<div class="static-overlay" aria-hidden="true">
		<div class="noise"></div>
	</div>
{/if}

<style>
	.static-overlay {
		position: absolute;
		inset: 0;
		z-index: 40;
		background: #111;
		animation: static-flash 0.4s ease-out forwards;
	}

	@keyframes static-flash {
		0% { opacity: 1; }
		30% { opacity: 0.9; }
		100% { opacity: 0; }
	}

	.noise {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
		background-size: 256px 256px;
		opacity: 0.8;
		animation: noise-scroll 0.1s steps(4) infinite;
	}

	@keyframes noise-scroll {
		0% { transform: translate(0, 0); }
		25% { transform: translate(-5%, -5%); }
		50% { transform: translate(5%, 5%); }
		75% { transform: translate(-3%, 3%); }
		100% { transform: translate(3%, -3%); }
	}
</style>
