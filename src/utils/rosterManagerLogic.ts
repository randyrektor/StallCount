import type { Player, LineupSize, SplitCycle } from '../types';
import { getLine, getWrapped } from './lineRotation';
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

function sameLine(a: Player[], b: Player[]): boolean {
  return a.length === b.length && a.every((player, i) => player.uuid === b[i]?.uuid);
}

/**
 * Put a player into a gender queue without changing who is currently fielded.
 * Prefers the first rotation slot after the current window so they can appear
 * on next line. Returns null on a true short line, where adding them would
 * walk onto the field.
 */
export function insertPlayerPreservingCurrentLine(
  queue: Player[],
  rawIndex: number,
  lineCount: number,
  player: Player
): { queue: Player[]; rawIndex: number } | null {
  if (queue.some((p) => p.uuid === player.uuid)) {
    return { queue: [...queue], rawIndex };
  }

  const L = queue.length;
  if (lineCount <= 0) {
    return { queue: [...queue, player], rawIndex: L === 0 ? 0 : rawIndex };
  }
  if (L === 0) return null;

  const current = getWrapped(queue, rawIndex, lineCount);

  // True short line: even after adding, getWrapped still returns everyone,
  // so the new player would walk onto the field.
  if (lineCount > L) return null;

  let nextQueue: Player[];
  if (lineCount === L) {
    // Exact lineup: everyone is out, but the next person can sit behind them.
    nextQueue = [...queue, player];
  } else {
    const s = ((rawIndex % L) + L) % L;
    const windowEnd = s + lineCount;
    const insertAt = windowEnd <= L ? windowEnd : windowEnd - L;
    nextQueue = [...queue.slice(0, insertAt), player, ...queue.slice(insertAt)];
  }

  const Ln = nextQueue.length;
  const rotations = Math.floor(rawIndex / L);
  for (let offset = 0; offset < Ln; offset++) {
    const slice = getWrapped(nextQueue, offset, lineCount);
    if (sameLine(current, slice)) {
      return { queue: nextQueue, rawIndex: rotations * Ln + offset };
    }
  }
  return null;
}

function forcePlayerIntoQueue(
  queue: Player[],
  rawIndex: number,
  player: Player
): { queue: Player[]; rawIndex: number } {
  if (queue.some((p) => p.uuid === player.uuid)) {
    return { queue: [...queue], rawIndex };
  }
  const oldLen = queue.length;
  const nextQueue = [...queue, player];
  if (oldLen === 0) return { queue: nextQueue, rawIndex: 0 };
  return {
    queue: nextQueue,
    rawIndex: expandRawIndexAfterQueueAppend(rawIndex, oldLen, nextQueue.length),
  };
}

export type PendingPlacement = {
  activate: Player[];
  stillPending: Player[];
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  openIndex: number;
  womenIndex: number;
};

/**
 * After kickoff, pending players join the rotation as soon as they can without
 * changing who is on the current (already fielded) line. Next line may change.
 * Never fill a short current line mid-point.
 *
 * Pass allowChangingCurrentLine after a point is scored so leftovers (short
 * roster) can take the new line.
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
  allowChangingCurrentLine?: boolean;
}): PendingPlacement {
  const pattern = getGenderPattern(
    params.lineIndex,
    params.lineupSize,
    params.startingOpen,
    params.splitCycle ?? 'same'
  );
  let openQ = params.masterOpenQueue;
  let womenQ = params.masterWomenQueue;
  let openIndex = params.openIndex;
  let womenIndex = params.womenIndex;
  const currentLine = getLine(openQ, womenQ, pattern, openIndex, womenIndex);

  const activate: Player[] = [];
  const stillPending: Player[] = [];

  for (const p of params.pendingPlayers) {
    const allow = params.allowChangingCurrentLine === true;
    if (p.gender === 'O') {
      const preserved = insertPlayerPreservingCurrentLine(
        openQ,
        openIndex,
        pattern.men,
        p
      );
      const placed =
        preserved ?? (allow ? forcePlayerIntoQueue(openQ, openIndex, p) : null);
      if (!placed) {
        stillPending.push(p);
        continue;
      }
      const lineAfter = getLine(
        placed.queue,
        womenQ,
        pattern,
        placed.rawIndex,
        womenIndex
      );
      if (!allow && !sameLine(currentLine, lineAfter)) {
        stillPending.push(p);
        continue;
      }
      openQ = placed.queue;
      openIndex = placed.rawIndex;
      activate.push(p);
    } else {
      const preserved = insertPlayerPreservingCurrentLine(
        womenQ,
        womenIndex,
        pattern.women,
        p
      );
      const placed =
        preserved ?? (allow ? forcePlayerIntoQueue(womenQ, womenIndex, p) : null);
      if (!placed) {
        stillPending.push(p);
        continue;
      }
      const lineAfter = getLine(
        openQ,
        placed.queue,
        pattern,
        openIndex,
        placed.rawIndex
      );
      if (!allow && !sameLine(currentLine, lineAfter)) {
        stillPending.push(p);
        continue;
      }
      womenQ = placed.queue;
      womenIndex = placed.rawIndex;
      activate.push(p);
    }
  }

  return {
    activate,
    stillPending,
    masterOpenQueue: openQ,
    masterWomenQueue: womenQ,
    openIndex,
    womenIndex,
  };
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
 * Insert activated pending players into master queues. Preserves Current Line
 * when possible; next line is allowed to change.
 */
export function applyPendingActivationsToQueues(
  masterOpenQueue: Player[],
  masterWomenQueue: Player[],
  activate: Player[],
  openIndex = 0,
  womenIndex = 0,
  pattern: { men: number; women: number } = { men: 0, women: 0 },
  allowChangingCurrentLine = false
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
      const preserved = insertPlayerPreservingCurrentLine(
        open,
        nextOpenIndex,
        pattern.men,
        p
      );
      const placed =
        preserved ??
        (allowChangingCurrentLine
          ? forcePlayerIntoQueue(open, nextOpenIndex, p)
          : preserved);
      if (!placed) continue;
      open = placed.queue;
      nextOpenIndex = placed.rawIndex;
    } else {
      const preserved = insertPlayerPreservingCurrentLine(
        women,
        nextWomenIndex,
        pattern.women,
        p
      );
      const placed =
        preserved ??
        (allowChangingCurrentLine
          ? forcePlayerIntoQueue(women, nextWomenIndex, p)
          : preserved);
      if (!placed) continue;
      women = placed.queue;
      nextWomenIndex = placed.rawIndex;
    }
  }
  return {
    masterOpenQueue: open,
    masterWomenQueue: women,
    openIndex: nextOpenIndex,
    womenIndex: nextWomenIndex,
  };
}
