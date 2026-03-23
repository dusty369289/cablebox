<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>CableBox — How to Import Channels</title>
</svelte:head>

<div class="guide-page">
	<header class="guide-header">
		<a href="{base}/" class="back-link">Back to CableBox</a>
		<h1>How to Import Channels</h1>
		<p class="subtitle">Use the CableBox bookmarklet to scrape videos from any YouTube page and add them as channels.</p>
	</header>

	<section class="step">
		<div class="step-number">1</div>
		<div class="step-content">
			<h2>Install the Bookmarklet</h2>
			<p>Open CableBox and press <kbd>I</kbd> or click the <strong>+</strong> button to open the Import panel. You'll see a green <strong>"CableBox"</strong> button — drag it to your browser's bookmarks bar.</p>
			<div class="tip">
				<strong>Tip:</strong> If your bookmarks bar isn't visible, press <kbd>Ctrl+Shift+B</kbd> (Windows/Linux) or <kbd>Cmd+Shift+B</kbd> (Mac) to show it.
			</div>
		</div>
	</section>

	<section class="step">
		<div class="step-number">2</div>
		<div class="step-content">
			<h2>Navigate to YouTube</h2>
			<p>Go to any YouTube page you want to scrape. The bookmarklet works on:</p>
			<ul>
				<li><strong>Channel pages</strong> — e.g. <code>youtube.com/@Fireship/videos</code></li>
				<li><strong>Your homepage</strong> — <code>youtube.com</code> (must be signed in)</li>
				<li><strong>Subscriptions</strong> — <code>youtube.com/feed/subscriptions</code></li>
				<li><strong>Playlists</strong> — <code>youtube.com/playlist?list=...</code></li>
				<li><strong>Search results</strong> — <code>youtube.com/results?search_query=...</code></li>
			</ul>
		</div>
	</section>

	<section class="step">
		<div class="step-number">3</div>
		<div class="step-content">
			<h2>Run the Bookmarklet</h2>
			<p>Click the <strong>"CableBox"</strong> bookmark in your bookmarks bar. A dark panel will appear in the top-right corner of the YouTube page.</p>
			<p>Click <strong>Scan Page</strong>. The bookmarklet will automatically scroll down the page to load more videos. You'll see the count increase as it discovers videos.</p>
			<div class="tip">
				<strong>Tip:</strong> Click <strong>Stop Scan</strong> at any time to finish early with whatever has been loaded so far. YouTube Shorts and live streams are automatically filtered out.
			</div>
		</div>
	</section>

	<section class="step">
		<div class="step-number">4</div>
		<div class="step-content">
			<h2>Filter Your Results</h2>
			<p>After scanning, you can refine what gets exported:</p>
			<ul>
				<li><strong>Duration range</strong> — Set min/max duration in seconds. Default minimum is 90s to skip short clips.</li>
				<li><strong>Max videos</strong> — Cap the total number (0 = no limit).</li>
				<li><strong>Channel filter</strong> — If the page has videos from multiple channels (homepage, subscriptions), filter to just one.</li>
				<li><strong>Checkboxes</strong> — Individually select/deselect videos. Use "Select All" / "Select None" for bulk control.</li>
			</ul>
		</div>
	</section>

	<section class="step">
		<div class="step-number">5</div>
		<div class="step-content">
			<h2>Choose How to Group</h2>
			<p>At the bottom of the panel, choose how to organise the exported videos:</p>
			<ul>
				<li><strong>One channel</strong> — All selected videos become a single CableBox channel. Enter a name for it.</li>
				<li><strong>Split by YT channel</strong> — Videos are grouped by their YouTube channel, each becoming a separate CableBox channel.</li>
			</ul>
		</div>
	</section>

	<section class="step">
		<div class="step-number">6</div>
		<div class="step-content">
			<h2>Copy and Import</h2>
			<p>Click <strong>Copy to Clipboard</strong>. The video data is copied as JSON.</p>
			<p>Switch back to CableBox, open the Import panel (<kbd>I</kbd> or <strong>+</strong>), and paste into the text box. You'll see a preview of the channels and video counts. Click <strong>Import</strong> to add them to your lineup.</p>
		</div>
	</section>

	<section class="step">
		<div class="step-number">7</div>
		<div class="step-content">
			<h2>Watch</h2>
			<p>Your imported channels appear in the TV guide alongside the defaults. Open the guide with <kbd>G</kbd> and tune in.</p>
			<p>Imported channels are saved in your browser — they'll be there next time you visit.</p>
		</div>
	</section>

	<section class="faq">
		<h2>FAQ</h2>

		<details>
			<summary>The bookmarklet shows 0 videos</summary>
			<p>Make sure you're on a YouTube page with video listings. The bookmarklet needs the page to have loaded — wait a few seconds after navigation before clicking it. If on your homepage or subscriptions, you must be signed into YouTube.</p>
		</details>

		<details>
			<summary>Videos from other channels appear in my scan</summary>
			<p>YouTube shows recommended videos in sidebars and shelves. Use the <strong>Channel filter</strong> dropdown to isolate just the channel you want.</p>
		</details>

		<details>
			<summary>Can I import the same channel twice?</summary>
			<p>Channels are identified by their slug (name). Importing a channel with the same slug will overwrite the existing one.</p>
		</details>

		<details>
			<summary>How do I remove an imported channel?</summary>
			<p>Currently, clear your browser's IndexedDB data for CableBox. A channel management UI is planned.</p>
		</details>

		<details>
			<summary>Keyboard shortcuts</summary>
			<p>
				<kbd>G</kbd> Guide &nbsp;
				<kbd>I</kbd> Import &nbsp;
				<kbd>F</kbd> Fullscreen &nbsp;
				<kbd>M</kbd> Mute &nbsp;
				<kbd>C</kbd> CRT Effect &nbsp;
				<kbd>T</kbd> Theme &nbsp;
				<kbd>Up/Down</kbd> Channel &nbsp;
				<kbd>0-9</kbd> Direct Tune
			</p>
		</details>
	</section>

	<footer class="guide-footer">
		<a href="{base}/" class="back-link">Back to CableBox</a>
	</footer>
