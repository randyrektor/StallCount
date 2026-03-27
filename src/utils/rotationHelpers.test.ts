import { describe, it, expect } from 'vitest';
import {
  applySubstitutionToQueue,
  removePlayerFromRotationQueue,
  preserveRotationIndexAfterReorder,
  rawIndexAfterReorderPreservingLineSlice,
  mergeRosterFromGenderQueues,
  getGenderPattern,
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
  it('AAB-MW uses two 4-3 then one 3-4 per cycle', () => {
    expect(getGenderPattern(0, 'AAB-MW')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(1, 'AAB-MW')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(2, 'AAB-MW')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(3, 'AAB-MW')).toEqual({ men: 4, women: 3 });
  });

  it('AAB-WM uses two 3-4 then one 4-3 per cycle', () => {
    expect(getGenderPattern(0, 'AAB-WM')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(1, 'AAB-WM')).toEqual({ men: 3, women: 4 });
    expect(getGenderPattern(2, 'AAB-WM')).toEqual({ men: 4, women: 3 });
    expect(getGenderPattern(3, 'AAB-WM')).toEqual({ men: 3, women: 4 });
  });

  it('every mode sums to lineupSize for sizes 4–7', () => {
    const modes = [
      'ABBA',
      'AAB-MW',
      'AAB-WM',
      '4-3',
      '3-4',
      'MEN',
      'WOMEN',
    ] as const;
    const sizes: LineupSize[] = [4, 5, 6, 7];
    for (const s of sizes) {
      for (const m of modes) {
        for (let i = 0; i < 12; i++) {
          const { men, women } = getGenderPattern(i, m, s);
          expect(men + women).toBe(s);
        }
      }
    }
  });

  it('scales open-heavy and women-heavy splits for 5v5', () => {
    expect(getGenderPattern(0, '4-3', 5)).toEqual({ men: 3, women: 2 });
    expect(getGenderPattern(0, '3-4', 5)).toEqual({ men: 2, women: 3 });
    expect(getGenderPattern(0, 'MEN', 5)).toEqual({ men: 5, women: 0 });
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
