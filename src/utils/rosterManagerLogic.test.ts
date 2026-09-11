import { describe, it, expect } from 'vitest';
import {
  lateArrivalWouldDisplaceCurrentLine,
  expandRawIndexAfterQueueAppend,
  applyQueueRemovalsForRosterChange,
  applyDragReorderToMasterQueues,
  partitionPendingForLineChange,
  applyPendingActivationsToQueues,
  restoreActivatedPendingAfterUndo,
} from './rosterManagerLogic';
import {
  applySubstitutionToQueue,
  removePlayerFromRotationQueue,
  mergeRosterFromGenderQueues,
  assignNumbersByGender,
  getGenderPattern,
} from './rotationHelpers';
import { getLine, getWrapped } from './lineRotation';
import type { Player } from '../types';

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

describe('lateArrivalWouldDisplaceCurrentLine', () => {
  it('appended open can change who is in the window → displace (rotation not at 0)', () => {
    const opens = [o('A'), o('B'), o('C'), o('D')];
    const women = [w('M'), w('N'), w('P')];
    const pattern = getGenderPattern(0, 7, 4, 'ABBA');
    expect(pattern.men).toBe(4);
    // With openIndex 0, a 5th open at the end is still outside the first 4 slots — no bump.
    expect(
      lateArrivalWouldDisplaceCurrentLine({
        masterOpenQueue: opens,
        masterWomenQueue: women,
        openIndex: 0,
        womenIndex: 0,
        lineIndex: 0,
        startingOpen: 4,
        splitCycle: 'ABBA',
        lineupSize: 7,
        newPlayer: o('Late'),
      })
    ).toBe(false);

    // With openIndex 1, the new 5th player enters the wrapped window and someone drops off.
    expect(
      lateArrivalWouldDisplaceCurrentLine({
        masterOpenQueue: opens,
        masterWomenQueue: women,
        openIndex: 1,
        womenIndex: 0,
        lineIndex: 0,
        startingOpen: 4,
        splitCycle: 'ABBA',
        lineupSize: 7,
        newPlayer: o('Late'),
      })
    ).toBe(true);
  });

  it('first point with only 3 open players: adding 4th open fills need → no displace', () => {
    const opens = [o('A'), o('B'), o('C')];
    const women = [w('M'), w('N'), w('P')];
    const displace = lateArrivalWouldDisplaceCurrentLine({
      masterOpenQueue: opens,
      masterWomenQueue: women,
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      startingOpen: 4,
      splitCycle: 'ABBA',
      lineupSize: 7,
      newPlayer: o('Fourth'),
    });
    expect(displace).toBe(false);
  });
});

describe('expandRawIndexAfterQueueAppend', () => {
  it('keeps same first-in-window player after append', () => {
    const q = [o('A'), o('B'), o('C'), o('D')];
    const oldLen = q.length;
    const newLen = oldLen + 1;
    const raw = 2;
    const newRaw = expandRawIndexAfterQueueAppend(raw, oldLen, newLen);
    const effOld = raw % oldLen;
    const effNew = newRaw % newLen;
    expect(q[effOld].uuid).toBe(q[effNew].uuid);
  });

  it('matches multi-rotation raw index', () => {
    const oldLen = 4;
    const newLen = 5;
    const raw = 9;
    const newRaw = expandRawIndexAfterQueueAppend(raw, oldLen, newLen);
    const anchorOld = [o('A'), o('B'), o('C'), o('D')][((raw % oldLen) + oldLen) % oldLen];
    const extended = [o('A'), o('B'), o('C'), o('D'), o('E')];
    const anchorNew = extended[((newRaw % newLen) + newLen) % newLen];
    expect(anchorNew.name).toBe(anchorOld.name);
  });
});

describe('applyQueueRemovalsForRosterChange', () => {
  it('removes two open players in roster order; anchor stays coherent', () => {
    const opens = [o('A'), o('B'), o('C'), o('D')];
    const women = [w('M')];
    const r = applyQueueRemovalsForRosterChange(opens, women, 0, 0, [opens[1], opens[3]]);
    expect(r.masterOpenQueue.map((p) => p.name)).toEqual(['A', 'C']);
    expect(r.masterWomenQueue.map((p) => p.name)).toEqual(['M']);
    expect(r.masterOpenQueue[r.openIndex % r.masterOpenQueue.length].name).toBe('A');
  });

  it('removes one open and one woman independently', () => {
    const opens = [o('A'), o('B')];
    const women = [w('M'), w('N')];
    const r = applyQueueRemovalsForRosterChange(opens, women, 1, 0, [opens[0], women[1]]);
    expect(r.masterOpenQueue.map((p) => p.name)).toEqual(['B']);
    expect(r.masterWomenQueue.map((p) => p.name)).toEqual(['M']);
  });
});

