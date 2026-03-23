/**
 * User settings persisted in localStorage.
 */

const STORAGE_KEY = 'cablebox-settings';

export type Theme = 'cable-90s' | 'phosphor' | 'material';

export const THEMES: { id: Theme; label: string }[] = [
	{ id: 'cable-90s', label: '90s Cable' },
	{ id: 'phosphor', label: 'Phosphor' },
	{ id: 'material', label: 'Material' }
];

type Settings = {
	volume: number;
	muted: boolean;
	crtEnabled: boolean;
	theme: Theme;
	hiddenDefaults: string[]; // slugs of hidden default channels
};

const defaults: Settings = {
	volume: 80,
	muted: false,
	crtEnabled: true,
	theme: 'cable-90s',
	hiddenDefaults: []
};

function loadSettings(): Settings {
	if (typeof localStorage === 'undefined') return { ...defaults };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...defaults };
		return { ...defaults, ...JSON.parse(raw) };
	} catch {
		return { ...defaults };
	}
}

function saveSettings(s: Settings) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

let settings = $state<Settings>(loadSettings());

export function getVolume(): number { return settings.volume; }
export function setVolume(vol: number) {
	settings.volume = Math.max(0, Math.min(100, vol));
	saveSettings(settings);
}

export function isMuted(): boolean { return settings.muted; }
export function setMuted(muted: boolean) { settings.muted = muted; saveSettings(settings); }
export function toggleMuted() { settings.muted = !settings.muted; saveSettings(settings); }

export function isCrtEnabled(): boolean { return settings.crtEnabled; }
export function setCrtEnabled(enabled: boolean) { settings.crtEnabled = enabled; saveSettings(settings); }
export function toggleCrt() { settings.crtEnabled = !settings.crtEnabled; saveSettings(settings); }

export function getTheme(): Theme { return settings.theme; }
export function setTheme(theme: Theme) {
	settings.theme = theme;
	settings.crtEnabled = theme !== 'material'; // Material disables CRT by default
	saveSettings(settings);
	applyTheme(theme);
}

export function cycleTheme() {
	const idx = THEMES.findIndex((t) => t.id === settings.theme);
	const next = THEMES[(idx + 1) % THEMES.length];
	setTheme(next.id);
}

export function getHiddenDefaults(): string[] { return settings.hiddenDefaults; }
export function isDefaultHidden(slug: string): boolean { return settings.hiddenDefaults.includes(slug); }
export function toggleDefaultChannel(slug: string) {
	if (settings.hiddenDefaults.includes(slug)) {
		settings.hiddenDefaults = settings.hiddenDefaults.filter((s) => s !== slug);
	} else {
		settings.hiddenDefaults = [...settings.hiddenDefaults, slug];
	}
	saveSettings(settings);
}

/** Apply theme to the document root. Call on init and on change. */
export function applyTheme(theme?: Theme) {
	if (typeof document === 'undefined') return;
	document.documentElement.dataset.theme = theme || settings.theme;
}
