/**
 * Reactive clock that ticks every second.
 * Pauses when tab is hidden to save battery.
 * Resyncs to real time when tab becomes visible.
 */

let now = $state(Math.floor(Date.now() / 1000));
let interval: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;

function tick() {
	now = Math.floor(Date.now() / 1000);
}

export function startClock() {
	if (interval) return;
	tick();
	interval = setInterval(tick, 1000);

	// Pause in background, resync on focus
	if (typeof document !== 'undefined' && !visibilityHandler) {
		visibilityHandler = () => {
			if (document.hidden) {
				if (interval) { clearInterval(interval); interval = null; }
			} else {
				tick(); // Resync immediately
				if (!interval) interval = setInterval(tick, 1000);
			}
		};
		document.addEventListener('visibilitychange', visibilityHandler);
	}
}

export function stopClock() {
	if (interval) {
		clearInterval(interval);
		interval = null;
	}
	if (visibilityHandler) {
		document.removeEventListener('visibilitychange', visibilityHandler);
		visibilityHandler = null;
	}
}

export function getCurrentTime(): number {
	return now;
}
