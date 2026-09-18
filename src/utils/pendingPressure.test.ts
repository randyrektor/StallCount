import { describe, it, expect } from 'vitest';
import type { LineupSize, Player, SplitCycle } from '../types';
import { getLine } from './lineRotation';
import {
  getGenderPattern,
  isSplitCycleAvailable,
  clampOpenCount,
  assignNumbersByGender,
  DEFAULT_STARTING_OPEN,
} from './rotationHelpers';
import {
  partitionPendingForLineChange,
  restoreActivatedPendingAfterUndo,
  appendPlayerToQueue,
} from './rosterManagerLogic';

const SIZES: LineupSize[] = [4, 5, 6, 7];
const CYCLES: SplitCycle[] = ['same', 'ABBA', 'AAB'];

const o = (name: string): Player => ({
  uuid: `o-${name}`,
  name,
  gender: 'O',
  number: 0,
});
const w = (name: string): Player => ({
  uuid: `w-${name}`,
  name,
  gender: 'W',
  number: 0,
});

function team(prefix: 'O' | 'W', n: number): Player[] {
  const make = prefix === 'O' ? o : w;
  return Array.from({ length: n }, (_, i) => make(`${prefix}${i + 1}`));
}

function ids(players: Player[]): string[] {
  return players.map((p) => p.uuid);
}

function unique(players: Player[]): boolean {
  const list = players.map((p) => p.uuid);
  return new Set(list).size === list.length;
}

type Game = {
  openQ: Player[];
  womenQ: Player[];
  openIndex: number;
  womenIndex: number;
  lineIndex: number;
  lineupSize: LineupSize;
  startingOpen: number;
  splitCycle: SplitCycle;
  pending: Player[];
};

function patternOf(g: Game) {
  return getGenderPattern(g.lineIndex, g.lineupSize, g.startingOpen, g.splitCycle);
}

function lineOf(g: Game): Player[] {
  const p = patternOf(g);
  return getLine(g.openQ, g.womenQ, p, g.openIndex, g.womenIndex);
}

function nextLineOf(g: Game): Player[] {
  const cur = patternOf(g);
  const nxt = getGenderPattern(
    g.lineIndex + 1,
    g.lineupSize,
    g.startingOpen,
    g.splitCycle
  );
  return getLine(
    g.openQ,
    g.womenQ,
    nxt,
    g.openIndex + cur.men,
    g.womenIndex + cur.women
  );
}

function place(g: Game): Game {
  const placed = partitionPendingForLineChange({
    pendingPlayers: g.pending,
    masterOpenQueue: g.openQ,
    masterWomenQueue: g.womenQ,
    openIndex: g.openIndex,
    womenIndex: g.womenIndex,
    lineIndex: g.lineIndex,
    startingOpen: g.startingOpen,
    splitCycle: g.splitCycle,
    lineupSize: g.lineupSize,
  });
  return {
    ...g,
    openQ: placed.masterOpenQueue,
    womenQ: placed.masterWomenQueue,
    openIndex: placed.openIndex,
    womenIndex: placed.womenIndex,
    pending: placed.stillPending,
  };
}

/** Mirror of App.tsx late arrival. */
function arrive(g: Game, player: Player): { before: Player[]; after: Game } {
  const before = lineOf(g);
  const after = place({ ...g, pending: [...g.pending, player] });
  return { before, after };
}

/** Mirror of App.tsx recordPoint: rotate, then try to append pending. */
function score(g: Game): { fielded: Player[]; after: Game } {
  const p = patternOf(g);
  const fielded = lineOf(g);
  const rotated: Game = {
    ...g,
    openIndex: g.openIndex + p.men,
    womenIndex: g.womenIndex + p.women,
    lineIndex: g.lineIndex + 1,
  };
  const newCurrent = lineOf(rotated);
  const after = place(rotated);
  expect(ids(lineOf(after))).toEqual(ids(newCurrent));
  return { fielded, after };
}

/** Mid-game ratio change: indices stay; then pending may join if last # is off the new current line. */
function changePattern(
  g: Game,
  lineupSize: LineupSize,
  startingOpen: number,
  splitCycle: SplitCycle
): { lineAfterPattern: Player[]; after: Game } {
  const next: Game = {
    ...g,
    lineupSize,
    startingOpen: clampOpenCount(startingOpen, lineupSize),
    splitCycle: isSplitCycleAvailable(lineupSize, startingOpen, splitCycle)
      ? splitCycle
      : 'same',
  };
  const lineAfterPattern = lineOf(next);
  const after = place(next);
  expect(ids(lineOf(after))).toEqual(ids(lineAfterPattern));
  return { lineAfterPattern, after };
}