describe('applyDragReorderToMasterQueues', () => {
  it('reorders the queue and puts the new top of the list on the current line', () => {
    const oldO = [o('A'), o('B'), o('C')];
    const oldW = [w('M')];
    const newOrder = [oldO[2], oldO[0], oldO[1], ...oldW];
    const r = applyDragReorderToMasterQueues({
      masterOpenQueue: oldO,
      masterWomenQueue: oldW,
      openIndex: 1,
      womenIndex: 0,
      newRosterActivePlayers: newOrder,
    });
    expect(r.masterOpenQueue.map((p) => p.name)).toEqual(['C', 'A', 'B']);
    expect(r.openIndex).toBe(0);
    expect(r.masterOpenQueue[0].name).toBe('C');
  });

  it('swapping two bench opens with index 0 keeps the first 4 on the line', () => {
    const oldO = [o('A'), o('B'), o('C'), o('D'), o('E'), o('F'), o('G')];
    const oldW = [w('M'), w('N'), w('P')];
    const newOrder = [
      ...[oldO[0], oldO[1], oldO[2], oldO[3], oldO[5], oldO[4], oldO[6]],
      ...oldW,
    ];
    const r = applyDragReorderToMasterQueues({
      masterOpenQueue: oldO,
      masterWomenQueue: oldW,
      openIndex: 0,
      womenIndex: 0,
      newRosterActivePlayers: newOrder,
    });
    const beforeLine = getLine(oldO, oldW, { men: 4, women: 3 }, 0, 0);
    const afterLine = getLine(
      r.masterOpenQueue,
      r.masterWomenQueue,
      { men: 4, women: 3 },
      r.openIndex,
      r.womenIndex
    );
    expect(beforeLine.map((p) => p.uuid)).toEqual(afterLine.map((p) => p.uuid));
  });

  it('dragging someone onto the front of the list puts them on the current line', () => {
    const oldO = [o('A'), o('B'), o('C'), o('D'), o('E')];
    const oldW = [w('M'), w('N'), w('P')];
    const r = applyDragReorderToMasterQueues({
      masterOpenQueue: oldO,
      masterWomenQueue: oldW,
      openIndex: 2,
      womenIndex: 0,
      newRosterActivePlayers: [oldO[4], oldO[0], oldO[1], oldO[2], oldO[3], ...oldW],
    });
    const afterLine = getLine(
      r.masterOpenQueue,
      r.masterWomenQueue,
      { men: 4, women: 3 },
      r.openIndex,
      r.womenIndex
    );
    expect(afterLine[0].name).toBe('E');
    expect(r.openIndex).toBe(0);
  });
});

