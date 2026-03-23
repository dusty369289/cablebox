/**
 * Channel Surfer Bookmarklet — YouTube Video Scraper
 *
 * This script runs on youtube.com pages. It:
 * 1. Auto-scrolls to load all videos
 * 2. Extracts video metadata from the DOM
 * 3. Shows a floating panel with filters
 * 4. Exports JSON for importing into Channel Surfer
 *
 * Supports: homepage, channel/videos, subscriptions, playlists, search results
 */

// ─── Types ───────────────────────────────────────────────────────────

type ScrapedVideo = {
	id: string;
	title: string;
	duration: number; // seconds
	durationText: string;
	thumbnail: string;
	channel: string;
	channelId: string;
	uploadedText: string; // relative date like "2 days ago"
	views: string;
};

type ExportChannel = {
	name: string;
	slug: string;
	number: number;
	category: string;
	sources: [{ type: 'imported'; videos: ExportVideo[] }];
};

type ExportVideo = {
	id: string;
	title: string;
	duration: number;
	thumbnail: string;
};

// ─── Duration Parsing ────────────────────────────────────────────────

function parseDurationText(text: string): number {
	if (!text) return 0;
	const parts = text.trim().split(':').map(Number);
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	if (parts.length === 2) return parts[0] * 60 + parts[1];
	if (parts.length === 1) return parts[0];
	return 0;
}

function formatSeconds(s: number): string {
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (h > 0) return `${h}h${m}m`;
	return `${m}m`;
}

