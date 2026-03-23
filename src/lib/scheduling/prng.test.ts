import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, seededShuffle } from './prng.js';

describe('mulberry32', () => {
	it('produces deterministic output for the same seed', () => {
		const rng1 = mulberry32(42);
		const rng2 = mulberry32(42);
		const seq1 = Array.from({ length: 10 }, () => rng1());
		const seq2 = Array.from({ length: 10 }, () => rng2());
		expect(seq1).toEqual(seq2);
	});

	it('produces different output for different seeds', () => {
		const rng1 = mulberry32(42);
		const rng2 = mulberry32(43);
		const val1 = rng1();
		const val2 = rng2();
		expect(val1).not.toEqual(val2);
	});

	it('produces values in [0, 1)', () => {
		const rng = mulberry32(12345);
		for (let i = 0; i < 1000; i++) {
			const val = rng();
			expect(val).toBeGreaterThanOrEqual(0);
			expect(val).toBeLessThan(1);
		}
	});
});

describe('hashString', () => {
	it('produces the same hash for the same string', () => {
		expect(hashString('test-channel')).toBe(hashString('test-channel'));
	});

	it('produces different hashes for different strings', () => {
		expect(hashString('channel-a')).not.toBe(hashString('channel-b'));
	});

	it('returns a non-negative integer', () => {
		const hash = hashString('anything');
		expect(hash).toBeGreaterThanOrEqual(0);
		expect(Number.isInteger(hash)).toBe(true);
	});
});

describe('seededShuffle', () => {
	const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

	it('produces the same order for the same seed', () => {
		const a = seededShuffle(items, 42);
		const b = seededShuffle(items, 42);
		expect(a).toEqual(b);
	});

	it('produces different order for different seeds', () => {
		const a = seededShuffle(items, 42);
		const b = seededShuffle(items, 99);
		expect(a).not.toEqual(b);
	});

	it('does not mutate the input array', () => {
		const original = [...items];
		seededShuffle(items, 42);
		expect(items).toEqual(original);
	});

	it('contains all original elements', () => {
		const shuffled = seededShuffle(items, 42);
		expect(shuffled.sort((a, b) => a - b)).toEqual(items);
	});

	it('handles single-element array', () => {
		expect(seededShuffle([1], 42)).toEqual([1]);
	});

	it('handles empty array', () => {
		expect(seededShuffle([], 42)).toEqual([]);
	});
});