describe('applyPendingActivationsToQueues', () => {
  it('appends at end; same indices keep same current line when new player is off the field', () => {
    const opens = [o('A'), o('B'), o('C'), o('D')];
    const women = [w('M'), w('N'), w('P')];
    const pattern = getGenderPattern(0, 7, 4, 'ABBA');
    const oi = 0;
    const wi = 0;
    const before = getLine(opens, women, pattern, oi, wi);
    const applied = applyPendingActivationsToQueues(opens, women, [o('New')]);
    const after = getLine(applied.masterOpenQueue, applied.masterWomenQueue, pattern, oi, wi);
    expect(applied.masterOpenQueue.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D', 'New']);
    expect(after.map((p) => p.uuid)).toEqual(before.map((p) => p.uuid));
  });
});

describe('partitionPendingForLineChange', () => {
  it('does not fill a short line after kickoff — current line must not change', () => {
    const opens = [o('A'), o('B')];
    const women = [w('M'), w('N'), w('P')];
    const pending = [o('Bench')];
    const { activate, stillPending } = partitionPendingForLineChange({
      pendingPlayers: pending,
      masterOpenQueue: opens,
      masterWomenQueue: women,
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      startingOpen: 4,
      splitCycle: 'ABBA',
      lineupSize: 7,
    });
    expect(activate).toEqual([]);
    expect(stillPending.map((p) => p.name)).toEqual(['Bench']);
  });

  it('when pending would appear on the current line if added, keep pending', () => {
    const opens = [o('A'), o('B'), o('C'), o('D')];
    const women = [w('M'), w('N'), w('P')];
    const pending = [o('Extra')];
    const { activate, stillPending } = partitionPendingForLineChange({
      pendingPlayers: pending,
      masterOpenQueue: opens,
      masterWomenQueue: women,
      openIndex: 1,
      womenIndex: 0,
      lineIndex: 0,
      startingOpen: 4,
      splitCycle: 'ABBA',
      lineupSize: 7,
    });
    expect(activate).toEqual([]);
    expect(stillPending.map((p) => p.name)).toEqual(['Extra']);
  });
});

describe('roster manager scenarios (integration)', () => {
  it('two bench subs in a row: swap then swap; queue length and uniqueness preserved', () => {
    let openQ = [o('Randy'), o('Nathan'), o('Evan'), o('Paul'), o('Jack'), o('Sam')];
    openQ = applySubstitutionToQueue(openQ, openQ[2].uuid, openQ[4]);
    expect(openQ.map((p) => p.name)).toEqual(['Randy', 'Nathan', 'Jack', 'Paul', 'Evan', 'Sam']);
    const paul = openQ[3];
    const randy = openQ[0];
    openQ = applySubstitutionToQueue(openQ, randy.uuid, paul);
    expect(new Set(openQ.map((p) => p.uuid)).size).toBe(openQ.length);
    expect(openQ.map((p) => p.name)).toEqual(['Paul', 'Nathan', 'Jack', 'Randy', 'Evan', 'Sam']);
  });

  it('sub with brand-new player: in takes out slot, out goes to end', () => {
    const q = [o('A'), o('B'), o('C')];
    const z = o('Z');
    const next = applySubstitutionToQueue(q, 'o-B', z);
    expect(next.map((p) => p.name)).toEqual(['A', 'Z', 'C', 'B']);
  });

  it('injury removes slot; later line window uses compacted list', () => {
    let openQ = [o('A'), o('B'), o('C'), o('D')];
    let raw = 0;
    const wq = [w('M'), w('N'), w('P')];
    let wi = 0;
    const rm = applyQueueRemovalsForRosterChange(openQ, wq, raw, wi, [openQ[1]]);
    openQ = rm.masterOpenQueue;
    raw = rm.openIndex;
    wi = rm.womenIndex;
    const pattern = getGenderPattern(0, 7, 4, 'same');
    const line = getLine(openQ, wq, pattern, raw % openQ.length, wi % wq.length);
    expect(line.map((p) => p.name)).toEqual(['A', 'C', 'D', 'M', 'N', 'P']);
  });

  it('score advance then sub: rotation index unchanged by sub; line reflects swap', () => {
    const pattern = getGenderPattern(0, 7, 4, 'same');
    let openQ = [o('A'), o('B'), o('C'), o('D'), o('E')];
    const wq = [w('M'), w('N'), w('P')];
    let oi = pattern.men;
    let wi = pattern.women;
    const before = getLine(openQ, wq, pattern, oi % openQ.length, wi % wq.length);
    openQ = applySubstitutionToQueue(openQ, before[0].uuid, openQ.find((p) => !before.some((b) => b.uuid === p.uuid))!.uuid);
    const after = getLine(openQ, wq, pattern, oi % openQ.length, wi % wq.length);
    expect(after.length).toBe(before.length);
    expect(new Set(after.map((p) => p.uuid)).size).toBe(after.length);
  });

  it('mergeRoster after subs keeps one entry per uuid in combined view', () => {
    let openQ = [o('A'), o('B'), o('C'), o('D')];
    const wq = [w('M'), w('N'), w('P')];
    openQ = applySubstitutionToQueue(openQ, 'o-B', openQ[3]);
    const prev: Player[] = [...openQ, ...wq];
    const merged = mergeRosterFromGenderQueues(openQ, wq, prev);
    const uuids = merged.map((p) => p.uuid);
    expect(new Set(uuids).size).toBe(uuids.length);
  });

  it('drag reorder + removal: no duplicate uuids in master queues', () => {
    let openQ = [o('A'), o('B'), o('C')];
    const wq = [w('M')];
    const drag = applyDragReorderToMasterQueues({
      masterOpenQueue: openQ,
      masterWomenQueue: wq,
      openIndex: 0,
      womenIndex: 0,
      newRosterActivePlayers: [openQ[2], openQ[0], openQ[1], wq[0]],
    });
    let r = applyQueueRemovalsForRosterChange(
      drag.masterOpenQueue,
      drag.masterWomenQueue,
      drag.openIndex,
      drag.womenIndex,
      [drag.masterOpenQueue[1]]
    );
    const all = [...r.masterOpenQueue, ...r.masterWomenQueue];
    expect(new Set(all.map((p) => p.uuid)).size).toBe(all.length);
  });

  it('getWrapped with short roster returns whole queue (no duplicate fill)', () => {
    const q = [o('A'), o('B')];
    const slice = getWrapped(q, 0, 4);
    expect(slice.length).toBe(2);
    expect(slice.map((p) => p.name)).toEqual(['A', 'B']);
  });
});

describe('women-matching queue scenarios', () => {
  it('swap two women in master women queue', () => {
    const q = [w('M1'), w('M2'), w('M3'), w('M4')];
    const next = applySubstitutionToQueue(q, q[1].uuid, q[3]);
    expect(next.map((p) => p.name)).toEqual(['M1', 'M4', 'M3', 'M2']);
  });

  it('remove woman from middle; line still has correct count', () => {
    const women = [w('M1'), w('M2'), w('M3')];
    const r = removePlayerFromRotationQueue(women, 0, women[1].uuid);
    const line = getLine([o('A'), o('B'), o('C'), o('D')], r.queue, { men: 4, women: 2 }, 0, r.rawIndex % r.queue.length);
    expect(line.filter((p) => p.gender === 'W').length).toBe(2);
  });
});

describe('assignNumbersByGender', () => {
  it('re-numbers open and women blocks after merge', () => {
    const merged = [o('A'), o('B'), w('M'), w('N')];
    const n = assignNumbersByGender(merged);
    expect(n.filter((p) => p.gender === 'O').map((p) => p.number)).toEqual([1, 2]);
    expect(n.filter((p) => p.gender === 'W').map((p) => p.number)).toEqual([1, 2]);
  });
});

describe('restoreActivatedPendingAfterUndo', () => {
  it('pulls players who were pending at the score back out of the queues', () => {
    const late = o('Late');
    const opens = [o('A'), o('B'), o('C'), o('D'), late];
    const women = [w('M'), w('N'), w('P')];
    const r = restoreActivatedPendingAfterUndo({
      pendingIdsAtScore: [late.uuid],
      masterOpenQueue: opens,
      masterWomenQueue: women,
      currentPending: [],
    });
    expect(r.masterOpenQueue.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(r.pendingPlayers.map((p) => p.name)).toEqual(['Late']);
  });

  it('leaves players pending if they never entered a queue', () => {
    const late = o('Late');
    const r = restoreActivatedPendingAfterUndo({
      pendingIdsAtScore: [late.uuid],
      masterOpenQueue: [o('A'), o('B')],
      masterWomenQueue: [w('M')],
      currentPending: [late],
    });
    expect(r.masterOpenQueue.map((p) => p.name)).toEqual(['A', 'B']);
    expect(r.pendingPlayers.map((p) => p.name)).toEqual(['Late']);
  });
});

/** Simulates scoring a point: advance raw indices by current pattern counts. */
function advanceRotationForPoint(
  lineIndex: number,
  lineupSize: 7,
  startingOpen: number,
  splitCycle: 'ABBA',
  openIndex: number,
  womenIndex: number
): { openIndex: number; womenIndex: number; nextLineIndex: number } {
  const pattern = getGenderPattern(lineIndex, lineupSize, startingOpen, splitCycle);
  return {
    openIndex: openIndex + pattern.men,
    womenIndex: womenIndex + pattern.women,
    nextLineIndex: lineIndex + 1,
  };
}

describe('coach stress scenarios (rec league)', () => {
  it('injury: player on current line removed mid-game; line still fills pattern with no duplicate uuids', () => {
    const splitCycle = 'ABBA' as const;
    const size = 7;
    const startingOpen = 4;
    let openQ = [o('O1'), o('O2'), o('O3'), o('O4'), o('O5')];
    const wq = [w('W1'), w('W2'), w('W3'), w('W4')];
    let lineIdx = 0;
    let oi = 0;
    let wi = 0;
    // Two points scored — rotation has moved.
    for (let i = 0; i < 2; i++) {
      const adv = advanceRotationForPoint(lineIdx, size, startingOpen, splitCycle, oi, wi);
      oi = adv.openIndex;
      wi = adv.womenIndex;
      lineIdx = adv.nextLineIndex;
    }
    const pattern = getGenderPattern(lineIdx, size, startingOpen, splitCycle);
    const before = getLine(openQ, wq, pattern, oi % openQ.length, wi % wq.length);
    const victim = before.find((p) => p.gender === 'O')!;
    const rm = applyQueueRemovalsForRosterChange(openQ, wq, oi, wi, [victim]);
    openQ = rm.masterOpenQueue;
    oi = rm.openIndex;
    wi = rm.womenIndex;
    const after = getLine(openQ, wq, pattern, oi % openQ.length, wi % wq.length);
    expect(after.length).toBe(pattern.men + pattern.women);
    expect(new Set(after.map((p) => p.uuid)).size).toBe(after.length);
    expect(after.every((p) => p.uuid !== victim.uuid)).toBe(true);
  });

  it('injury: remove open and woman in one roster update; combined queues stay unique', () => {
    const openQ = [o('A'), o('B'), o('C'), o('D')];
    const wq = [w('M'), w('N'), w('P')];
    const r = applyQueueRemovalsForRosterChange(openQ, wq, 2, 1, [openQ[0], wq[2]]);
    const all = [...r.masterOpenQueue, ...r.masterWomenQueue];
    expect(new Set(all.map((p) => p.uuid)).size).toBe(all.length);
    expect(r.masterOpenQueue.map((p) => p.name)).toEqual(['B', 'C', 'D']);
    expect(r.masterWomenQueue.map((p) => p.name)).toEqual(['M', 'N']);
  });

  it('freshness: chain of four open subs keeps same roster set (no dupes, same length)', () => {
    let q = [o('S1'), o('S2'), o('S3'), o('S4'), o('B1'), o('B2')];
    const initialIds = new Set(q.map((p) => p.uuid));
    q = applySubstitutionToQueue(q, q[0].uuid, q[4]);
    q = applySubstitutionToQueue(q, q[1].uuid, q.find((p) => p.name === 'S1')!);
    q = applySubstitutionToQueue(q, q[2].uuid, q.find((p) => p.name === 'S2')!);
    q = applySubstitutionToQueue(q, q[3].uuid, q.find((p) => p.name === 'S3')!);
    expect(q.length).toBe(6);
    expect(new Set(q.map((p) => p.uuid)).size).toBe(6);
    expect([...q.map((p) => p.uuid)].every((id) => initialIds.has(id))).toBe(true);
  });

  it('late arrival: would displace on point 5 → pending; after next point rotation, partition can activate', () => {
    const splitCycle = 'ABBA' as const;
    const size = 7;
    const startingOpen = 4;
    const openQ = [o('A'), o('B'), o('C'), o('D')];
    const women = [w('M'), w('N'), w('P')];
    let lineIdx = 0;
    let oi = 1;
    let wi = 0;
    const late = o('Straggler');
    expect(
      lateArrivalWouldDisplaceCurrentLine({
        masterOpenQueue: openQ,
        masterWomenQueue: women,
        openIndex: oi,
        womenIndex: wi,
        lineIndex: lineIdx,
        startingOpen,
        splitCycle,
        lineupSize: size,
        newPlayer: late,
      })
    ).toBe(true);

    const pendingFirst = partitionPendingForLineChange({
      pendingPlayers: [late],
      masterOpenQueue: openQ,
      masterWomenQueue: women,
      openIndex: oi,
      womenIndex: wi,
      lineIndex: lineIdx,
      startingOpen,
      splitCycle,
      lineupSize: size,
    });
    expect(pendingFirst.activate).toEqual([]);
    expect(pendingFirst.stillPending.map((p) => p.name)).toEqual(['Straggler']);

    const adv = advanceRotationForPoint(lineIdx, size, startingOpen, splitCycle, oi, wi);
    const pendingAfterPoint = partitionPendingForLineChange({
      pendingPlayers: [late],
      masterOpenQueue: openQ,
      masterWomenQueue: women,
      openIndex: adv.openIndex,
      womenIndex: adv.womenIndex,
      lineIndex: adv.nextLineIndex,
      startingOpen,
      splitCycle,
      lineupSize: size,
    });
    expect(pendingAfterPoint.stillPending).toEqual([]);
    expect(pendingAfterPoint.activate.map((p) => p.name)).toEqual(['Straggler']);
  });

  it('late arrival on a short line stays pending (does not join this point)', () => {
    const opens = [o('A'), o('B')];
    const women = [w('M'), w('N'), w('P')];
    const lateOpen = o('Fill');
    const part = partitionPendingForLineChange({
      pendingPlayers: [lateOpen],
      masterOpenQueue: opens,
      masterWomenQueue: women,
      openIndex: 0,
      womenIndex: 0,
      lineIndex: 0,
      startingOpen: 4,
      splitCycle: 'ABBA',
      lineupSize: 7,
    });
    expect(part.activate).toEqual([]);
    expect(part.stillPending.map((p) => p.name)).toEqual(['Fill']);
  });
});
