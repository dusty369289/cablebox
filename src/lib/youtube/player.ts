import type { YTPlayer, YTPlayerOptions, YTPlayerEvent } from './types.js';
import { PlayerState } from './types.js';

let apiLoaded = false;
let apiLoading = false;
const apiReadyCallbacks: (() => void)[] = [];

/**
 * Load the YouTube IFrame Player API script.
 * Safe to call multiple times — only loads once. Uses a callback queue
 * to avoid the race condition of overwriting onYouTubeIframeAPIReady.
 */
export function loadYouTubeAPI(): Promise<void> {
	if (apiLoaded) return Promise.resolve();

	return new Promise<void>((resolve) => {
		apiReadyCallbacks.push(resolve);

		if (apiLoading) return; // Script already loading, just queued our callback
		apiLoading = true;

		window.onYouTubeIframeAPIReady = () => {
			apiLoaded = true;
			for (const cb of apiReadyCallbacks) cb();
			apiReadyCallbacks.length = 0;
		};

		const script = document.createElement('script');
		script.src = 'https://www.youtube.com/iframe_api';
		script.async = true;
		document.head.appendChild(script);
	});
}

export type PlayerCallbacks = {
	onReady?: () => void;
	onStateChange?: (state: number) => void;
	onError?: (errorCode: number) => void;
	onVideoEnd?: () => void;
};

/**
 * Create a YouTube player instance inside the given element.
 */
export async function createPlayer(
	elementId: string,
	callbacks: PlayerCallbacks = {}
): Promise<YTPlayer> {
	await loadYouTubeAPI();

	return new Promise<YTPlayer>((resolve) => {
		const options: YTPlayerOptions = {
			width: '100%',
			height: '100%',
			playerVars: {
				autoplay: 1,
				controls: 0,
				disablekb: 1,
				rel: 0,
				enablejsapi: 1,
				iv_load_policy: 3
			},
			events: {
				onReady: (event: YTPlayerEvent) => {
					callbacks.onReady?.();
					resolve(event.target);
				},
				onStateChange: (event: YTPlayerEvent) => {
					callbacks.onStateChange?.(event.data);
					if (event.data === PlayerState.ENDED) {
						callbacks.onVideoEnd?.();
					}
				},
				onError: (event: YTPlayerEvent) => {
					callbacks.onError?.(event.data);
				}
			}
		};

		new window.YT.Player(elementId, options);
	});
}
