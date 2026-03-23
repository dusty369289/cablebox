/**
 * Channel Surfer Bookmarklet — YouTube Video Scraper
 *
 * Runs on youtube.com pages. Auto-scrolls to load all videos,
 * extracts metadata from DOM, shows filter UI, exports JSON.
 *
 * Uses only createElement (no innerHTML) to comply with YouTube's
 * Trusted Types CSP.
 */

// ─── Types ───────────────────────────────────────────────────────────

type ScrapedVideo = {
	id: string;
	title: string;
	duration: number;
	durationText: string;
	thumbnail: string;
	channel: string;
	channelId: string;
	uploadedText: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────

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

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/** Create an element with styles and optional text content. */
function el(tag: string, styles: Partial<CSSStyleDeclaration> = {}, text?: string): HTMLElement {
	const e = document.createElement(tag);
	Object.assign(e.style, styles);
	if (text !== undefined) e.textContent = text;
	return e;
}

/** Create a styled input element. */
function input(type: string, styles: Partial<CSSStyleDeclaration> = {}, attrs: Record<string, string> = {}): HTMLInputElement {
	const e = document.createElement('input');
	e.type = type;
	Object.assign(e.style, styles);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
	return e;
}

/** Create a styled select element with options. */
function select(options: [string, string][], styles: Partial<CSSStyleDeclaration> = {}): HTMLSelectElement {
	const s = document.createElement('select');
	Object.assign(s.style, styles);
	for (const [val, label] of options) {
		const o = document.createElement('option');
		o.value = val;
		o.textContent = label;
		s.appendChild(o);
	}
	return s;
}

const inputStyle: Partial<CSSStyleDeclaration> = {
	background: '#1a1a1a', border: '1px solid #333', color: '#ccc',
	padding: '4px 8px', borderRadius: '4px', fontFamily: 'inherit', fontSize: '12px', flex: '1'
};

const btnStyle: Partial<CSSStyleDeclaration> = {
	background: '#1a3a1a', border: '1px solid #3a3', color: '#3a3',
	padding: '8px 16px', borderRadius: '4px', fontFamily: 'inherit',
	fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center'
};

// ─── Video Extraction ────────────────────────────────────────────────

function extractFromVideoRenderer(renderer: any): ScrapedVideo | null {
	if (!renderer || !renderer.videoId) return null;

	const id = renderer.videoId;
	const title = renderer.title?.runs?.[0]?.text || renderer.title?.simpleText || '';

	let duration = 0;
	let durationText = '';
	if (renderer.lengthSeconds) {
		duration = parseInt(renderer.lengthSeconds, 10);
		durationText = renderer.lengthText?.simpleText || '';
	} else if (renderer.lengthText?.simpleText) {
		durationText = renderer.lengthText.simpleText;
		duration = parseDurationText(durationText);
	} else {
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

	if (duration < 60) return null;

	const thumbnail = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
	const channel = renderer.ownerText?.runs?.[0]?.text
		|| renderer.shortBylineText?.runs?.[0]?.text
		|| renderer.longBylineText?.runs?.[0]?.text || '';
	const channelId = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
		|| renderer.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
		|| renderer.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
	const uploadedText = renderer.publishedTimeText?.simpleText || '';
	const views = renderer.viewCountText?.simpleText || renderer.shortViewCountText?.simpleText || '';

	return { id, title, duration, durationText, thumbnail, channel, channelId, uploadedText, views };
}

function extractVideosFromDOM(): ScrapedVideo[] {
	const videos: ScrapedVideo[] = [];
	const seen = new Set<string>();
	const selectors = [
		'ytd-rich-item-renderer', 'ytd-playlist-video-renderer',
		'ytd-video-renderer', 'ytd-compact-video-renderer', 'ytd-grid-video-renderer'
	];

	for (const selector of selectors) {
		for (const elem of document.querySelectorAll(selector)) {
			const data = (elem as any).data;
			if (!data) continue;
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

	while (staleRounds < 3) {
		window.scrollTo(0, document.documentElement.scrollHeight);
		await sleep(1500);

		const currentCount = document.querySelectorAll(
			'ytd-rich-item-renderer, ytd-playlist-video-renderer, ytd-video-renderer, ytd-grid-video-renderer'
		).length;
		onProgress(currentCount);

		if (currentCount === lastCount) staleRounds++;
		else staleRounds = 0;
		lastCount = currentCount;
	}
	window.scrollTo(0, 0);
}

// ─── UI (no innerHTML — Trusted Types safe) ──────────────────────────

function buildPanel(): {
	panel: HTMLElement;
	statusEl: HTMLElement;
	scanBtn: HTMLButtonElement;
	filtersEl: HTMLElement;
	videoListEl: HTMLElement;
	actionsEl: HTMLElement;
	summaryEl: HTMLElement;
	channelFilterEl: HTMLSelectElement;
	minDurEl: HTMLInputElement;
	maxCountEl: HTMLInputElement;
	groupingEl: HTMLSelectElement;
	channelNameEl: HTMLInputElement;
	nameRowEl: HTMLElement;
	exportBtn: HTMLButtonElement;
	selectAllBtn: HTMLButtonElement;
	selectNoneBtn: HTMLButtonElement;
	closeBtn: HTMLButtonElement;
} {
	document.getElementById('cs-panel')?.remove();

	const panel = el('div', {
		position: 'fixed', top: '20px', right: '20px', width: '420px', maxHeight: '80vh',
		background: '#111', border: '2px solid #3a3', borderRadius: '8px',
		fontFamily: "'Courier New', monospace", color: '#ccc', zIndex: '999999',
		display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
		overflow: 'hidden'
	});
	panel.id = 'cs-panel';

	// Header
	const header = el('div', {
		display: 'flex', justifyContent: 'space-between', alignItems: 'center',
		padding: '12px 16px', borderBottom: '1px solid #333', background: '#0a1a0a'
	});
	header.appendChild(el('span', { color: '#3a3', fontWeight: 'bold', fontSize: '14px' }, 'CHANNEL SURFER'));
	const closeBtn = document.createElement('button');
	closeBtn.textContent = '\u00D7';
	Object.assign(closeBtn.style, { background: 'none', border: 'none', color: '#666', fontSize: '18px', cursor: 'pointer' });
	header.appendChild(closeBtn);
	panel.appendChild(header);

	// Status
	const statusEl = el('div', { padding: '8px 16px', fontSize: '12px', color: '#888', borderBottom: '1px solid #222' }, 'Ready to scan');
	panel.appendChild(statusEl);

	// Scan button
	const scanWrap = el('div', { padding: '10px 16px' });
	const scanBtn = document.createElement('button');
	scanBtn.textContent = 'Scan Page';
	Object.assign(scanBtn.style, { ...btnStyle, width: '100%' });
	scanWrap.appendChild(scanBtn);
	panel.appendChild(scanWrap);

	// Filters
	const filtersEl = el('div', {
		padding: '10px 16px', borderBottom: '1px solid #222',
		display: 'none', flexDirection: 'column', gap: '8px'
	});

	// Min duration row
	const durRow = el('div', { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' });
	durRow.appendChild(el('label', { minWidth: '70px', color: '#888' }, 'Min duration'));
	const minDurEl = input('number', inputStyle, { value: '60', min: '0', step: '30' });
	durRow.appendChild(minDurEl);
	durRow.appendChild(el('span', { color: '#666', fontSize: '11px' }, 'sec'));
	filtersEl.appendChild(durRow);

	// Max count row
	const countRow = el('div', { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' });
	countRow.appendChild(el('label', { minWidth: '70px', color: '#888' }, 'Max videos'));
	const maxCountEl = input('number', inputStyle, { value: '0', min: '0', placeholder: '0 = all' });
	countRow.appendChild(maxCountEl);
	filtersEl.appendChild(countRow);

	// Channel filter row
	const chRow = el('div', { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' });
	chRow.appendChild(el('label', { minWidth: '70px', color: '#888' }, 'Channel'));
	const channelFilterEl = select([['', 'All channels']], inputStyle);
	chRow.appendChild(channelFilterEl);
	filtersEl.appendChild(chRow);

	// Select all/none row
	const selRow = el('div', { display: 'flex', gap: '8px' });
	const selectAllBtn = document.createElement('button');
	selectAllBtn.textContent = 'Select All';
	Object.assign(selectAllBtn.style, { ...btnStyle, flex: '1' });
	const selectNoneBtn = document.createElement('button');
	selectNoneBtn.textContent = 'Select None';
	Object.assign(selectNoneBtn.style, { ...btnStyle, flex: '1' });
	selRow.appendChild(selectAllBtn);
	selRow.appendChild(selectNoneBtn);
	filtersEl.appendChild(selRow);

	panel.appendChild(filtersEl);

	// Video list
	const videoListEl = el('div', { flex: '1', overflowY: 'auto', maxHeight: '40vh' });
	panel.appendChild(videoListEl);

	// Actions
	const actionsEl = el('div', {
		padding: '12px 16px', borderTop: '1px solid #333',
		display: 'none', flexDirection: 'column', gap: '8px'
	});

	const summaryEl = el('div', { fontSize: '11px', color: '#888', textAlign: 'center', padding: '4px' });
	actionsEl.appendChild(summaryEl);

	// Grouping row
	const grpRow = el('div', { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' });
	grpRow.appendChild(el('label', { minWidth: '70px', color: '#888' }, 'Group as'));
	const groupingEl = select([['single', 'One channel'], ['split', 'Split by YT channel']], inputStyle);
	grpRow.appendChild(groupingEl);
	actionsEl.appendChild(grpRow);

	// Name row
	const nameRowEl = el('div', { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' });
	nameRowEl.appendChild(el('label', { minWidth: '70px', color: '#888' }, 'Name'));
	const channelNameEl = input('text', inputStyle, { placeholder: 'My Channel' });
	nameRowEl.appendChild(channelNameEl);
	actionsEl.appendChild(nameRowEl);

	// Export button
	const exportBtn = document.createElement('button');
	exportBtn.textContent = 'Copy to Clipboard';
	Object.assign(exportBtn.style, { ...btnStyle, background: '#3a3', color: '#000' });
	actionsEl.appendChild(exportBtn);

	panel.appendChild(actionsEl);
	document.body.appendChild(panel);

	return {
		panel, statusEl, scanBtn, filtersEl, videoListEl, actionsEl,
		summaryEl, channelFilterEl, minDurEl, maxCountEl, groupingEl,
		channelNameEl, nameRowEl, exportBtn, selectAllBtn, selectNoneBtn, closeBtn
	};
}

function renderVideoItem(v: ScrapedVideo): HTMLElement {
	const row = el('div', {
		padding: '6px 16px', fontSize: '11px', borderBottom: '1px solid #1a1a1a',
		display: 'flex', gap: '8px', alignItems: 'center'
	});
	const cb = input('checkbox', { flexShrink: '0' });
	cb.checked = true;
	cb.dataset.id = v.id;
	row.appendChild(cb);

	const info = el('div', { flex: '1', overflow: 'hidden' });
	const titleEl = el('div', {
		whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ddd'
	}, v.title);
	titleEl.title = v.title;
	info.appendChild(titleEl);

	const meta = [v.durationText || formatSeconds(v.duration)];
	if (v.channel) meta.push(v.channel);
	if (v.uploadedText) meta.push(v.uploadedText);
	if (v.views) meta.push(v.views);
	info.appendChild(el('div', { color: '#666', fontSize: '10px', marginTop: '2px' }, meta.join(' \u00B7 ')));

	row.appendChild(info);

	row.addEventListener('mouseenter', () => { row.style.background = '#1a2a1a'; });
	row.addEventListener('mouseleave', () => { row.style.background = ''; });

	return row;
}

// ─── Main ────────────────────────────────────────────────────────────

(function main() {
	if (!window.location.hostname.includes('youtube.com')) {
		alert('Channel Surfer: This bookmarklet only works on youtube.com');
		return;
	}

	const ui = buildPanel();
	let allVideos: ScrapedVideo[] = [];
	let filteredVideos: ScrapedVideo[] = [];

	ui.closeBtn.onclick = () => ui.panel.remove();

	ui.scanBtn.onclick = async () => {
		ui.scanBtn.disabled = true;
		ui.scanBtn.textContent = 'Scrolling...';
		ui.statusEl.textContent = 'Auto-scrolling to load all videos...';

		await autoScroll((count) => {
			ui.statusEl.textContent = `Scrolling... ${count} elements loaded`;
		});

		ui.statusEl.textContent = 'Extracting video data...';
		allVideos = extractVideosFromDOM();
		ui.statusEl.textContent = `Found ${allVideos.length} videos`;

		// Populate channel filter
		const channels = [...new Set(allVideos.map((v) => v.channel).filter(Boolean))].sort();
		while (ui.channelFilterEl.options.length > 1) ui.channelFilterEl.remove(1);
		for (const ch of channels) {
			const o = document.createElement('option');
			o.value = ch;
			o.textContent = ch;
			ui.channelFilterEl.appendChild(o);
		}

		const pageChannel = document.querySelector('ytd-channel-name yt-formatted-string')?.textContent
			|| channels[0] || 'My Channel';
		ui.channelNameEl.value = pageChannel;

		ui.filtersEl.style.display = 'flex';
		ui.actionsEl.style.display = 'flex';
		ui.scanBtn.textContent = 'Re-scan Page';
		ui.scanBtn.disabled = false;

		applyFilters();
	};

	ui.channelFilterEl.onchange = applyFilters;
	ui.minDurEl.oninput = applyFilters;
	ui.maxCountEl.oninput = applyFilters;

	ui.selectAllBtn.onclick = () => {
		ui.videoListEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
			.forEach((cb) => { cb.checked = true; });
		updateSummary();
	};
	ui.selectNoneBtn.onclick = () => {
		ui.videoListEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
			.forEach((cb) => { cb.checked = false; });
		updateSummary();
	};

	ui.groupingEl.onchange = () => {
		ui.nameRowEl.style.display = ui.groupingEl.value === 'single' ? '' : 'none';
	};

	ui.exportBtn.onclick = () => {
		const selected = getSelectedVideos();
		if (selected.length === 0) {
			ui.statusEl.textContent = 'No videos selected!';
			return;
		}

		let exportData: ExportChannel[];
		if (ui.groupingEl.value === 'single') {
			const name = ui.channelNameEl.value.trim() || 'Imported Channel';
			exportData = [{
				name, slug: slugify(name), number: 0, category: 'Imported',
				sources: [{ type: 'imported', videos: selected.map(toExportVideo) }]
			}];
		} else {
			const groups = new Map<string, ScrapedVideo[]>();
			for (const v of selected) {
				const key = v.channel || 'Unknown';
				if (!groups.has(key)) groups.set(key, []);
				groups.get(key)!.push(v);
			}
			exportData = [...groups.entries()].map(([name, vids]) => ({
				name, slug: slugify(name), number: 0, category: 'Imported',
				sources: [{ type: 'imported' as const, videos: vids.map(toExportVideo) }]
			}));
		}

		const json = JSON.stringify(exportData, null, 2);
		navigator.clipboard.writeText(json).then(() => {
			ui.statusEl.textContent = `Copied! ${selected.length} videos in ${exportData.length} channel(s)`;
			ui.exportBtn.textContent = 'Copied!';
			setTimeout(() => { ui.exportBtn.textContent = 'Copy to Clipboard'; }, 2000);
		}).catch(() => {
			prompt('Copy this JSON:', json);
		});
	};

	function toExportVideo(v: ScrapedVideo): ExportVideo {
		return { id: v.id, title: v.title, duration: v.duration, thumbnail: v.thumbnail };
	}

	function applyFilters() {
		const channelFilter = ui.channelFilterEl.value;
		const minDur = parseInt(ui.minDurEl.value, 10) || 0;
		const maxCount = parseInt(ui.maxCountEl.value, 10) || 0;

		filteredVideos = allVideos.filter((v) => {
			if (channelFilter && v.channel !== channelFilter) return false;
			if (v.duration < minDur) return false;
			return true;
		});

		if (maxCount > 0) filteredVideos = filteredVideos.slice(0, maxCount);
		renderVideoList();
	}

	function renderVideoList() {
		while (ui.videoListEl.firstChild) ui.videoListEl.removeChild(ui.videoListEl.firstChild);
		for (const v of filteredVideos) {
			const item = renderVideoItem(v);
			item.querySelector('input')!.onchange = updateSummary;
			ui.videoListEl.appendChild(item);
		}
		updateSummary();
	}

	function getSelectedVideos(): ScrapedVideo[] {
		const selectedIds = new Set<string>();
		ui.videoListEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked')
			.forEach((cb) => selectedIds.add(cb.dataset.id!));
		return filteredVideos.filter((v) => selectedIds.has(v.id));
	}

	function updateSummary() {
		const selected = getSelectedVideos();
		const totalDur = selected.reduce((s, v) => s + v.duration, 0);
		ui.summaryEl.textContent = `${selected.length} selected \u00B7 ${formatSeconds(totalDur)} total`;
	}
})();
