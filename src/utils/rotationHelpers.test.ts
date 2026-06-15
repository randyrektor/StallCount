import { describe, it, expect } from 'vitest';
import {
  applySubstitutionToQueue,
  removePlayerFromRotationQueue,
  preserveRotationIndexAfterReorder,
  rawIndexAfterReorderPreservingLineSlice,
  mergeRosterFromGenderQueues,
  getGenderPattern,
  getCycleLengthForMode,
  modeHasStartingPoint,
  insertPlayerAtGenderEndOfRoster,
} from './rotationHelpers';
import type { Player, LineupSize } from '../types';

const p = (name: string, gender: 'O' | 'W', n = 0): Player => ({
  uuid: name,
  name,
  gender,
  number: n,
});

describe('applySubstitutionToQueue', () => {
  it('puts sub-in at sub-out slot and moves sub-out to end when sub-in is new to queue', () => {
    const q = [p('A', 'O'), p('B', 'O'), p('C', 'O')];
    const next = applySubstitutionToQueue(q, 'B', p('Z', 'O'));
    expect(next.map((x) => x.name)).toEqual(['A', 'Z', 'C', 'B']);
  });

  it('swaps sub-in and sub-out when both are in the queue', () => {
    const q = [p('A', 'O'), p('B', 'O'), p('C', 'O'), p('D', 'O')];
    const next = applySubstitutionToQueue(q, 'B', p('D', 'O'));
    expect(next.map((x) => x.name)).toEqual(['A', 'D', 'C', 'B']);
  });
});

describe('removePlayerFromRotationQueue', () => {
  it('compacts the list and keeps the same window leader when they remain', () => {
    const q = [p('A', 'O'), p('B', 'O'), p('C', 'O'), p('D', 'O')];
    const r = removePlayerFromRotationQueue(q, 0, 'C');
    expect(r.queue.map((x) => x.name)).toEqual(['A', 'B', 'D']);
    expect(r.rawIndex).toBe(0);
    expect(r.queue[r.rawIndex % r.queue.length].name).toBe('A');
  });

  it('when the window leader is removed, anchors to the next player in cycle order', () => {
    const q = [p('A', 'O'), p('B', 'O'), p('C', 'O'), p('D', 'O')];
    const r = removePlayerFromRotationQueue(q, 0, 'A');
    expect(r.queue.map((x) => x.name)).toEqual(['B', 'C', 'D']);
    expect(r.queue[r.rawIndex % r.queue.length].name).toBe('B');
  });

  it('no-op when uuid is not in queue', () => {
    const q = [p('A', 'O'), p('B', 'O')];
    const r = removePlayerFromRotationQueue(q, 3, 'Z');
    expect(r.queue.map((x) => x.name)).toEqual(['A', 'B']);
    expect(r.rawIndex).toBe(3);
  });
});

describe('rawIndexAfterReorderPreservingLineSlice', () => {
  it('finds rotation start so slice matches after bench swap', () => {
    const oldQ = [p('A', 'O'), p('B', 'O'), p('C', 'O'), p('D', 'O'), p('E', 'O')];
    const newQ = [p('A', 'O'), p('B', 'O'), p('C', 'O'), p('D', 'O'), p('E', 'O')];
    [newQ[3], newQ[4]] = [newQ[4], newQ[3]];
    const desired = [p('A', 'O'), p('B', 'O'), p('C', 'O')];
    const raw = rawIndexAfterReorderPreservingLineSlice(0, oldQ, newQ, desired, 3);
    expect(raw % newQ.length).toBe(0);
  });
});

describe('preserveRotationIndexAfterReorder', () => {
  it('keeps same anchor player at effective index after reorder', () => {
    const oldQ = [p('A', 'O'), p('B', 'O'), p('C', 'O')];
    const newQ = [p('C', 'O'), p('A', 'O'), p('B', 'O')];
    const oldIdx = 4;
    const next = preserveRotationIndexAfterReorder(oldQ, newQ, oldIdx);
    const L = newQ.length;
    const effective = ((next % L) + L) % L;
    expect(newQ[effective].name).toBe('B');
  });
});