function assertQueueIntegrity(g: Game) {
  expect(unique([...g.openQ, ...g.womenQ, ...g.pending])).toBe(true);
  const pendingIds = new Set(ids(g.pending));
  expect(g.openQ.some((p) => pendingIds.has(p.uuid))).toBe(false);
  expect(g.womenQ.some((p) => pendingIds.has(p.uuid))).toBe(false);
  expect(g.openQ.every((p) => p.gender === 'O')).toBe(true);
  expect(g.womenQ.every((p) => p.gender === 'W')).toBe(true);
}

function assertArrivalInvariants(beforeLine: Player[], before: Game, after: Game, player: Player) {
  assertQueueIntegrity(after);
  expect(ids(lineOf(after))).toEqual(ids(beforeLine));
  const inOpen = after.openQ.some((p) => p.uuid === player.uuid);
  const inWomen = after.womenQ.some((p) => p.uuid === player.uuid);
  const isPending = after.pending.some((p) => p.uuid === player.uuid);
  expect(Number(inOpen) + Number(inWomen) + Number(isPending)).toBe(1);
  if (inOpen) {
    expect(after.openQ.at(-1)?.uuid).toBe(player.uuid);
    expect(lineOf(after).some((p) => p.uuid === player.uuid)).toBe(false);
  }
  if (inWomen) {
    expect(after.womenQ.at(-1)?.uuid).toBe(player.uuid);
    expect(lineOf(after).some((p) => p.uuid === player.uuid)).toBe(false);
  }
  if (isPending) {
    expect(ids(after.openQ)).toEqual(ids(before.openQ));
    expect(ids(after.womenQ)).toEqual(ids(before.womenQ));
  }
}

function seed(nO: number, nW: number, g: Omit<Game, 'openQ' | 'womenQ' | 'pending'>): Game {
  return {
    ...g,
    openQ: team('O', nO),
    womenQ: team('W', nW),
    pending: [],
  };
}

describe('pending pressure: append-at-end invariants', () => {
  it('8 open on mens night, first point: 9th joins at the end, current 7 unchanged', () => {
    const g = seed(8, 0, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 7,
      splitCycle: 'same',
    });
    const before = lineOf(g);
    const { after } = arrive(g, o('Late'));
    expect(after.pending).toEqual([]);
    expect(after.openQ.map((p) => p.name).at(-1)).toBe('Late');
    expect(ids(lineOf(after))).toEqual(ids(before));
    expect(nextLineOf(after).some((p) => p.name === 'Late')).toBe(true);
  });

  it('8 open on mens night after one point (wrap): 9th stays pending', () => {
    let g = seed(8, 0, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 7,
      splitCycle: 'same',
    });
    g = score(g).after;
    const { after } = arrive(g, o('Late'));
    expect(after.pending.map((p) => p.name)).toEqual(['Late']);
    expect(after.openQ).toHaveLength(8);
  });

  it('pending on a wrap eventually joins as last after the window stops covering the last seat', () => {
    let g = seed(10, 0, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 7,
      splitCycle: 'same',
    });
    g = score(g).after;
    const arrived = arrive(g, o('Late')).after;
    expect(arrived.pending).toHaveLength(1);
    let cur = arrived;
    let joined = false;
    for (let i = 0; i < 12; i++) {
      cur = score(cur).after;
      if (cur.pending.length === 0) {
        joined = true;
        expect(cur.openQ.at(-1)?.name).toBe('Late');
        expect(lineOf(cur).some((p) => p.name === 'Late')).toBe(false);
        break;
      }
    }
    expect(joined).toBe(true);
  });
});

