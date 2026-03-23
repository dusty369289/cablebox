/**
 * User settings persisted in localStorage.
 */

const STORAGE_KEY = 'channel-surfer-settings';

type Settings = {
	volume: number;
	muted: boolean;
	crtEnabled: boolean;
};

const defaults: Settings = {
	volume: 80,
	muted: false,
	crtEnabled: true
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

export function getVolume(): number {
	return settings.volume;
}

export function setVolume(vol: number) {
	settings.volume = Math.max(0, Math.min(100, vol));
	saveSettings(settings);
}

export function isMuted(): boolean {
	return settings.muted;
}

export function setMuted(muted: boolean) {
	settings.muted = muted;
	saveSettings(settings);
}

export function toggleMuted() {
	settings.muted = !settings.muted;
	saveSettings(settings);
}

export function isCrtEnabled(): boolean {
	return settings.crtEnabled;
}

export function setCrtEnabled(enabled: boolean) {
	settings.crtEnabled = enabled;
	saveSettings(settings);
}

export function toggleCrt() {
	settings.crtEnabled = !settings.crtEnabled;
	saveSettings(settings);
}
