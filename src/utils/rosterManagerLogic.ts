import type { Player, GenderRatioMode, LineupSize, StartsOn } from '../types';
import { getLine } from './lineRotation';
import {
  getGenderPattern,
  removePlayerFromRotationQueue,
  rawIndexAfterReorderPreservingLineSlice,
} from './rotationHelpers';

/** Matches scoreboard late-arrival check: would appending this player bump someone off the current line? */
export function lateArrivalWouldDisplaceCurrentLine(params: {
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
  lineIndex: number;
  genderRatioMode: GenderRatioMode;
  lineupSize: LineupSize;
  startsOn?: StartsOn;
  newPlayer: Player;
}): boolean {
  const pattern = getGenderPattern(
    params.lineIndex,
    params.genderRatioMode,
    params.lineupSize,
    params.startsOn ?? 'O'
  );
  const normalizedOpenIndex =
    params.masterOpenQueue.length > 0
      ? params.openIndex % params.masterOpenQueue.length
      : 0;
  const normalizedWomenIndex =
    params.masterWomenQueue.length > 0
      ? params.womenIndex % params.masterWomenQueue.length
      : 0;

  const simulatedOpenQueue =
    params.newPlayer.gender === 'O'
      ? [...params.masterOpenQueue, params.newPlayer]
      : params.masterOpenQueue;
  const simulatedWomenQueue =
    params.newPlayer.gender === 'W'
      ? [...params.masterWomenQueue, params.newPlayer]
      : params.masterWomenQueue;

  const currentLine = getLine(
    params.masterOpenQueue,
    params.masterWomenQueue,
    pattern,
    normalizedOpenIndex,
    normalizedWomenIndex
  );
  const lineWithNewPlayer = getLine(
    simulatedOpenQueue,
    simulatedWomenQueue,
    pattern,
    normalizedOpenIndex,
    normalizedWomenIndex
  );

  const newLinePlayerIds = new Set(lineWithNewPlayer.map((p) => p.uuid));
  const displacedPlayers = currentLine.filter((p) => !newLinePlayerIds.has(p.uuid));
  return displacedPlayers.length > 0;
}

/** After appending one player to the end of a queue, keep the same effective rotation offset. */
export function expandRawIndexAfterQueueAppend(
  oldRawIndex: number,
  oldQueueLength: number,
  newQueueLength: number
): number {
  if (oldQueueLength === 0) return 0;
  const k = ((oldRawIndex % oldQueueLength) + oldQueueLength) % oldQueueLength;
  const rotations = Math.floor(oldRawIndex / oldQueueLength);
  return rotations * newQueueLength + k;
}

export function applyQueueRemovalsForRosterChange(
  masterOpenQueue: Player[],
  masterWomenQueue: Player[],
  openIndex: number,
  womenIndex: number,
  removedPlayers: Player[]
): {
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
} {
  let nextOpen = [...masterOpenQueue];
  let nextWomen = [...masterWomenQueue];
  let nextOpenIndex = openIndex;
  let nextWomenIndex = womenIndex;
  for (const player of removedPlayers) {
    if (player.gender === 'O') {
      const r = removePlayerFromRotationQueue(nextOpen, nextOpenIndex, player.uuid);
      nextOpen = r.queue;
      nextOpenIndex = r.rawIndex;
    } else {
      const r = removePlayerFromRotationQueue(nextWomen, nextWomenIndex, player.uuid);
      nextWomen = r.queue;
      nextWomenIndex = r.rawIndex;
    }
  }
  return {
    masterOpenQueue: nextOpen,
    masterWomenQueue: nextWomen,
    openIndex: nextOpenIndex,
    womenIndex: nextWomenIndex,
  };
}

export function applyDragReorderToMasterQueues(params: {
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
  newRosterActivePlayers: Player[];
  /** Current line open slice (same order as on the scoreboard) before reorder */
  desiredOpenLineSlice: Player[];
  desiredWomenLineSlice: Player[];
  openSliceLen: number;
  womenSliceLen: number;
}): {
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
} {
  const proposedOpen = params.newRosterActivePlayers.filter((p) => p.gender === 'O');
  const proposedWomen = params.newRosterActivePlayers.filter((p) => p.gender === 'W');
  return {
    masterOpenQueue: proposedOpen,
    masterWomenQueue: proposedWomen,
    openIndex: rawIndexAfterReorderPreservingLineSlice(
      params.openIndex,
      params.masterOpenQueue,
      proposedOpen,
      params.desiredOpenLineSlice,
      params.openSliceLen
    ),
    womenIndex: rawIndexAfterReorderPreservingLineSlice(
      params.womenIndex,
      params.masterWomenQueue,
      proposedWomen,
      params.desiredWomenLineSlice,
      params.womenSliceLen
    ),
  };
}

/** Same rules as App pending activation effect after line / pattern change. */
export function partitionPendingForLineChange(params: {
  pendingPlayers: Player[];
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
  lineIndex: number;
  pointNumber: number;
  genderRatioMode: GenderRatioMode;
  lineupSize: LineupSize;
  startsOn?: StartsOn;
}): { activate: Player[]; stillPending: Player[] } {
  const pattern = getGenderPattern(
    params.lineIndex,
    params.genderRatioMode,
    params.lineupSize,
    params.startsOn ?? 'O'
  );
  const neededOpenCount = pattern.men;
  const neededWomenCount = pattern.women;
  const currentOpenCount = params.masterOpenQueue.length;
  const currentWomenCount = params.masterWomenQueue.length;

  const activate: Player[] = [];
  const stillPending: Player[] = [];

  for (const p of params.pendingPlayers) {
    const simulatedOpen =
      p.gender === 'O' ? [...params.masterOpenQueue, p] : params.masterOpenQueue;
    const simulatedWomen =
      p.gender === 'W' ? [...params.masterWomenQueue, p] : params.masterWomenQueue;
    const lineWithPendingPlayer = getLine(
      simulatedOpen,
      simulatedWomen,
      pattern,
      params.openIndex,
      params.womenIndex
    );

    if (params.pointNumber === 1) {
      if (p.gender === 'O' && currentOpenCount < neededOpenCount) {
        activate.push(p);
        continue;
      }
      if (p.gender === 'W' && currentWomenCount < neededWomenCount) {
        activate.push(p);
        continue;
      }
    }

    if (lineWithPendingPlayer.some((lineP) => lineP.uuid === p.uuid)) {
      stillPending.push(p);
    } else {
      activate.push(p);
    }
  }

  return { activate, stillPending };
}

/**
 * Append players leaving pending into master queues. Call only when partition logic has ensured
 * they are not on the current line (same openIndex / womenIndex → same people on the field).
 */
export function applyPendingActivationsToQueues(
  masterOpenQueue: Player[],
  masterWomenQueue: Player[],
  activate: Player[]
): { masterOpenQueue: Player[]; masterWomenQueue: Player[] } {
  let open = [...masterOpenQueue];
  let women = [...masterWomenQueue];
  for (const p of activate) {
    if (p.gender === 'O') open = [...open, p];
    else women = [...women, p];
  }
  return { masterOpenQueue: open, masterWomenQueue: women };
}