function slugify(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Video Extraction ────────────────────────────────────────────────

function extractFromVideoRenderer(renderer: any): ScrapedVideo | null {
	if (!renderer || !renderer.videoId) return null;

	const id = renderer.videoId;
	const title = renderer.title?.runs?.[0]?.text || renderer.title?.simpleText || '';

	// Duration from lengthText or lengthSeconds
	let duration = 0;
	let durationText = '';
	if (renderer.lengthSeconds) {
		duration = parseInt(renderer.lengthSeconds, 10);
		durationText = renderer.lengthText?.simpleText || '';
	} else if (renderer.lengthText?.simpleText) {
		durationText = renderer.lengthText.simpleText;
		duration = parseDurationText(durationText);
	} else {
		// Check thumbnail overlays
		const overlays = renderer.thumbnailOverlays || [];
		for (const o of overlays) {
			const tsRenderer = o.thumbnailOverlayTimeStatusRenderer;
			if (tsRenderer?.text?.simpleText) {
				durationText = tsRenderer.text.simpleText;
				duration = parseDurationText(durationText);
				break;
			}
		}
	}

	// Skip shorts/live
	const overlays = renderer.thumbnailOverlays || [];
	for (const o of overlays) {
		const style = o.thumbnailOverlayTimeStatusRenderer?.style;
		if (style === 'SHORTS' || style === 'LIVE') return null;
	}

	if (duration < 60) return null; // Filter shorts by duration too

	const thumbnail = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
	const channel = renderer.ownerText?.runs?.[0]?.text
		|| renderer.shortBylineText?.runs?.[0]?.text
		|| renderer.longBylineText?.runs?.[0]?.text
		|| '';
	const channelId = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
		|| renderer.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
		|| renderer.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
		|| '';
	const uploadedText = renderer.publishedTimeText?.simpleText || '';
	const views = renderer.viewCountText?.simpleText || renderer.shortViewCountText?.simpleText || '';

	return { id, title, duration, durationText, thumbnail, channel, channelId, uploadedText, views };
}

function extractVideosFromDOM(): ScrapedVideo[] {
	const videos: ScrapedVideo[] = [];
	const seen = new Set<string>();

	// Try all known renderer types
	const selectors = [
		'ytd-rich-item-renderer',      // homepage, channel, subscriptions
		'ytd-playlist-video-renderer',  // playlists
		'ytd-video-renderer',           // search results
		'ytd-compact-video-renderer',   // sidebar recommendations
		'ytd-grid-video-renderer',      // older grid layouts
	];

	for (const selector of selectors) {
		const elements = document.querySelectorAll(selector);
		for (const el of elements) {
			const data = (el as any).data;
			if (!data) continue;

			// richItemRenderer wraps a videoRenderer
			const renderer = data.content?.videoRenderer || data;
			const video = extractFromVideoRenderer(renderer);
			if (video && !seen.has(video.id)) {
				seen.add(video.id);
				videos.push(video);
			}
		}
	}

	return videos;
}

// ─── Auto-Scroll ─────────────────────────────────────────────────────

async function autoScroll(onProgress: (count: number) => void): Promise<void> {
	let lastCount = 0;
	let staleRounds = 0;
	const MAX_STALE = 3; // Stop after 3 rounds with no new videos

	while (staleRounds < MAX_STALE) {
		window.scrollTo(0, document.documentElement.scrollHeight);
		await sleep(1500);

		const currentCount = document.querySelectorAll(
			'ytd-rich-item-renderer, ytd-playlist-video-renderer, ytd-video-renderer, ytd-grid-video-renderer'
		).length;

		onProgress(currentCount);

		if (currentCount === lastCount) {
			staleRounds++;
		} else {
			staleRounds = 0;
		}
		lastCount = currentCount;
	}

	// Scroll back to top
	window.scrollTo(0, 0);
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

// ─── UI Panel ────────────────────────────────────────────────────────

function createPanel() {
	// Remove existing panel
	document.getElementById('cs-panel')?.remove();

	const panel = document.createElement('div');
	panel.id = 'cs-panel';
	panel.innerHTML = `
		<style>
			#cs-panel {
				position: fixed;
				top: 20px;
				right: 20px;
				width: 420px;
				max-height: 80vh;
				background: #111;
				border: 2px solid #3a3;
				border-radius: 8px;
				font-family: 'Courier New', monospace;
				color: #ccc;
				z-index: 999999;
				display: flex;
				flex-direction: column;
				box-shadow: 0 8px 32px rgba(0,0,0,0.6);
			}
			#cs-panel * { box-sizing: border-box; }
			.cs-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 12px 16px;
				border-bottom: 1px solid #333;
				background: #0a1a0a;
				border-radius: 6px 6px 0 0;
			}
			.cs-title { color: #3a3; font-weight: bold; font-size: 14px; }
			.cs-close {
				background: none; border: none; color: #666;
				font-size: 18px; cursor: pointer; padding: 0;
			}
			.cs-close:hover { color: #f33; }
			.cs-status {
				padding: 8px 16px;
				font-size: 12px;
				color: #888;
				border-bottom: 1px solid #222;
			}
			.cs-filters {
				padding: 10px 16px;
				border-bottom: 1px solid #222;
				display: flex;
				flex-direction: column;
				gap: 8px;
			}
			.cs-filter-row {
				display: flex;
				gap: 8px;
				align-items: center;
				font-size: 12px;
			}
			.cs-filter-row label { min-width: 70px; color: #888; }
			.cs-filter-row input, .cs-filter-row select {
				background: #1a1a1a; border: 1px solid #333;
				color: #ccc; padding: 4px 8px; border-radius: 4px;
				font-family: inherit; font-size: 12px; flex: 1;
			}
			.cs-video-list {
				flex: 1;
				overflow-y: auto;
				max-height: 40vh;
			}
			.cs-video-item {
				padding: 6px 16px;
				font-size: 11px;
				border-bottom: 1px solid #1a1a1a;
				display: flex;
				gap: 8px;
				align-items: center;
			}
			.cs-video-item:hover { background: #1a2a1a; }
			.cs-video-item input[type=checkbox] { flex-shrink: 0; }
			.cs-video-info { flex: 1; overflow: hidden; }
			.cs-video-title {
				white-space: nowrap; overflow: hidden;
				text-overflow: ellipsis; color: #ddd;
			}
			.cs-video-meta { color: #666; font-size: 10px; margin-top: 2px; }
			.cs-actions {
				padding: 12px 16px;
				border-top: 1px solid #333;
				display: flex;
				flex-direction: column;
				gap: 8px;
			}
			.cs-export-row {
				display: flex; gap: 8px; align-items: center; font-size: 12px;
			}
			.cs-export-row label { min-width: 70px; color: #888; }
			.cs-export-row select, .cs-export-row input {
				background: #1a1a1a; border: 1px solid #333;
				color: #ccc; padding: 4px 8px; border-radius: 4px;
				font-family: inherit; font-size: 12px; flex: 1;
			}
			.cs-btn {
				background: #1a3a1a; border: 1px solid #3a3;
				color: #3a3; padding: 8px 16px; border-radius: 4px;
				font-family: inherit; font-size: 13px; font-weight: bold;
				cursor: pointer; text-align: center;
			}
			.cs-btn:hover { background: #2a4a2a; color: #5c5; }
			.cs-btn:disabled { opacity: 0.4; cursor: not-allowed; }
			.cs-btn-primary { background: #3a3; color: #000; }
			.cs-btn-primary:hover { background: #5c5; }
			.cs-summary {
				font-size: 11px; color: #888; text-align: center; padding: 4px;
			}
		</style>
		<div class="cs-header">
			<span class="cs-title">CHANNEL SURFER</span>
			<button class="cs-close" id="cs-close">&times;</button>
		</div>
		<div class="cs-status" id="cs-status">Ready to scan</div>
		<div style="padding: 10px 16px;">
			<button class="cs-btn" id="cs-scan" style="width:100%;">Scan Page</button>
		</div>
		<div class="cs-filters" id="cs-filters" style="display:none;">
			<div class="cs-filter-row">
				<label>Min duration</label>
				<input type="number" id="cs-min-dur" value="60" min="0" step="30" />
				<span style="color:#666;font-size:11px;">sec</span>
			</div>
			<div class="cs-filter-row">
				<label>Max videos</label>
				<input type="number" id="cs-max-count" value="0" min="0" placeholder="0 = all" />
			</div>
			<div class="cs-filter-row">
				<label>Channel</label>
				<select id="cs-channel-filter"><option value="">All channels</option></select>
			</div>
			<div class="cs-filter-row">
				<button class="cs-btn" id="cs-select-all" style="flex:1;">Select All</button>
				<button class="cs-btn" id="cs-select-none" style="flex:1;">Select None</button>
			</div>
		</div>
		<div class="cs-video-list" id="cs-video-list"></div>
		<div class="cs-actions" id="cs-actions" style="display:none;">
			<div class="cs-summary" id="cs-summary"></div>
			<div class="cs-export-row">
				<label>Group as</label>
				<select id="cs-grouping">
					<option value="single">One channel</option>
					<option value="split">Split by YT channel</option>
				</select>
			</div>
			<div class="cs-export-row" id="cs-name-row">
				<label>Name</label>
				<input type="text" id="cs-channel-name" placeholder="My Channel" />
			</div>
			<button class="cs-btn cs-btn-primary" id="cs-export">Copy to Clipboard</button>
		</div>
	`;
	document.body.appendChild(panel);
	return panel;
}

// ─── Main ────────────────────────────────────────────────────────────

(function main() {
	if (!window.location.hostname.includes('youtube.com')) {
		alert('Channel Surfer: This bookmarklet only works on youtube.com');
		return;
	}

	const panel = createPanel();
	let allVideos: ScrapedVideo[] = [];
	let filteredVideos: ScrapedVideo[] = [];

	const statusEl = document.getElementById('cs-status')!;
	const scanBtn = document.getElementById('cs-scan')!;
	const filtersEl = document.getElementById('cs-filters')!;
	const videoListEl = document.getElementById('cs-video-list')!;
	const actionsEl = document.getElementById('cs-actions')!;
	const summaryEl = document.getElementById('cs-summary')!;
	const channelFilterEl = document.getElementById('cs-channel-filter') as HTMLSelectElement;
	const minDurEl = document.getElementById('cs-min-dur') as HTMLInputElement;
	const maxCountEl = document.getElementById('cs-max-count') as HTMLInputElement;
	const groupingEl = document.getElementById('cs-grouping') as HTMLSelectElement;
	const channelNameEl = document.getElementById('cs-channel-name') as HTMLInputElement;
	const nameRowEl = document.getElementById('cs-name-row')!;
	const exportBtn = document.getElementById('cs-export')!;

	// Close button
	document.getElementById('cs-close')!.onclick = () => panel.remove();

	// Scan button
	scanBtn.onclick = async () => {
		scanBtn.setAttribute('disabled', '');
		scanBtn.textContent = 'Scrolling...';
		statusEl.textContent = 'Auto-scrolling to load all videos...';

		await autoScroll((count) => {
			statusEl.textContent = `Scrolling... ${count} elements loaded`;
		});

		statusEl.textContent = 'Extracting video data...';
		allVideos = extractVideosFromDOM();
		statusEl.textContent = `Found ${allVideos.length} videos`;

		// Populate channel filter
		const channels = [...new Set(allVideos.map((v) => v.channel).filter(Boolean))].sort();
		channelFilterEl.innerHTML = '<option value="">All channels</option>';
		for (const ch of channels) {
			const opt = document.createElement('option');
			opt.value = ch;
			opt.textContent = ch;
			channelFilterEl.appendChild(opt);
		}

		// Auto-set channel name from page
		const pageChannel = document.querySelector('ytd-channel-name yt-formatted-string')?.textContent
			|| channels[0] || 'My Channel';
		channelNameEl.value = pageChannel;

		filtersEl.style.display = '';
		actionsEl.style.display = '';
		scanBtn.textContent = 'Re-scan Page';
		scanBtn.removeAttribute('disabled');

		applyFilters();
	};

	// Filter controls
	channelFilterEl.onchange = applyFilters;
	minDurEl.oninput = applyFilters;
	maxCountEl.oninput = applyFilters;

	// Select all/none
	document.getElementById('cs-select-all')!.onclick = () => {
		videoListEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
			.forEach((cb) => { cb.checked = true; });
		updateSummary();
	};
	document.getElementById('cs-select-none')!.onclick = () => {
		videoListEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
			.forEach((cb) => { cb.checked = false; });
		updateSummary();
	};

	// Grouping toggle
	groupingEl.onchange = () => {
		nameRowEl.style.display = groupingEl.value === 'single' ? '' : 'none';
	};

	// Export
	exportBtn.onclick = () => {
		const selected = getSelectedVideos();
		if (selected.length === 0) {
			statusEl.textContent = 'No videos selected!';
			return;
		}

		let exportData: ExportChannel[];

		if (groupingEl.value === 'single') {
			const name = channelNameEl.value.trim() || 'Imported Channel';
			exportData = [{
				name,
				slug: slugify(name),
				number: 0, // assigned on import
				category: 'Imported',
				sources: [{
					type: 'imported',
					videos: selected.map(toExportVideo)
				}]
			}];
		} else {
			// Group by channel
			const groups = new Map<string, ScrapedVideo[]>();
			for (const v of selected) {
				const key = v.channel || 'Unknown';
				if (!groups.has(key)) groups.set(key, []);
				groups.get(key)!.push(v);
			}
			exportData = [...groups.entries()].map(([name, vids]) => ({
				name,
				slug: slugify(name),
				number: 0,
				category: 'Imported',
				sources: [{
					type: 'imported' as const,
					videos: vids.map(toExportVideo)
				}]
			}));
		}

		const json = JSON.stringify(exportData, null, 2);
		navigator.clipboard.writeText(json).then(() => {
			const count = selected.length;
			const channels = exportData.length;
			statusEl.textContent = `Copied! ${count} videos in ${channels} channel(s)`;
			exportBtn.textContent = 'Copied!';
			setTimeout(() => { exportBtn.textContent = 'Copy to Clipboard'; }, 2000);
		}).catch(() => {
			// Fallback: prompt
			prompt('Copy this JSON:', json);
		});
	};

	function toExportVideo(v: ScrapedVideo): ExportVideo {
		return { id: v.id, title: v.title, duration: v.duration, thumbnail: v.thumbnail };
	}

	function applyFilters() {
		const channelFilter = channelFilterEl.value;
		const minDur = parseInt(minDurEl.value, 10) || 0;
		const maxCount = parseInt(maxCountEl.value, 10) || 0;

		filteredVideos = allVideos.filter((v) => {
			if (channelFilter && v.channel !== channelFilter) return false;
			if (v.duration < minDur) return false;
			return true;
		});

		if (maxCount > 0) {
			filteredVideos = filteredVideos.slice(0, maxCount);
		}

		renderVideoList();
	}

	function renderVideoList() {
		videoListEl.innerHTML = '';
		for (const v of filteredVideos) {
			const div = document.createElement('div');
			div.className = 'cs-video-item';
			div.innerHTML = `
				<input type="checkbox" checked data-id="${v.id}" />
				<div class="cs-video-info">
					<div class="cs-video-title" title="${v.title}">${v.title}</div>
					<div class="cs-video-meta">
						${v.durationText || formatSeconds(v.duration)}
						${v.channel ? ' · ' + v.channel : ''}
						${v.uploadedText ? ' · ' + v.uploadedText : ''}
						${v.views ? ' · ' + v.views : ''}
					</div>
				</div>
			`;
			div.querySelector('input')!.onchange = updateSummary;
			videoListEl.appendChild(div);
		}
		updateSummary();
	}

	function getSelectedVideos(): ScrapedVideo[] {
		const selectedIds = new Set<string>();
		videoListEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked')
			.forEach((cb) => selectedIds.add(cb.dataset.id!));
		return filteredVideos.filter((v) => selectedIds.has(v.id));
	}

	function updateSummary() {
		const selected = getSelectedVideos();
		const totalDur = selected.reduce((s, v) => s + v.duration, 0);
		summaryEl.textContent = `${selected.length} selected · ${formatSeconds(totalDur)} total`;
	}
})();
