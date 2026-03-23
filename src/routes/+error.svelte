<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
</script>

<div class="error-screen">
	<div class="error-code">{page.status}</div>
	<div class="error-message">{page.error?.message || 'Something went wrong'}</div>
	<button class="error-btn" onclick={() => location.assign(`${base}/`)}>Back to CableBox</button>
</div>

<style>
	.error-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background: #000;
		font-family: monospace;
		color: #ccc;
		gap: 16px;
	}
	.error-code { font-size: 4rem; color: #f33; font-weight: bold; }
	.error-message { font-size: 1.2rem; color: #888; }
	.error-btn {
		margin-top: 20px;
		background: #1a3a1a; border: 1px solid #3a3; color: #3a3;
		padding: 10px 24px; border-radius: 4px; font-family: monospace;
		font-size: 1rem; cursor: pointer;
	}
	.error-btn:hover { background: #2a4a2a; color: #5c5; }
</style>