describe('getGenderPattern', () => {
  it('AAB + starts on O uses two 4-3 then one 3-4 per cycle', () => {
    expect(getGenderPattern(0, 'AAB', 7, 'O')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(1, 'AAB', 7, 'O')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(2, 'AAB', 7, 'O')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(3, 'AAB', 7, 'O')).toEqual({ men: 4, women: 3 });
  });

  it('AAB + starts on W uses two 3-4 then one 4-3 per cycle', () => {
    expect(getGenderPattern(0, 'AAB', 7, 'W')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(1, 'AAB', 7, 'W')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(2, 'AAB', 7, 'W')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(3, 'AAB', 7, 'W')).toEqual({ men: 3, women: 4 });
  });

  it('ABBA + starts on O alternates open-heavy / women-heavy as A B B A', () => {
    expect(getGenderPattern(0, 'ABBA', 7, 'O')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(1, 'ABBA', 7, 'O')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(2, 'ABBA', 7, 'O')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(3, 'ABBA', 7, 'O')).toEqual({ men: 4, women: 3 });
  });

  it('ABBA + starts on W swaps which gender is A (women-heavy first)', () => {
    expect(getGenderPattern(0, 'ABBA', 7, 'W')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(1, 'ABBA', 7, 'W')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(2, 'ABBA', 7, 'W')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(3, 'ABBA', 7, 'W')).toEqual({ men: 3, women: 4 });
  });

  it('startsOn is ignored for non-cyclic modes', () => {
    expect(getGenderPattern(0, '4-3', 7, 'W')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(0, '3-4', 7, 'O')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(0, 'MEN', 5, 'W')).toEqual({ men: 5, women: 0 });
    expect(getGenderPattern(0, 'WOMEN', 5, 'O')).toEqual({ men: 0, women: 5 });
  });

  it('every mode sums to lineupSize for sizes 4–7 and both starts-on values', () => {
    const modes = ['ABBA', 'AAB', '4-3', '3-4', 'MEN', 'WOMEN'] as const;
    const sizes: LineupSize[] = [4, 5, 6, 7];
    const starts = ['O', 'W'] as const;
    for (const s of sizes) {
      for (const m of modes) {
        for (const start of starts) {
          for (let i = 0; i < 12; i++) {
            const { men, women } = getGenderPattern(i, m, s, start);
            expect(men + women).toBe(s);
          }
        }
      }
    }
  });

  it('scales open-heavy and women-heavy splits for 5v5', () => {
    expect(getGenderPattern(0, '4-3', 5)).toEqual({ men: 3, women: 2 });
    expect(getGenderPattern(0, '3-4', 5)).toEqual({ men: 2, women: 3 });
    expect(getGenderPattern(0, 'MEN', 5)).toEqual({ men: 5, women: 0 });
    expect(getGenderPattern(0, 'ABBA', 5, 'O')).toEqual({ men: 3, women: 2 });
    expect(getGenderPattern(0, 'ABBA', 5, 'W')).toEqual({ men: 2, women: 3 });
  });

  it('handles negative lineIndex (e.g. after history rewind) consistently', () => {
    expect(getGenderPattern(-1, 'ABBA', 7, 'O')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(-4, 'ABBA', 7, 'O')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(-3, 'AAB', 7, 'O')).toEqual({ men: 4, women: 3 });
  });
});

describe('getCycleLengthForMode', () => {
  it('returns 4 for ABBA, 3 for AAB, 1 otherwise', () => {
    expect(getCycleLengthForMode('ABBA')).toBe(4);
    expect(getCycleLengthForMode('AAB')).toBe(3);
    expect(getCycleLengthForMode('4-3')).toBe(1);
    expect(getCycleLengthForMode('3-4')).toBe(1);
    expect(getCycleLengthForMode('MEN')).toBe(1);
    expect(getCycleLengthForMode('WOMEN')).toBe(1);
  });
});

describe('modeHasStartingPoint', () => {
  it('is true only for cyclic modes', () => {
    expect(modeHasStartingPoint('ABBA')).toBe(true);
    expect(modeHasStartingPoint('AAB')).toBe(true);
    expect(modeHasStartingPoint('4-3')).toBe(false);
    expect(modeHasStartingPoint('3-4')).toBe(false);
    expect(modeHasStartingPoint('MEN')).toBe(false);
    expect(modeHasStartingPoint('WOMEN')).toBe(false);
  });
});

describe('insertPlayerAtGenderEndOfRoster', () => {
  it('inserts open before first women-matching player', () => {
    const r = [p('A', 'O'), p('B', 'O'), p('M', 'W')];
    const next = insertPlayerAtGenderEndOfRoster(r, p('C', 'O'));
    expect(next.map((x) => x.name)).toEqual(['A', 'B', 'C', 'M']);
  });

  it('appends women at end of roster', () => {
    const r = [p('A', 'O'), p('M', 'W')];
    const next = insertPlayerAtGenderEndOfRoster(r, p('N', 'W'));
    expect(next.map((x) => x.name)).toEqual(['A', 'M', 'N']);
  });
});

describe('mergeRosterFromGenderQueues', () => {
  it('orders open then women with extras after each group', () => {
    const prev = [p('A', 'O'), p('X', 'O'), p('M', 'W'), p('Y', 'W')];
    const openQ = [p('A', 'O')];
    const womenQ = [p('M', 'W')];
    const merged = mergeRosterFromGenderQueues(openQ, womenQ, prev);
    expect(merged.map((x) => x.name)).toEqual(['A', 'X', 'M', 'Y']);
  });
});