</div>

<style>
	:global(body) {
		background: var(--color-bg);
		margin: 0;
	}

	.guide-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 40px 20px;
		font-family: var(--font-family);
		color: var(--color-text);
		min-height: 100vh;
	}

	.guide-header {
		margin-bottom: 40px;
	}

	.guide-header h1 {
		color: var(--color-primary);
		font-size: 2rem;
		margin: 12px 0 8px;
		text-shadow: var(--text-glow);
	}

	.subtitle {
		color: var(--color-text-dim);
		font-size: 1rem;
		margin: 0;
	}

	.back-link {
		color: var(--color-primary);
		text-decoration: none;
		font-size: 0.9rem;
	}
	.back-link:hover { color: var(--color-primary-bright); text-decoration: underline; }

	.step {
		display: flex;
		gap: 16px;
		margin-bottom: 32px;
	}

	.step-number {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		background: var(--color-primary-dim);
		color: var(--color-primary-bright);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 1.1rem;
		margin-top: 4px;
	}

	.step-content h2 {
		color: var(--color-text-bright);
		font-size: 1.2rem;
		margin: 0 0 8px;
	}

	.step-content p {
		margin: 0 0 8px;
		line-height: 1.6;
		color: var(--color-text);
	}

	.step-content ul {
		margin: 8px 0;
		padding-left: 20px;
	}

	.step-content li {
		margin-bottom: 4px;
		line-height: 1.5;
	}

	kbd {
		background: var(--color-surface-active);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 1px 6px;
		font-family: var(--font-family);
		font-size: 0.85em;
		color: var(--color-primary);
	}

	code {
		background: var(--color-surface);
		padding: 1px 6px;
		border-radius: 3px;
		font-size: 0.85em;
		color: var(--color-text-dim);
	}

	.tip {
		background: var(--color-surface);
		border-left: 3px solid var(--color-primary);
		padding: 8px 12px;
		margin-top: 8px;
		font-size: 0.9rem;
		border-radius: var(--border-radius-sm);
	}

	.faq {
		margin-top: 48px;
		border-top: 1px solid var(--color-border);
		padding-top: 32px;
	}

	.faq h2 {
		color: var(--color-primary);
		font-size: 1.4rem;
		margin-bottom: 16px;
	}

	details {
		margin-bottom: 12px;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-sm);
		overflow: hidden;
	}

	summary {
		padding: 10px 14px;
		cursor: pointer;
		color: var(--color-text-bright);
		background: var(--color-surface);
		font-weight: bold;
		font-size: 0.95rem;
	}
	summary:hover { background: var(--color-surface-hover); }

	details p {
		padding: 10px 14px;
		margin: 0;
		line-height: 1.6;
		color: var(--color-text);
		font-size: 0.9rem;
	}

	.guide-footer {
		margin-top: 48px;
		padding-top: 20px;
		border-top: 1px solid var(--color-border);
	}

	@media (max-width: 640px) {
		.guide-page { padding: 20px 16px; }
		.step { flex-direction: column; gap: 8px; }
		.step-number { width: 28px; height: 28px; font-size: 0.9rem; }
	}
</style>
