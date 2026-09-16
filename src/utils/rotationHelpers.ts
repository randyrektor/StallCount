import { Player, type LineupSize, type SplitCycle } from '../types';
import { getWrapped as getWrappedLine } from './lineRotation';

/** Summer-league-style default: 4 open on a 7, scaled similarly for smaller lines. */
export const DEFAULT_STARTING_OPEN: Record<LineupSize, number> = {
  4: 3,
  5: 3,
  6: 4,
  7: 4,
};

export function clampOpenCount(open: number, size: LineupSize): number {
  if (!Number.isFinite(open)) return DEFAULT_STARTING_OPEN[size];
  return Math.max(0, Math.min(size, Math.round(open)));
}

/** True when A and its mirror are different (not 3:3 on 6, etc.). */
export function splitCycleApplies(size: LineupSize, startingOpen: number): boolean {
  const open = clampOpenCount(startingOpen, size);
  return open * 2 !== size;
}

/**
 * Which cycle options work for this split.
 * Even (3:3): ABBA/AAB are identical to Same.
 * n:0 or 0:n (mens/ladies night): only Same — no gender flip.
 */
export function isSplitCycleAvailable(
  size: LineupSize,
  startingOpen: number,
  cycle: SplitCycle
): boolean {
  if (cycle === 'same') return true;
  const open = clampOpenCount(startingOpen, size);
  if (open === 0 || open === size) return false;
  if (open * 2 === size) return false;
  return true;
}

/** Length of the rotation cycle. 4 for ABBA, 3 for AAB, 1 for same. */
export function getCycleLengthForMode(cycle: SplitCycle): number {
  if (cycle === 'ABBA') return 4;
  if (cycle === 'AAB') return 3;
  return 1;
}

/**
 * Open / women-matching counts for the line at this point.
 * `startingOpen` is open players on the A line (first point of the cycle).
 * B (when cycling) is the mirror: open and women swapped.
 *
 * Mid-game changes to lineupSize / startingOpen / cycle only change these counts.
 * Rotation indices (next-on) must stay put so the same window start remains on
 * the field; extra seats come from the next players in each gender queue.
 */
export function getGenderPattern(
  lineIndex: number,
  lineupSize: LineupSize,
  startingOpen: number,
  cycle: SplitCycle = 'same'
): { men: number; women: number } {
  const open = clampOpenCount(startingOpen, lineupSize);
  const a = { men: open, women: lineupSize - open };
  if (cycle === 'same' || !isSplitCycleAvailable(lineupSize, open, cycle)) {
    return a;
  }
  const b = { men: lineupSize - open, women: open };
  if (cycle === 'AAB') {
    const mod = ((lineIndex % 3) + 3) % 3;
    return mod === 2 ? b : a;
  }
  const mod = ((lineIndex % 4) + 4) % 4;
  return mod === 0 || mod === 3 ? a : b;
}

/**
 * Sub updates master rotation order only (openIndex / womenIndex unchanged):
 * - If sub-in is already in this queue: swap positions with sub-out (exchange numbers / slots).
 * - If sub-in is new to this queue: sub-in takes sub-out's slot; sub-out is moved to the end
 *   of the list so rotation stays one player per slot with no duplicates.
 */
export function applySubstitutionToQueue(
  queue: Player[],
  outUuid: string,
  inPlayer: Player
): Player[] {
  const outIdx = queue.findIndex((p) => p.uuid === outUuid);
  if (outIdx === -1) return queue;
  if (inPlayer.uuid === outUuid) return queue;

  const inIdx = queue.findIndex((p) => p.uuid === inPlayer.uuid);
  if (inIdx !== -1) {
    const next = [...queue];
    [next[outIdx], next[inIdx]] = [next[inIdx], next[outIdx]];
    return next;
  }

  const outPlayer = queue[outIdx];
  const withoutOut = queue.filter((p) => p.uuid !== outUuid);
  const insertAt = Math.min(outIdx, withoutOut.length);
  return [
    ...withoutOut.slice(0, insertAt),
    inPlayer,
    ...withoutOut.slice(insertAt),
    outPlayer,
  ];
}

/**
 * Injury / left early: remove that player from the queue (everyone after them moves up one slot).
 * Keeps the rotation pointer on the same person who led the window when possible; if they were
 * removed, uses the next player in cycle order still on the team.
 */
