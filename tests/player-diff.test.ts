import { describe, it, expect } from 'vitest';
import { calculatePlayerDiff } from '../src/monitoring/player-diff.js';

describe('Player Diff Logic', () => {
  it('should detect joined players', () => {
    const prev = new Set(['Alice', 'Bob']);
    const curr = new Set(['Alice', 'Bob', 'Charlie']);
    const diff = calculatePlayerDiff(prev, curr);
    expect(diff.joined).toEqual(['Charlie']);
    expect(diff.left).toEqual([]);
  });

  it('should detect left players', () => {
    const prev = new Set(['Alice', 'Bob', 'Charlie']);
    const curr = new Set(['Alice']);
    const diff = calculatePlayerDiff(prev, curr);
    expect(diff.joined).toEqual([]);
    expect(diff.left).toEqual(['Bob', 'Charlie']);
  });

  it('should handle empty sets', () => {
    const diff = calculatePlayerDiff(new Set(), new Set(['Alice']));
    expect(diff.joined).toEqual(['Alice']);
    expect(diff.left).toEqual([]);
  });
});