/**
 * Deterministic pseudo-random service for generating demo data.
 * The same seed always produces the same sequence, so tests can pin a seed
 * while every real sign-in gets a fresh one from `randomSeed()`.
 */
export type RandomService = {
  /** Uniform number in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  /** One element of a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** True with the given probability (0..1). */
  chance(probability: number): boolean;
  /** `count` distinct elements, in random order. */
  sample<T>(items: readonly T[], count: number): T[];
  /** A multiple of `step` in [min, max], e.g. a plate-loadable weight. */
  step(min: number, max: number, step: number): number;
};

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

export function createRandomService(seed: number | string = randomSeed()): RandomService {
  let state = (typeof seed === 'number' ? Math.floor(seed) : hashString(seed)) >>> 0;

  // mulberry32: tiny, fast and plenty good for sample data.
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };

  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));

  return {
    next,
    int,
    pick: (items) => items[int(0, items.length - 1)],
    chance: (probability) => next() < probability,
    sample: (items, count) => {
      const pool = [...items];
      for (let index = pool.length - 1; index > 0; index--) {
        const swap = int(0, index);
        [pool[index], pool[swap]] = [pool[swap], pool[index]];
      }
      return pool.slice(0, Math.min(count, pool.length));
    },
    step: (min, max, step) => {
      const steps = Math.floor((max - min) / step);
      return roundTo(min + int(0, steps) * step);
    },
  };
}

/** Avoids float artifacts like 12.700000000000001 when stepping by 0.5 or 2.5. */
function roundTo(value: number) {
  return Math.round(value * 100) / 100;
}

/** FNV-1a, so string seeds like a username spread well over the state space. */
function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