export function removePlayerFromRotationQueue(
  queue: Player[],
  rawIndex: number,
  removedUuid: string
): { queue: Player[]; rawIndex: number } {
  if (!queue.some((p) => p.uuid === removedUuid)) {
    return { queue: [...queue], rawIndex };
  }
  const newQueue = queue.filter((p) => p.uuid !== removedUuid);
  if (newQueue.length === 0) return { queue: newQueue, rawIndex: 0 };

  const L = queue.length;
  const effective = ((rawIndex % L) + L) % L;

  for (let step = 0; step < L; step++) {
    const p = queue[(effective + step) % L];
    if (p.uuid === removedUuid) continue;
    const newIdx = newQueue.findIndex((x) => x.uuid === p.uuid);
    if (newIdx !== -1) {
      const rotations = Math.floor(rawIndex / L);
      const Ln = newQueue.length;
      return { queue: newQueue, rawIndex: rotations * Ln + newIdx };
    }
  }
  return { queue: newQueue, rawIndex: 0 };
}

/**
 * After a roster drag, try to keep the current line identical (same people, same order) — typical
 * when only bench order changes. If no rotation start reproduces that slice (e.g. you moved someone
 * who’s on the field), fall back to anchor-only preservation and the on-field line may change; that’s
 * fine — roster order / numbers updated, lineup reflects the new queue.
 */
export function rawIndexAfterReorderPreservingLineSlice(
  oldRawIndex: number,
  oldQueue: Player[],
  newQueue: Player[],
  desiredSlice: Player[],
  sliceLen: number
): number {
  const L = newQueue.length;
  if (L === 0) return 0;
  if (!desiredSlice?.length || sliceLen === 0) {
    return preserveRotationIndexAfterReorder(oldQueue, newQueue, oldRawIndex);
  }
  for (let s = 0; s < L; s++) {
    const slice = getWrappedLine(newQueue, s, sliceLen);
    if (
      slice.length === desiredSlice.length &&
      slice.every((p, i) => p.uuid === desiredSlice[i].uuid)
    ) {
      const rotations = Math.floor(oldRawIndex / L);
      return rotations * L + s;
    }
  }
  return preserveRotationIndexAfterReorder(oldQueue, newQueue, oldRawIndex);
}

/**
 * After reordering a gender queue by roster drag, keep the same player at the rotation window start.
 */
export function preserveRotationIndexAfterReorder(
  oldQueue: Player[],
  newQueue: Player[],
  oldRawIndex: number
): number {
  if (oldQueue.length === 0) return 0;
  if (newQueue.length === 0) return 0;
  const Lold = oldQueue.length;
  const effective = ((oldRawIndex % Lold) + Lold) % Lold;
  const anchor = oldQueue[effective];
  const newIdx = newQueue.findIndex((p) => p.uuid === anchor.uuid);
  if (newIdx === -1) return oldRawIndex;
  const rotations = Math.floor(oldRawIndex / Lold);
  const Lnew = newQueue.length;
  return rotations * Lnew + newIdx;
}

/**
 * Rebuild full roster array: open queue order, then open-only extras, then women queue, then women extras.
 * Preserves players not present in either master queue (should not happen in normal play).
 */
export function mergeRosterFromGenderQueues(
  openQueue: Player[],
  womenQueue: Player[],
  previousRoster: Player[]
): Player[] {
  const inOpen = new Set(openQueue.map((p) => p.uuid));
  const inWomen = new Set(womenQueue.map((p) => p.uuid));
  const openExtras = previousRoster.filter(
    (p) => p.gender === 'O' && !inOpen.has(p.uuid)
  );
  const womenExtras = previousRoster.filter(
    (p) => p.gender === 'W' && !inWomen.has(p.uuid)
  );
  return [...openQueue, ...openExtras, ...womenQueue, ...womenExtras];
}

/** Late add: place the player after all others of the same gender (open block, then women block). */
export function insertPlayerAtGenderEndOfRoster(roster: Player[], player: Player): Player[] {
  if (player.gender === 'O') {
    const firstW = roster.findIndex((p) => p.gender === 'W');
    if (firstW === -1) return [...roster, player];
    return [...roster.slice(0, firstW), player, ...roster.slice(firstW)];
  }
  return [...roster, player];
}

export function assignNumbersByGender(players: Player[]): Player[] {
  let openCount = 1;
  let womenCount = 1;
  return players.map((player) => {
    if (player.gender === 'O') {
      return { ...player, number: openCount++ };
    }
    if (player.gender === 'W') {
      return { ...player, number: womenCount++ };
    }
    return { ...player, number: 0 };
  });
}
