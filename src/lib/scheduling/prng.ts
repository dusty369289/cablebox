/**
 * Mulberry32 — a simple seeded 32-bit PRNG.
 * Given the same seed, always produces the same sequence.
 * Used to deterministically shuffle video order per channel.
 */
export function mulberry32(seed: number): () => number {
	let state = seed | 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Simple string hash (djb2) to convert a channel slug into a numeric seed.
 */
export function hashString(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
	}
	return hash >>> 0; // ensure unsigned
}

/**
 * Deterministic Fisher-Yates shuffle using a seeded PRNG.
 * Returns a new array — does not mutate the input.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
	const result = [...items];
	const rand = mulberry32(seed);
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