describe('pending pressure: every size, ratio, and cycle', () => {
  it('arrival never changes current line; joiners are always last in their gender queue', () => {
    let cases = 0;
    for (const size of SIZES) {
      for (let startingOpen = 0; startingOpen <= size; startingOpen++) {
        for (const cycle of CYCLES) {
          if (!isSplitCycleAvailable(size, startingOpen, cycle) && cycle !== 'same') continue;
          const p0 = getGenderPattern(0, size, startingOpen, cycle);
          const rosters = [
            [0, Math.max(p0.women + 2, 3)],
            [Math.max(p0.men + 2, 3), 0],
            [p0.men, p0.women],
            [p0.men + 4, p0.women + 4],
            [Math.max(0, p0.men - 1), Math.max(0, p0.women - 1)],
            [14, 14],
          ] as const;
          for (const [nO, nW] of rosters) {
            if (nO + nW === 0) continue;
            for (const startMul of [0, 1, 2, 5]) {
              const g = seed(nO, nW, {
                openIndex: startMul * Math.max(p0.men, 1),
                womenIndex: startMul * Math.max(p0.women, 1),
                lineIndex: startMul,
                lineupSize: size,
                startingOpen,
                splitCycle: cycle,
              });
              const beforeLine = lineOf(g);
              for (const player of [o(`L-${cases}-O`), w(`L-${cases}-W`)]) {
                if (player.gender === 'O' && nO === 0 && p0.men > 0) {
                  // first open on a line that needs opens: may stay pending
                }
                const { before, after } = arrive(g, player);
                expect(ids(before)).toEqual(ids(beforeLine));
                assertArrivalInvariants(beforeLine, g, after, player);
                cases++;
              }
            }
          }
        }
      }
    }
    expect(cases).toBeGreaterThan(500);
  });

  it('scoring with pending never fields the late player onto the line that just became current, and joiners are last', () => {
    let pendingSeen = 0;
    let joinedSeen = 0;
    for (const size of SIZES) {
      for (let startingOpen = 0; startingOpen <= size; startingOpen++) {
        for (const cycle of ['same', 'ABBA'] as SplitCycle[]) {
          if (!isSplitCycleAvailable(size, startingOpen, cycle) && cycle !== 'same') continue;
          let g = seed(10, 10, {
            openIndex: 0,
            womenIndex: 0,
            lineIndex: 0,
            lineupSize: size,
            startingOpen,
            splitCycle: cycle,
          });
          // Arrive after the window has moved so last-seat wrap can pending.
          g = score(g).after;
          g = score(g).after;
          g = arrive(g, o('LateO')).after;
          g = arrive(g, w('LateW')).after;
          for (let pt = 0; pt < 10; pt++) {
            if (g.pending.length) pendingSeen++;
            const beforeJoinOpen = g.openQ.some((p) => p.name === 'LateO');
            const beforeJoinWomen = g.womenQ.some((p) => p.name === 'LateW');
            const { after } = score(g);
            assertQueueIntegrity(after);
            if (!beforeJoinOpen && after.openQ.some((p) => p.name === 'LateO')) {
              expect(after.openQ.at(-1)?.name).toBe('LateO');
              expect(lineOf(after).some((p) => p.name === 'LateO')).toBe(false);
              joinedSeen++;
            }
            if (!beforeJoinWomen && after.womenQ.some((p) => p.name === 'LateW')) {
              expect(after.womenQ.at(-1)?.name).toBe('LateW');
              expect(lineOf(after).some((p) => p.name === 'LateW')).toBe(false);
              joinedSeen++;
            }
            g = after;
          }
        }
      }
    }
    expect(pendingSeen).toBeGreaterThan(0);
    expect(joinedSeen).toBeGreaterThan(0);
  });
});

