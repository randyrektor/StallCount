import { Player, type GenderRatioMode, type LineupSize, type StartsOn } from '../types';
import { getWrapped as getWrappedLine } from './lineRotation';

/** More open players (4-3 style at 7v7). */
const OPEN_HEAVY: Record<LineupSize, { men: number; women: number }> = {
  7: { men: 4, women: 3 },
  6: { men: 4, women: 2 },
  5: { men: 3, women: 2 },
  4: { men: 3, women: 1 },
};

/** More women-matching players (3-4 style at 7v7). */
const WOMEN_HEAVY: Record<LineupSize, { men: number; women: number }> = {
  7: { men: 3, women: 4 },
  6: { men: 2, women: 4 },
  5: { men: 2, women: 3 },
  4: { men: 1, women: 3 },
};

/** True for cyclic modes (ABBA, AAB) where the "starts on" choice matters. */
export function modeHasStartingPoint(mode: GenderRatioMode): boolean {
  return mode === 'ABBA' || mode === 'AAB';
}

/** Length of the rotation cycle. 4 for ABBA, 3 for AAB, 1 for fixed modes. */
export function getCycleLengthForMode(mode: GenderRatioMode): number {
  if (mode === 'ABBA') return 4;
  if (mode === 'AAB') return 3;
  return 1;
}

/**
 * Open (O) / Women (W) counts for the line at this point index. Always sums to
 * `lineupSize`. For cyclic modes (ABBA, AAB), `startsOn` controls which gender
 * dominates point 1 of the half; for fixed modes it's ignored.
 */
export function getGenderPattern(
  lineIndex: number,
  mode: GenderRatioMode,
  lineupSize: LineupSize = 7,
  startsOn: StartsOn = 'O'
): { men: number; women: number } {
  if (mode === '4-3') return OPEN_HEAVY[lineupSize];
  if (mode === '3-4') return WOMEN_HEAVY[lineupSize];
  if (mode === 'MEN') return { men: lineupSize, women: 0 };
  if (mode === 'WOMEN') return { men: 0, women: lineupSize };

  // For cyclic modes: position 0 of the canonical cycle is always "A" (the
  // starting gender's heavy point); other positions follow the cycle.
  const startingHeavy = startsOn === 'O' ? OPEN_HEAVY : WOMEN_HEAVY;
  const oppositeHeavy = startsOn === 'O' ? WOMEN_HEAVY : OPEN_HEAVY;
  if (mode === 'AAB') {
    const mod = ((lineIndex % 3) + 3) % 3;
    // A A B
    return mod === 2 ? oppositeHeavy[lineupSize] : startingHeavy[lineupSize];
  }
  // ABBA
  const mod = ((lineIndex % 4) + 4) % 4;
  // A B B A
  return mod === 0 || mod === 3 ? startingHeavy[lineupSize] : oppositeHeavy[lineupSize];
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
