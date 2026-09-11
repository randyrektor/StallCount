import type { Player, LineupSize, SplitCycle } from '../types';
import { getLine } from './lineRotation';
import {
  getGenderPattern,
  removePlayerFromRotationQueue,
} from './rotationHelpers';

/** Matches scoreboard late-arrival check: would appending this player bump someone off the current line? */
export function lateArrivalWouldDisplaceCurrentLine(params: {
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
  lineIndex: number;
  startingOpen: number;
  lineupSize: LineupSize;
  splitCycle?: SplitCycle;
  newPlayer: Player;
}): boolean {
  const pattern = getGenderPattern(
    params.lineIndex,
    params.lineupSize,
    params.startingOpen,
    params.splitCycle ?? 'same'
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
}): {
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
} {
  const proposedOpen = params.newRosterActivePlayers.filter((p) => p.gender === 'O');
  const proposedWomen = params.newRosterActivePlayers.filter((p) => p.gender === 'W');
  // Roster order is the rotation from the top. That is the only way to replace
  // who is on the current line (late arrivals / pending never bump the field).
  return {
    masterOpenQueue: proposedOpen,
    masterWomenQueue: proposedWomen,
    openIndex: 0,
    womenIndex: 0,
  };
}

/**
 * After kickoff, pending players join the rotation only when appending them would
 * not change who is on the current line. Never fill a short line — that would
 * change the people already out.
 */
export function partitionPendingForLineChange(params: {
  pendingPlayers: Player[];
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
  lineIndex: number;
  startingOpen: number;
  lineupSize: LineupSize;
  splitCycle?: SplitCycle;
}): { activate: Player[]; stillPending: Player[] } {
  const pattern = getGenderPattern(
    params.lineIndex,
    params.lineupSize,
    params.startingOpen,
    params.splitCycle ?? 'same'
  );
  // Use raw rotation indices (getWrapped already wraps). Normalizing against the
  // old queue length would mis-detect the window after a simulated append.
  const currentLine = getLine(
    params.masterOpenQueue,
    params.masterWomenQueue,
    pattern,
    params.openIndex,
    params.womenIndex
  );

  const activate: Player[] = [];
  const stillPending: Player[] = [];

  for (const p of params.pendingPlayers) {
    const simulatedOpen =
      p.gender === 'O' ? [...params.masterOpenQueue, p] : params.masterOpenQueue;
    const simulatedWomen =
      p.gender === 'W' ? [...params.masterWomenQueue, p] : params.masterWomenQueue;
    const simOpenIndex =
      p.gender === 'O' && params.masterOpenQueue.length > 0
        ? expandRawIndexAfterQueueAppend(
            params.openIndex,
            params.masterOpenQueue.length,
            simulatedOpen.length
          )
        : params.openIndex;
    const simWomenIndex =
      p.gender === 'W' && params.masterWomenQueue.length > 0
        ? expandRawIndexAfterQueueAppend(
            params.womenIndex,
            params.masterWomenQueue.length,
            simulatedWomen.length
          )
        : params.womenIndex;
    const lineWithPending = getLine(
      simulatedOpen,
      simulatedWomen,
      pattern,
      simOpenIndex,
      simWomenIndex
    );
    const linePeopleChanged =
      currentLine.length !== lineWithPending.length ||
      currentLine.some((player, i) => player.uuid !== lineWithPending[i]?.uuid);

    if (linePeopleChanged) {
      stillPending.push(p);
    } else {
      activate.push(p);
    }
  }

  return { activate, stillPending };
}

/**
 * Undo restores score + rotation indices. Players who were pending at that
 * score and later appended to a queue go back to pending.
 */
export function restoreActivatedPendingAfterUndo(params: {
  pendingIdsAtScore: string[];
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  currentPending: Player[];
}): {
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  pendingPlayers: Player[];
} {
  const wasPending = new Set(params.pendingIdsAtScore);
  const rePend: Player[] = [];
  const masterOpenQueue = params.masterOpenQueue.filter((p) => {
    if (wasPending.has(p.uuid)) {
      rePend.push(p);
      return false;
    }
    return true;
  });
  const masterWomenQueue = params.masterWomenQueue.filter((p) => {
    if (wasPending.has(p.uuid)) {
      rePend.push(p);
      return false;
    }
    return true;
  });
  const pendingIds = new Set(params.currentPending.map((p) => p.uuid));
  const pendingPlayers = [
    ...params.currentPending,
    ...rePend.filter((p) => !pendingIds.has(p.uuid)),
  ];
  return { masterOpenQueue, masterWomenQueue, pendingPlayers };
}

/**
 * Append players leaving pending into master queues and keep the same people
 * in the current rotation window.
 */
export function applyPendingActivationsToQueues(
  masterOpenQueue: Player[],
  masterWomenQueue: Player[],
  activate: Player[],
  openIndex = 0,
  womenIndex = 0
): {
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
} {
  let open = [...masterOpenQueue];
  let women = [...masterWomenQueue];
  let nextOpenIndex = openIndex;
  let nextWomenIndex = womenIndex;
  for (const p of activate) {
    if (p.gender === 'O') {
      const oldLen = open.length;
      open = [...open, p];
      if (oldLen > 0) {
        nextOpenIndex = expandRawIndexAfterQueueAppend(
          nextOpenIndex,
          oldLen,
          open.length
        );
      }
    } else {
      const oldLen = women.length;
      women = [...women, p];
      if (oldLen > 0) {
        nextWomenIndex = expandRawIndexAfterQueueAppend(
          nextWomenIndex,
          oldLen,
          women.length
        );
      }
    }
  }
  return {
    masterOpenQueue: open,
    masterWomenQueue: women,
    openIndex: nextOpenIndex,
    womenIndex: nextWomenIndex,
  };
}