describe('pending pressure: mid-game gender ratio and lineup size changes', () => {
  it('shrinking an all-mens 7 to 5 can release a wrap-pending player as last', () => {
    let g = seed(8, 0, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 7,
      splitCycle: 'same',
    });
    g = score(g).after;
    g = arrive(g, o('Late')).after;
    expect(g.pending.map((p) => p.name)).toEqual(['Late']);

    const { after } = changePattern(g, 5, 5, 'same');
    // Smaller window from the same start may no longer include the last seat.
    if (after.pending.length === 0) {
      expect(after.openQ.at(-1)?.name).toBe('Late');
      expect(lineOf(after).some((p) => p.name === 'Late')).toBe(false);
    } else {
      expect(after.openQ).toHaveLength(8);
    }
  });

  it('4:3 → 3:4 on the same point does not put a pending open onto current line', () => {
    let g = seed(6, 6, {
      openIndex: 3,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 4,
      splitCycle: 'same',
    });
    g = arrive(g, o('LateO')).after;
    g = arrive(g, w('LateW')).after;
    const { lineAfterPattern, after } = changePattern(g, 7, 3, 'same');
    expect(ids(lineOf(after))).toEqual(ids(lineAfterPattern));
    assertQueueIntegrity(after);
    for (const name of ['LateO', 'LateW']) {
      const onOpen = after.openQ.some((p) => p.name === name);
      const onWomen = after.womenQ.some((p) => p.name === name);
      if (onOpen) expect(after.openQ.at(-1)?.name).toBe(name);
      if (onWomen) expect(after.womenQ.at(-1)?.name).toBe(name);
      expect(lineOf(after).some((p) => p.name === name)).toBe(false);
    }
  });

  it('every size/ratio can switch to every other size/ratio without pending changing current line', () => {
    let switches = 0;
    for (const size of SIZES) {
      for (let startingOpen = 0; startingOpen <= size; startingOpen += Math.max(1, size - 1)) {
        const cycle: SplitCycle = isSplitCycleAvailable(size, startingOpen, 'ABBA')
          ? 'ABBA'
          : 'same';
        let g = seed(9, 9, {
          openIndex: 5,
          womenIndex: 4,
          lineIndex: 2,
          lineupSize: size,
          startingOpen,
          splitCycle: cycle,
        });
        g = arrive(g, o('LateO')).after;
        g = arrive(g, w('LateW')).after;
        for (const toSize of SIZES) {
          for (let toOpen = 0; toOpen <= toSize; toOpen++) {
            for (const toCycle of CYCLES) {
              if (!isSplitCycleAvailable(toSize, toOpen, toCycle) && toCycle !== 'same') continue;
              const { after } = changePattern(g, toSize, toOpen, toCycle);
              assertQueueIntegrity(after);
              switches++;
            }
          }
        }
      }
    }
    expect(switches).toBeGreaterThan(200);
  });

  it('ABBA A→B flip (line 0 to 1) then late arrival still appends-or-pends without touching current', () => {
    let g = seed(8, 8, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 4,
      splitCycle: 'ABBA',
    });
    expect(patternOf(g)).toEqual({ men: 4, women: 3 });
    g = score(g).after;
    expect(patternOf(g)).toEqual({ men: 3, women: 4 });
    const before = lineOf(g);
    const arrived = arrive(g, o('Late')).after;
    expect(ids(lineOf(arrived))).toEqual(ids(before));
    assertArrivalInvariants(before, g, arrived, o('Late'));
  });

  it('switching to all-womens mid-game: pending open joins unused queue at end', () => {
    let g = seed(8, 8, {
      openIndex: 2,
      womenIndex: 1,
      lineIndex: 1,
      lineupSize: 7,
      startingOpen: 4,
      splitCycle: 'same',
    });
    g = arrive(g, o('LateO')).after;
    const { after } = changePattern(g, 7, 0, 'same');
    expect(patternOf(after)).toEqual({ men: 0, women: 7 });
    // Opens are not on the line; last-open number cannot be on current line.
    expect(after.pending.some((p) => p.name === 'LateO')).toBe(false);
    expect(after.openQ.at(-1)?.name).toBe('LateO');
    expect(lineOf(after).every((p) => p.gender === 'W')).toBe(true);
  });
});

describe('pending pressure: numbers, undo, multiple arrivals, Add now', () => {
  it('assigned numbers: 8 men + late = 9', () => {
    const g = seed(8, 0, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 7,
      splitCycle: 'same',
    });
    const { after } = arrive(g, o('Late'));
    const numbered = assignNumbersByGender([...after.openQ, ...after.womenQ]);
    expect(numbered.filter((p) => p.gender === 'O').map((p) => p.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(numbered.find((p) => p.name === 'Late')?.number).toBe(9);
  });

  it('two late opens at index 0 both append in order as last then last', () => {
    let g = seed(8, 3, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 4,
      splitCycle: 'same',
    });
    g = arrive(g, o('A9')).after;
    g = arrive(g, o('A10')).after;
    expect(g.pending).toEqual([]);
    expect(g.openQ.map((p) => p.name).slice(-2)).toEqual(['A9', 'A10']);
  });

  it('undo pulls a player who joined on the score back to pending', () => {
    let g = seed(10, 0, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 7,
      splitCycle: 'same',
    });
    g = score(g).after;
    g = arrive(g, o('Late')).after;
    expect(g.pending).toHaveLength(1);
    const pendingIdsAtScore = g.pending.map((p) => p.uuid);
    let joined: Game | null = null;
    let cur = g;
    for (let i = 0; i < 12; i++) {
      cur = score(cur).after;
      if (cur.pending.length === 0 && cur.openQ.some((p) => p.name === 'Late')) {
        joined = cur;
        break;
      }
    }
    expect(joined).not.toBeNull();
    const restored = restoreActivatedPendingAfterUndo({
      pendingIdsAtScore,
      masterOpenQueue: joined!.openQ,
      masterWomenQueue: joined!.womenQ,
      currentPending: [],
    });
    expect(restored.pendingPlayers.map((p) => p.name)).toEqual(['Late']);
    expect(restored.masterOpenQueue.some((p) => p.name === 'Late')).toBe(false);
  });

  it('Add now appends at the end even on a short line', () => {
    const g = seed(3, 0, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 7,
      splitCycle: 'same',
    });
    const placed = partitionPendingForLineChange({
      pendingPlayers: [o('Late')],
      masterOpenQueue: g.openQ,
      masterWomenQueue: g.womenQ,
      openIndex: g.openIndex,
      womenIndex: g.womenIndex,
      lineIndex: g.lineIndex,
      startingOpen: g.startingOpen,
      splitCycle: g.splitCycle,
      lineupSize: g.lineupSize,
      allowChangingCurrentLine: true,
    });
    expect(placed.stillPending).toEqual([]);
    expect(placed.masterOpenQueue.at(-1)?.name).toBe('Late');
  });

  it('first woman on a 4-3 line with an empty women queue stays pending (would walk on)', () => {
    const g = seed(8, 0, {
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 4,
      splitCycle: 'same',
    });
    expect(lineOf(g).every((p) => p.gender === 'O')).toBe(true);
    const { after } = arrive(g, w('FirstW'));
    expect(after.pending.map((p) => p.name)).toEqual(['FirstW']);
    expect(after.womenQ).toEqual([]);
  });

  it('empty women queue on all-mens: a woman joins the unused queue immediately', () => {
    const g = seed(8, 0, {
      openIndex: 1,
      womenIndex: 0,
      lineIndex: 0,
      lineupSize: 7,
      startingOpen: 7,
      splitCycle: 'same',
    });
    const { after } = arrive(g, w('W1'));
    expect(after.pending).toEqual([]);
    expect(after.womenQ.map((p) => p.name)).toEqual(['W1']);
    expect(lineOf(after).every((p) => p.gender === 'O')).toBe(true);
  });
});

