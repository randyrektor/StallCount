import { describe, it, expect } from 'vitest';
import {
  applySubstitutionToQueue,
  removePlayerFromRotationQueue,
  preserveRotationIndexAfterReorder,
  rawIndexAfterReorderPreservingLineSlice,
  mergeRosterFromGenderQueues,
  getGenderPattern,
  getCycleLengthForMode,
  splitCycleApplies,
  isSplitCycleAvailable,
  clampOpenCount,
  insertPlayerAtGenderEndOfRoster,
} from './rotationHelpers';
import type { Player, LineupSize, SplitCycle } from '../types';

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
  it('AAB with 4 open uses two 4-3 then one 3-4 per cycle', () => {
    expect(getGenderPattern(0, 7, 4, 'AAB')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(1, 7, 4, 'AAB')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(2, 7, 4, 'AAB')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(3, 7, 4, 'AAB')).toEqual({ men: 4, women: 3 });
  });

  it('AAB with 3 open uses two 3-4 then one 4-3 per cycle', () => {
    expect(getGenderPattern(0, 7, 3, 'AAB')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(1, 7, 3, 'AAB')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(2, 7, 3, 'AAB')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(3, 7, 3, 'AAB')).toEqual({ men: 3, women: 4 });
  });

  it('ABBA with 4 open alternates 4-3 / 3-4 as A B B A', () => {
    expect(getGenderPattern(0, 7, 4, 'ABBA')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(1, 7, 4, 'ABBA')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(2, 7, 4, 'ABBA')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(3, 7, 4, 'ABBA')).toEqual({ men: 4, women: 3 });
  });

  it('ABBA with 3 open starts women-heavy (A is 3-4)', () => {
    expect(getGenderPattern(0, 7, 3, 'ABBA')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(1, 7, 3, 'ABBA')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(2, 7, 3, 'ABBA')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(3, 7, 3, 'ABBA')).toEqual({ men: 3, women: 4 });
  });

  it('same keeps a static split, including 5:1 pickup and all-open / all-women', () => {
    expect(getGenderPattern(0, 7, 4, 'same')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(1, 7, 4, 'same')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(0, 6, 5, 'same')).toEqual({ men: 5, women: 1 });
    expect(getGenderPattern(0, 5, 5, 'same')).toEqual({ men: 5, women: 0 });
    expect(getGenderPattern(0, 5, 0, 'same')).toEqual({ men: 0, women: 5 });
  });

  it('ABBA on 6 with 5 open mirrors 5:1 and 1:5', () => {
    expect(getGenderPattern(0, 6, 5, 'ABBA')).toEqual({ men: 5, women: 1 });
    expect(getGenderPattern(1, 6, 5, 'ABBA')).toEqual({ men: 1, women: 5 });
    expect(getGenderPattern(2, 6, 5, 'ABBA')).toEqual({ men: 1, women: 5 });
    expect(getGenderPattern(3, 6, 5, 'ABBA')).toEqual({ men: 5, women: 1 });
  });

  it('even split ignores ABBA/AAB (mirror would be identical)', () => {
    expect(getGenderPattern(0, 6, 3, 'ABBA')).toEqual({ men: 3, women: 3 });
    expect(getGenderPattern(1, 6, 3, 'ABBA')).toEqual({ men: 3, women: 3 });
    expect(splitCycleApplies(6, 3)).toBe(false);
    expect(splitCycleApplies(7, 4)).toBe(true);
  });

  it('all-open / all-women stays static for ABBA and AAB (mens/ladies night)', () => {
    expect(getGenderPattern(0, 4, 4, 'ABBA')).toEqual({ men: 4, women: 0 });
    expect(getGenderPattern(1, 4, 4, 'ABBA')).toEqual({ men: 4, women: 0 });
    expect(getGenderPattern(2, 4, 4, 'AAB')).toEqual({ men: 4, women: 0 });
    expect(getGenderPattern(2, 7, 0, 'AAB')).toEqual({ men: 0, women: 7 });
  });

  it('isSplitCycleAvailable greys out cycles that do not change the line', () => {
    const mixed: SplitCycle[] = ['same', 'ABBA', 'AAB'];
    for (const c of mixed) {
      expect(isSplitCycleAvailable(7, 4, c)).toBe(true);
      expect(isSplitCycleAvailable(6, 5, c)).toBe(true);
    }
    expect(isSplitCycleAvailable(6, 3, 'same')).toBe(true);
    expect(isSplitCycleAvailable(6, 3, 'ABBA')).toBe(false);
    expect(isSplitCycleAvailable(6, 3, 'AAB')).toBe(false);
    expect(isSplitCycleAvailable(4, 4, 'same')).toBe(true);
    expect(isSplitCycleAvailable(4, 4, 'AAB')).toBe(false);
    expect(isSplitCycleAvailable(4, 4, 'ABBA')).toBe(false);
    expect(isSplitCycleAvailable(7, 0, 'same')).toBe(true);
    expect(isSplitCycleAvailable(7, 0, 'AAB')).toBe(false);
    expect(isSplitCycleAvailable(7, 0, 'ABBA')).toBe(false);
  });

  it('every size, open count, and cycle sums to lineupSize', () => {
    const sizes: LineupSize[] = [4, 5, 6, 7];
    const cycles: SplitCycle[] = ['same', 'ABBA', 'AAB'];
    for (const s of sizes) {
      for (let open = 0; open <= s; open++) {
        for (const cycle of cycles) {
          for (let i = 0; i < 12; i++) {
            const { men, women } = getGenderPattern(i, s, open, cycle);
            expect(men + women).toBe(s);
          }
        }
      }
    }
  });

  it('clamps startingOpen into 0…N', () => {
    expect(clampOpenCount(-1, 7)).toBe(0);
    expect(clampOpenCount(9, 7)).toBe(7);
    expect(getGenderPattern(0, 7, 99, 'same')).toEqual({ men: 7, women: 0 });
  });

  it('handles negative lineIndex (e.g. after history rewind) consistently', () => {
    expect(getGenderPattern(-1, 7, 4, 'ABBA')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(-4, 7, 4, 'ABBA')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(-3, 7, 4, 'AAB')).toEqual({ men: 4, women: 3 });
  });
});

describe('getCycleLengthForMode', () => {
  it('returns 4 for ABBA, 3 for AAB, 1 for same', () => {
    expect(getCycleLengthForMode('ABBA')).toBe(4);
    expect(getCycleLengthForMode('AAB')).toBe(3);
    expect(getCycleLengthForMode('same')).toBe(1);
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
