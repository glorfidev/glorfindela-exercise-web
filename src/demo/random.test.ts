import { describe, expect, it } from 'vitest';
import { createRandomService, randomSeed } from './random';

describe('createRandomService', () => {
  it('produces the same sequence for the same seed and different ones for different seeds', () => {
    const sequence = (seed: number | string) => {
      const random = createRandomService(seed);
      return Array.from({ length: 20 }, random.next);
    };
    expect(sequence(42)).toEqual(sequence(42));
    expect(sequence('alex')).toEqual(sequence('alex'));
    expect(sequence(42)).not.toEqual(sequence(43));
    expect(sequence('alex')).not.toEqual(sequence('alexa'));
  });

  it('stays within [0, 1) and spreads values out', () => {
    const random = createRandomService(7);
    const values = Array.from({ length: 1000 }, random.next);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(new Set(values.map((value) => Math.floor(value * 10))).size).toBe(10);
  });

  it('draws integers covering both inclusive bounds', () => {
    const random = createRandomService(7);
    const values = Array.from({ length: 200 }, () => random.int(2, 5));
    expect(new Set(values)).toEqual(new Set([2, 3, 4, 5]));
  });

  it('picks only from the given list', () => {
    const random = createRandomService(7);
    const picked = new Set(Array.from({ length: 100 }, () => random.pick(['a', 'b', 'c'])));
    expect(picked).toEqual(new Set(['a', 'b', 'c']));
  });

  it('honors chance boundaries', () => {
    const random = createRandomService(7);
    expect(Array.from({ length: 50 }, () => random.chance(0)).some(Boolean)).toBe(false);
    expect(Array.from({ length: 50 }, () => random.chance(1)).every(Boolean)).toBe(true);
  });

  it('samples distinct elements without changing the input', () => {
    const random = createRandomService(7);
    const items = [1, 2, 3, 4, 5];
    const sampled = random.sample(items, 3);
    expect(sampled).toHaveLength(3);
    expect(new Set(sampled).size).toBe(3);
    expect(sampled.every((item) => items.includes(item))).toBe(true);
    expect(random.sample(items, 99)).toHaveLength(5);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it('steps to clean multiples without float artifacts', () => {
    const random = createRandomService(7);
    for (let draw = 0; draw < 100; draw++) {
      const value = random.step(40, 100, 2.5);
      expect(value).toBeGreaterThanOrEqual(40);
      expect(value).toBeLessThanOrEqual(100);
      expect((value * 10) % 25).toBe(0);
      expect(String(value)).toMatch(/^\d+(\.\d{1,2})?$/);
    }
  });

  it('seeds itself randomly by default', () => {
    expect(randomSeed()).toBeGreaterThanOrEqual(0);
    expect(randomSeed()).toBeLessThan(2 ** 32);
  });
});