describe('pending pressure: 4v4 / 5v5 / 6v6 / mixed benches', () => {
  it.each([
    [4, 4, 0] as const,
    [4, 2, 2] as const,
    [5, 5, 0] as const,
    [5, 3, 2] as const,
    [6, 6, 0] as const,
    [6, 3, 3] as const,
    [6, 4, 2] as const,
    [7, 4, 3] as const,
    [7, 3, 4] as const,
    [7, 5, 2] as const,
    [7, 0, 7] as const,
    [7, 7, 0] as const,
  ])(
    '%i-player line at %i open / %i women: 12+12 roster, 6 points, late of each gender',
    (size, startingOpen, _women) => {
      let g = seed(12, 12, {
        openIndex: 0,
        womenIndex: 0,
        lineIndex: 0,
        lineupSize: size as LineupSize,
        startingOpen,
        splitCycle: isSplitCycleAvailable(size as LineupSize, startingOpen, 'AAB')
          ? 'AAB'
          : 'same',
      });
      for (let pt = 0; pt < 6; pt++) {
        const lateO = o(`O-pt${pt}`);
        const lateW = w(`W-pt${pt}`);
        const a = arrive(g, lateO);
        assertArrivalInvariants(a.before, g, a.after, lateO);
        const b = arrive(a.after, lateW);
        assertArrivalInvariants(lineOf(a.after), a.after, b.after, lateW);
        g = score(b.after).after;
        assertQueueIntegrity(g);
      }
    }
  );
});

describe('pending pressure: long games with arrivals every point and a half-time ratio change', () => {
  it('plays 15 points on each lineup size with a late of each gender every point', () => {
    for (const size of SIZES) {
      const startingOpen = clampOpenCount(DEFAULT_STARTING_OPEN[size], size);
      let g = seed(8, 8, {
        openIndex: 0,
        womenIndex: 0,
        lineIndex: 0,
        lineupSize: size,
        startingOpen,
        splitCycle: isSplitCycleAvailable(size, startingOpen, 'ABBA') ? 'ABBA' : 'same',
      });
      for (let pt = 0; pt < 15; pt++) {
        const lateO = o(`game-${size}-o${pt}`);
        const lateW = w(`game-${size}-w${pt}`);
        const a = arrive(g, lateO);
        assertArrivalInvariants(a.before, g, a.after, lateO);
        const b = arrive(a.after, lateW);
        assertArrivalInvariants(lineOf(a.after), a.after, b.after, lateW);
        if (pt === 7) {
          const flipped = size - startingOpen;
          const { after } = changePattern(b.after, size, flipped, b.after.splitCycle);
          g = score(after).after;
        } else {
          g = score(b.after).after;
        }
        assertQueueIntegrity(g);
      }
      expect(g.openQ.length + g.pending.filter((p) => p.gender === 'O').length).toBe(8 + 15);
      expect(g.womenQ.length + g.pending.filter((p) => p.gender === 'W').length).toBe(8 + 15);
    }
  });
});
