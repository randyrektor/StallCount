// ScoreboardApp.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Player, type LineupSize, type SplitCycle, type Theme } from './src/types';
import { PlayerManager } from './src/components/PlayerManager';
import { ScoreBoard } from './src/components/ScoreBoard';
import { SettingsModal } from './src/components/SettingsModal';
import { HomeScreen } from './src/components/HomeScreen';
import { getWrapped } from './src/utils/lineRotation';
import {
  applySubstitutionToQueue,
  mergeRosterFromGenderQueues,
  assignNumbersByGender,
  getGenderPattern,
  insertPlayerAtGenderEndOfRoster,
  clampOpenCount,
  DEFAULT_STARTING_OPEN,
} from './src/utils/rotationHelpers';
import {
  applyQueueRemovalsForRosterChange,
  applyDragReorderToMasterQueues,
  partitionPendingForLineChange,
  restoreActivatedPendingAfterUndo,
  expandRawIndexAfterQueueAppend,
} from './src/utils/rosterManagerLogic';
import { COLORS } from './src/constants';
import { loadRosterForTeam, saveRosterForTeam } from './src/utils/rosterStorage';
import { mergeImportedPlayers, type ParsedRosterRow } from './src/utils/rosterImport';
import { loadGameSession, scheduleSaveGameSession, clearGameSession, type GameSession } from './src/utils/gameSession';
import { buildSpectatorSnapshot } from './src/utils/spectatorState';
import { isSoftCapReached, parseSoftCap, type SoftPointCap } from './src/utils/softCap';
import { parseGameClockTime, type GameClockTime } from './src/utils/gameClock';
import { SpectatorScreen } from './src/components/SpectatorScreen';
import {
  mintRoomId,
  mintWriteKey,
  parseWatchHash,
  watchRoomUrlFromLocation,
  type WatchHash,
} from './src/utils/watchRoom';
import { useWatchHost, useWatchViewer } from './src/hooks/useWatchRoom';

// No hardcoded roster - players are added each game

const assignNumbers = assignNumbersByGender;

interface ScoreEvent {
  team: 1 | 2;
  lineIndex: number;
  pointNumber: number;
  openIndex: number;
  womenIndex: number;
  /** Pending at the moment of the score, before they may rotate in. */
  pendingPlayerIds: string[];
  /** Who was on the field for the point that just ended. */
  linePlayerIds: string[];
}

function readLineupSize(): LineupSize {
  if (typeof window === 'undefined') return 7;
  const n = Number.parseInt(window.localStorage.getItem('ultimate-lineup-size') ?? '', 10);
  if (n === 4 || n === 5 || n === 6 || n === 7) return n;
  return 7;
}

function readSplitCycle(): SplitCycle {
  if (typeof window === 'undefined') return 'ABBA';
  const c = window.localStorage.getItem('ultimate-split-cycle');
  if (c === 'same' || c === 'ABBA' || c === 'AAB') return c;
  return 'ABBA';
}

function readStartingOpen(size: LineupSize): number {
  if (typeof window === 'undefined') return DEFAULT_STARTING_OPEN[size];
  const saved = window.localStorage.getItem('ultimate-starting-open');
  if (saved != null) {
    const n = Number.parseInt(saved, 10);
    if (Number.isFinite(n)) return clampOpenCount(n, size);
  }
  let startsOn = window.localStorage.getItem('ultimate-starts-on');
  const legacy = window.localStorage.getItem('ultimate-pattern-start-offset');
  if (legacy != null) {
    const parsed = Number.parseInt(legacy, 10);
    try {
      window.localStorage.removeItem('ultimate-pattern-start-offset');
    } catch {
      // ignore
    }
    if (Number.isFinite(parsed) && parsed !== 0) startsOn = 'W';
  }
  if (startsOn === 'W') {
    return clampOpenCount(size - DEFAULT_STARTING_OPEN[size], size);
  }
  return DEFAULT_STARTING_OPEN[size];
}

export default function App() {
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [resumeLabel, setResumeLabel] = useState<string | null>(null);
  const [showRoster, setShowRoster] = useState(false);
  const [setupStep, setSetupStep] = useState<'roster' | 'line'>('roster');
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('Away');
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [roster, setRoster] = useState<Player[]>([]);
  const [masterOpenQueue, setMasterOpenQueue] = useState<Player[]>([]);
  const [masterWomenQueue, setMasterWomenQueue] = useState<Player[]>([]);
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [pointNumber, setPointNumber] = useState(1);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lineupSize, setLineupSize] = useState<LineupSize>(() => readLineupSize());
  const [startingOpen, setStartingOpen] = useState(() => readStartingOpen(readLineupSize()));
  const [splitCycle, setSplitCycle] = useState<SplitCycle>(() => readSplitCycle());
  const [softCap, setSoftCap] = useState<SoftPointCap>(null);
  const [halfAt, setHalfAt] = useState<GameClockTime>(null);
  const [endAt, setEndAt] = useState<GameClockTime>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = window.localStorage.getItem('ultimate-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [scoreHistory, setScoreHistory] = useState<ScoreEvent[]>([]);

  // Track rotation index for men and women
  const [openIndex, setOpenIndex] = useState(0);
  const [womenIndex, setWomenIndex] = useState(0);
  const [watchHash, setWatchHash] = useState<WatchHash | null>(() =>
    typeof window === 'undefined' ? null : parseWatchHash(window.location.hash)
  );
  const [watchRoomId, setWatchRoomId] = useState<string | null>(null);
  const [watchWriteKey, setWatchWriteKey] = useState<string | null>(null);

  const ensureWatchRoom = useCallback(() => {
    setWatchRoomId((id) => id ?? mintRoomId());
    setWatchWriteKey((key) => key ?? mintWriteKey());
  }, []);

  useEffect(() => {
    const onHash = () => setWatchHash(parseWatchHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Always start on team select. Only persist after kickoff so setup is not skipped.
  useEffect(() => {
    const session = loadGameSession();
    if (session?.gameStarted && session.team1Name) {
      setResumeLabel(
        `${session.team1Name} ${session.team1Score}–${session.team2Score} ${session.team2Name}`
      );
    } else if (session && !session.gameStarted) {
      clearGameSession();
    }
    setShowHomeScreen(true);
    setSessionReady(true);
  }, []);

  const applyRestoredSession = (session: GameSession) => {
    setTeam1Name(session.team1Name);
    setTeam2Name(session.team2Name);
    setTeam1Score(session.team1Score);
    setTeam2Score(session.team2Score);
    setRoster(session.roster);
    setMasterOpenQueue(session.masterOpenQueue);
    setMasterWomenQueue(session.masterWomenQueue);
    setPendingPlayers(session.pendingPlayers);
    setGameStarted(session.gameStarted);
    setLineIndex(session.lineIndex);
    setPointNumber(session.pointNumber);
    setOpenIndex(session.openIndex);
    setWomenIndex(session.womenIndex);
    setScoreHistory(session.scoreHistory);
    setLineupSize(session.lineupSize);
    setStartingOpen(session.startingOpen);
    setSplitCycle(session.splitCycle);
    if (session.softCap !== undefined) setSoftCap(parseSoftCap(session.softCap));
    setHalfAt(parseGameClockTime(session.halfAt));
    setEndAt(parseGameClockTime(session.endAt));
    setShowRoster(false);
    setSetupStep(session.setupStep);
    if (session.watchRoomId && session.watchWriteKey) {
      setWatchRoomId(session.watchRoomId);
      setWatchWriteKey(session.watchWriteKey);
    }
    setShowHomeScreen(false);
    setResumeLabel(null);
  };

  const resetScoreboardForNewSession = useCallback(() => {
    setTeam1Score(0);
    setTeam2Score(0);
    setLineIndex(0);
    setPointNumber(1);
    setScoreHistory([]);
    setOpenIndex(0);
    setWomenIndex(0);
    setPendingPlayers([]);
    setGameStarted(false);
    setSoftCap(null);
    setHalfAt(null);
    setEndAt(null);
    setWatchRoomId(null);
    setWatchWriteKey(null);
    clearGameSession();
  }, []);

  const applyNewGameRoster = useCallback((newRoster: Player[]) => {
    setRoster(newRoster);
    const openPlayers = newRoster.filter((p) => p.gender === 'O');
    const womenPlayers = newRoster.filter((p) => p.gender === 'W');
    setMasterOpenQueue(openPlayers);
    setMasterWomenQueue(womenPlayers);
    setOpenIndex(0);
    setWomenIndex(0);
  }, []);

  const handleStartGame = (teamName: string) => {
    const trimmed = teamName.trim();
    resetScoreboardForNewSession();
    setTeam1Name(trimmed);
    setShowHomeScreen(false);
    const loaded = loadRosterForTeam(trimmed) ?? [];
    applyNewGameRoster(loaded);
    setShowRoster(true);
    setSetupStep('roster');
    setResumeLabel(null);
  };

  const handleResumeGame = () => {
    const session = loadGameSession();
    if (!session?.gameStarted) return;
    applyRestoredSession(session);
  };

  const handleKickoff = () => {
    ensureWatchRoom();
    setGameStarted(true);
    setShowRoster(false);
  };

  const handleImportPlayers = (rows: ParsedRosterRow[]) => {
    const { roster: next, added, skipped } = mergeImportedPlayers(roster, rows);
    if (added.length === 0) return { added: 0, skipped };
    setRoster(next);
    if (!gameStarted) {
      const openPlayers = next.filter((p) => p.gender === 'O');
      const womenPlayers = next.filter((p) => p.gender === 'W');
      setMasterOpenQueue(openPlayers);
      setMasterWomenQueue(womenPlayers);
    } else {
      const nextPending = [...pendingPlayers, ...added];
      const placed = partitionPendingForLineChange({
        pendingPlayers: nextPending,
        masterOpenQueue,
        masterWomenQueue,
        openIndex,
        womenIndex,
        lineIndex,
        startingOpen,
        lineupSize,
        splitCycle,
      });
      setMasterOpenQueue(placed.masterOpenQueue);
      setMasterWomenQueue(placed.masterWomenQueue);
      setOpenIndex(placed.openIndex);
      setWomenIndex(placed.womenIndex);
      setPendingPlayers(placed.stillPending);
      scoringRef.current = {
        ...scoringRef.current,
        masterOpenQueue: placed.masterOpenQueue,
        masterWomenQueue: placed.masterWomenQueue,
        openIndex: placed.openIndex,
        womenIndex: placed.womenIndex,
        pendingPlayers: placed.stillPending,
      };
    }
    return { added: added.length, skipped };
  };

  const handleChangeTeam = () => {
    setShowHomeScreen(true);
    setShowRoster(false);
    setSetupStep('roster');
  };

  // Calculate total players used so far for proper rotation
  const getPattern = useCallback(
    (idx: number) => getGenderPattern(idx, lineupSize, startingOpen, splitCycle),
    [lineupSize, startingOpen, splitCycle]
  );

  // Apply + persist the active theme. CSS vars in global.css respond to data-theme.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('ultimate-theme', theme);
    } catch {
      // localStorage can throw in private modes; theme just won't persist.
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem('ultimate-lineup-size', String(lineupSize));
      window.localStorage.setItem('ultimate-starting-open', String(startingOpen));
      window.localStorage.setItem('ultimate-split-cycle', splitCycle);
    } catch {
      // ignore quota errors
    }
  }, [lineupSize, startingOpen, splitCycle]);

  // Calculate current queues based on rotation
  const currentPattern = getPattern(lineIndex);
  
  // Normalize indices to be within queue bounds
  const normalizedOpenIndex = masterOpenQueue.length > 0 ? openIndex % masterOpenQueue.length : 0;
  const normalizedWomenIndex = masterWomenQueue.length > 0 ? womenIndex % masterWomenQueue.length : 0;
  
  const currentOpenQueue = getWrapped(masterOpenQueue, normalizedOpenIndex, currentPattern.men);
  const currentWomanQueue = getWrapped(masterWomenQueue, normalizedWomenIndex, currentPattern.women);
  const nextPattern = getPattern(lineIndex + 1);
  const nextOpenQueue = getWrapped(
    masterOpenQueue,
    openIndex + currentPattern.men,
    nextPattern.men
  );
  const nextWomanQueue = getWrapped(
    masterWomenQueue,
    womenIndex + currentPattern.women,
    nextPattern.women
  );
  const currentLine = [...currentOpenQueue, ...currentWomanQueue];
  const nextLine = [...nextOpenQueue, ...nextWomanQueue];
  const liveSpectatorSnapshot = useMemo(
    () =>
      buildSpectatorSnapshot({
        us: team1Name,
        them: team2Name,
        s1: team1Score,
        s2: team2Score,
        point: pointNumber,
        lineIndex,
        lineupSize,
        startingOpen,
        splitCycle,
        softCap,
        halfAt,
        endAt,
      }),
    [
      team1Name,
      team2Name,
      team1Score,
      team2Score,
      pointNumber,
      lineIndex,
      lineupSize,
      startingOpen,
      splitCycle,
      softCap,
      halfAt,
      endAt,
    ]
  );

  const viewingRoomId = watchHash?.kind === 'room' ? watchHash.roomId : null;
  const { snapshot: roomSnapshot, status: roomStatus } = useWatchViewer(viewingRoomId);
  useWatchHost(
    !viewingRoomId && !!watchRoomId && !!watchWriteKey,
    watchRoomId,
    watchWriteKey,
    liveSpectatorSnapshot
  );

  useEffect(() => {
    if (settingsVisible) ensureWatchRoom();
  }, [settingsVisible, ensureWatchRoom]);

  // Keep scoring inputs in a ref so rapid clicks don't wait for a re-render
  // (and don't double-apply the same score from a stale closure).
  const scoringRef = useRef({
    gameStarted,
    team1Score,
    team2Score,
    softCap,
    lineIndex,
    pointNumber,
    openIndex,
    womenIndex,
    pendingPlayers,
    masterOpenQueue,
    masterWomenQueue,
  });
  scoringRef.current = {
    gameStarted,
    team1Score,
    team2Score,
    softCap,
    lineIndex,
    pointNumber,
    openIndex,
    womenIndex,
    pendingPlayers,
    masterOpenQueue,
    masterWomenQueue,
  };

  const recordPoint = (team: 1 | 2) => {
    const s = scoringRef.current;
    if (!s.gameStarted) return;
    if (isSoftCapReached(s.team1Score, s.team2Score, s.softCap)) return;
    const pattern = getPattern(s.lineIndex);
    const linePlayerIds = [
      ...getWrapped(s.masterOpenQueue, s.openIndex, pattern.men),
      ...getWrapped(s.masterWomenQueue, s.womenIndex, pattern.women),
    ].map((p) => p.uuid);
    // Place pending against the line that just played (Current Line frozen).
    // They may join Next Line. Then rotate, then let leftovers take the new line.
    const placed = partitionPendingForLineChange({
      pendingPlayers: s.pendingPlayers,
      masterOpenQueue: s.masterOpenQueue,
      masterWomenQueue: s.masterWomenQueue,
      openIndex: s.openIndex,
      womenIndex: s.womenIndex,
      lineIndex: s.lineIndex,
      startingOpen,
      lineupSize,
      splitCycle,
    });
    const advanced = {
      ...s,
      team1Score: team === 1 ? s.team1Score + 1 : s.team1Score,
      team2Score: team === 2 ? s.team2Score + 1 : s.team2Score,
      masterOpenQueue: placed.masterOpenQueue,
      masterWomenQueue: placed.masterWomenQueue,
      pendingPlayers: placed.stillPending,
      openIndex: placed.openIndex + pattern.men,
      womenIndex: placed.womenIndex + pattern.women,
      lineIndex: s.lineIndex + 1,
      pointNumber: s.pointNumber + 1,
    };
    const flushed = partitionPendingForLineChange({
      pendingPlayers: advanced.pendingPlayers,
      masterOpenQueue: advanced.masterOpenQueue,
      masterWomenQueue: advanced.masterWomenQueue,
      openIndex: advanced.openIndex,
      womenIndex: advanced.womenIndex,
      lineIndex: advanced.lineIndex,
      startingOpen,
      lineupSize,
      splitCycle,
      allowChangingCurrentLine: true,
    });
    const next = {
      ...advanced,
      masterOpenQueue: flushed.masterOpenQueue,
      masterWomenQueue: flushed.masterWomenQueue,
      pendingPlayers: flushed.stillPending,
      openIndex: flushed.openIndex,
      womenIndex: flushed.womenIndex,
    };
    scoringRef.current = next;
    setScoreHistory((prev) => [
      ...prev,
      {
        team,
        lineIndex: s.lineIndex,
        pointNumber: s.pointNumber,
        openIndex: s.openIndex,
        womenIndex: s.womenIndex,
        pendingPlayerIds: s.pendingPlayers.map((p) => p.uuid),
        linePlayerIds,
      },
    ]);
    if (team === 1) setTeam1Score(next.team1Score);
    else setTeam2Score(next.team2Score);
    setMasterOpenQueue(next.masterOpenQueue);
    setMasterWomenQueue(next.masterWomenQueue);
    setPendingPlayers(next.pendingPlayers);
    setOpenIndex(next.openIndex);
    setWomenIndex(next.womenIndex);
    setLineIndex(next.lineIndex);
    setPointNumber(next.pointNumber);
  };

  const handleTeam1ScoreChange = () => recordPoint(1);
  const handleTeam2ScoreChange = () => recordPoint(2);

  const handleSubstitute = useCallback(
    (outPlayer: Player, inPlayer: Player) => {
      if (outPlayer.uuid === inPlayer.uuid || outPlayer.gender !== inPlayer.gender) return;
      let nextOpen = masterOpenQueue;
      let nextWomen = masterWomenQueue;
      if (outPlayer.gender === 'O') {
        nextOpen = applySubstitutionToQueue(masterOpenQueue, outPlayer.uuid, inPlayer);
        setMasterOpenQueue(nextOpen);
      } else {
        nextWomen = applySubstitutionToQueue(masterWomenQueue, outPlayer.uuid, inPlayer);
        setMasterWomenQueue(nextWomen);
      }
      setPendingPlayers((prev) => prev.filter((p) => p.uuid !== inPlayer.uuid));
    },
    [masterOpenQueue, masterWomenQueue]
  );

  const handleForcePendingToRotation = useCallback(
    (player: Player) => {
      if (!pendingPlayers.some((p) => p.uuid === player.uuid)) return;
      const placed = partitionPendingForLineChange({
        pendingPlayers: [player],
        masterOpenQueue,
        masterWomenQueue,
        openIndex,
        womenIndex,
        lineIndex,
        startingOpen,
        lineupSize,
        splitCycle,
        allowChangingCurrentLine: true,
      });
      setPendingPlayers((prev) =>
        prev.filter((p) => p.uuid !== player.uuid && !placed.activate.some((a) => a.uuid === p.uuid))
      );
      setMasterOpenQueue(placed.masterOpenQueue);
      setMasterWomenQueue(placed.masterWomenQueue);
      setOpenIndex(placed.openIndex);
      setWomenIndex(placed.womenIndex);
      scoringRef.current = {
        ...scoringRef.current,
        masterOpenQueue: placed.masterOpenQueue,
        masterWomenQueue: placed.masterWomenQueue,
        openIndex: placed.openIndex,
        womenIndex: placed.womenIndex,
        pendingPlayers: pendingPlayers.filter(
          (p) => p.uuid !== player.uuid && !placed.activate.some((a) => a.uuid === p.uuid)
        ),
      };
    },
    [
      pendingPlayers,
      masterOpenQueue,
      masterWomenQueue,
      openIndex,
      womenIndex,
      lineIndex,
      startingOpen,
      lineupSize,
      splitCycle,
    ]
  );

  const handleReset = () => {
    setTeam1Score(0);
    setTeam2Score(0);
    setLineIndex(0);
    setPointNumber(1);
    setScoreHistory([]);
    setOpenIndex(0);
    setWomenIndex(0);
  };

  const handleUndo = () => {
    if (scoreHistory.length === 0) return;

    const lastEvent = scoreHistory[scoreHistory.length - 1];
    const nextTeam1 = lastEvent.team === 1 ? scoringRef.current.team1Score - 1 : scoringRef.current.team1Score;
    const nextTeam2 = lastEvent.team === 2 ? scoringRef.current.team2Score - 1 : scoringRef.current.team2Score;

    if (lastEvent.team === 1) {
      setTeam1Score(prev => prev - 1);
    } else {
      setTeam2Score(prev => prev - 1);
    }

    setLineIndex(lastEvent.lineIndex);
    setPointNumber(lastEvent.pointNumber);
    setOpenIndex(lastEvent.openIndex);
    setWomenIndex(lastEvent.womenIndex);

    const restored = restoreActivatedPendingAfterUndo({
      pendingIdsAtScore: lastEvent.pendingPlayerIds ?? [],
      masterOpenQueue,
      masterWomenQueue,
      currentPending: pendingPlayers,
    });
    setMasterOpenQueue(restored.masterOpenQueue);
    setMasterWomenQueue(restored.masterWomenQueue);
    setPendingPlayers(restored.pendingPlayers);

    scoringRef.current = {
      ...scoringRef.current,
      team1Score: nextTeam1,
      team2Score: nextTeam2,
      lineIndex: lastEvent.lineIndex,
      pointNumber: lastEvent.pointNumber,
      openIndex: lastEvent.openIndex,
      womenIndex: lastEvent.womenIndex,
      masterOpenQueue: restored.masterOpenQueue,
      masterWomenQueue: restored.masterWomenQueue,
      pendingPlayers: restored.pendingPlayers,
    };

    setScoreHistory(prev => prev.slice(0, -1));
  };

  const onRosterChange = (newRoster: Player[]) => {
    const newRosterIds = new Set(newRoster.map(p => p.uuid));
    const removedPlayers = roster.filter(p => !newRosterIds.has(p.uuid));
    const addedPlayers = newRoster.filter(p => !roster.some(rp => rp.uuid === p.uuid));
  
    let nextMasterOpenQueue = [...masterOpenQueue];
    let nextMasterWomenQueue = [...masterWomenQueue];
    let nextOpenIndex = openIndex;
    let nextWomenIndex = womenIndex;

    if (removedPlayers.length > 0) {
      const r = applyQueueRemovalsForRosterChange(
        nextMasterOpenQueue,
        nextMasterWomenQueue,
        nextOpenIndex,
        nextWomenIndex,
        removedPlayers
      );
      nextMasterOpenQueue = r.masterOpenQueue;
      nextMasterWomenQueue = r.masterWomenQueue;
      nextOpenIndex = r.openIndex;
      nextWomenIndex = r.womenIndex;
    } else if (addedPlayers.length > 0) {
      // Pre-kickoff adds update queues in handleLateArrival; post-kickoff they stay pending.
    } else {
      const stillPendingIds = new Set(pendingPlayers.map(p => p.uuid));
      const activePlayers = newRoster.filter(p => !stillPendingIds.has(p.uuid));
      const reordered = applyDragReorderToMasterQueues({
        masterOpenQueue: nextMasterOpenQueue,
        masterWomenQueue: nextMasterWomenQueue,
        openIndex: nextOpenIndex,
        womenIndex: nextWomenIndex,
        newRosterActivePlayers: activePlayers,
      });
      nextMasterOpenQueue = reordered.masterOpenQueue;
      nextMasterWomenQueue = reordered.masterWomenQueue;
      nextOpenIndex = reordered.openIndex;
      nextWomenIndex = reordered.womenIndex;
    }
  
    setRoster(newRoster);
    setMasterOpenQueue(nextMasterOpenQueue);
    setMasterWomenQueue(nextMasterWomenQueue);
    setOpenIndex(nextOpenIndex);
    setWomenIndex(nextWomenIndex);

    const stillPending = pendingPlayers.filter(p => newRosterIds.has(p.uuid));
    setPendingPlayers(stillPending);
  };

  const handleLateArrival = (player: Player) => {
    const nextRoster = assignNumbers(insertPlayerAtGenderEndOfRoster(roster, player));
    setRoster(nextRoster);

    if (!gameStarted) {
      if (player.gender === 'O') {
        const oldLen = masterOpenQueue.length;
        const nextOpen = [...masterOpenQueue, player];
        setMasterOpenQueue(nextOpen);
        if (oldLen > 0) {
          setOpenIndex((idx) =>
            expandRawIndexAfterQueueAppend(idx, oldLen, nextOpen.length)
          );
        }
      } else {
        const oldLen = masterWomenQueue.length;
        const nextWomen = [...masterWomenQueue, player];
        setMasterWomenQueue(nextWomen);
        if (oldLen > 0) {
          setWomenIndex((idx) =>
            expandRawIndexAfterQueueAppend(idx, oldLen, nextWomen.length)
          );
        }
      }
      return;
    }

    const nextPending = [...pendingPlayers, player];
    const placed = partitionPendingForLineChange({
      pendingPlayers: nextPending,
      masterOpenQueue,
      masterWomenQueue,
      openIndex,
      womenIndex,
      lineIndex,
      startingOpen,
      lineupSize,
      splitCycle,
    });
    setMasterOpenQueue(placed.masterOpenQueue);
    setMasterWomenQueue(placed.masterWomenQueue);
    setOpenIndex(placed.openIndex);
    setWomenIndex(placed.womenIndex);
    setPendingPlayers(placed.stillPending);
    scoringRef.current = {
      ...scoringRef.current,
      masterOpenQueue: placed.masterOpenQueue,
      masterWomenQueue: placed.masterWomenQueue,
      openIndex: placed.openIndex,
      womenIndex: placed.womenIndex,
      pendingPlayers: placed.stillPending,
    };
  };

  // Changing players-per-point or gender split only changes window *length*.
  // Keep openIndex / womenIndex (next-on) exactly where they are.

  // Roster order follows master queues + extras (pending / edge); keeps subs and queue-only updates in sync.
  useEffect(() => {
    setRoster((prev) => {
      const next = assignNumbers(
        mergeRosterFromGenderQueues(masterOpenQueue, masterWomenQueue, prev)
      );
      if (
        next.length === prev.length &&
        next.every((p, i) => p.uuid === prev[i]?.uuid)
      ) {
        return prev;
      }
      return next;
    });
  }, [masterOpenQueue, masterWomenQueue]);

  useEffect(() => {
    if (showHomeScreen) return;
    const key = team1Name.trim();
    if (!key) return;
    saveRosterForTeam(key, roster);
  }, [roster, team1Name, showHomeScreen]);

  useEffect(() => {
    if (!sessionReady || showHomeScreen || !gameStarted) return;
    scheduleSaveGameSession({
      v: 1,
      team1Name,
      team2Name,
      team1Score,
      team2Score,
      roster,
      masterOpenQueue,
      masterWomenQueue,
      pendingPlayers,
      gameStarted,
      lineIndex,
      pointNumber,
      openIndex,
      womenIndex,
      scoreHistory,
      lineupSize,
      startingOpen,
      splitCycle,
      softCap,
      halfAt,
      endAt,
      showRoster,
      setupStep,
      watchRoomId: watchRoomId ?? undefined,
      watchWriteKey: watchWriteKey ?? undefined,
    });
  }, [
    sessionReady,
    showHomeScreen,
    team1Name,
    team2Name,
    team1Score,
    team2Score,
    roster,
    masterOpenQueue,
    masterWomenQueue,
    pendingPlayers,
    gameStarted,
    lineIndex,
    pointNumber,
    openIndex,
    womenIndex,
    scoreHistory,
    lineupSize,
    startingOpen,
    splitCycle,
    softCap,
    halfAt,
    endAt,
    showRoster,
    setupStep,
    watchRoomId,
    watchWriteKey,
  ]);

  if (watchHash?.kind === 'snapshot') {
    return (
      <SpectatorScreen
        snapshot={watchHash.snapshot}
        linkStatus="snapshot"
        onLeave={() => {
          window.location.hash = '';
          setWatchHash(null);
        }}
      />
    );
  }

  if (viewingRoomId) {
    return (
      <SpectatorScreen
        snapshot={roomSnapshot}
        linkStatus={roomStatus}
        onLeave={() => {
          window.location.hash = '';
          setWatchHash(null);
        }}
      />
    );
  }

  if (showHomeScreen) {
    return <HomeScreen onStart={handleStartGame} onResume={resumeLabel ? handleResumeGame : undefined} resumeLabel={resumeLabel} />;
  }

  return (
    <>
      {showRoster ? (
        <PlayerManager
          roster={roster}
          onRosterChange={onRosterChange}
          onLateArrival={handleLateArrival}
          pendingPlayers={pendingPlayers}
          gameStarted={gameStarted}
          setupStep={setupStep}
          masterOpenQueue={masterOpenQueue}
          masterWomenQueue={masterWomenQueue}
          onForcePendingToRotation={handleForcePendingToRotation}
          onOpenScoreboard={() => setShowRoster(false)}
          onContinueToLine={() => setSetupStep('line')}
          onReady={() => setShowRoster(false)}
          onOpenSettings={() => setSettingsVisible(true)}
          onBack={
            gameStarted
              ? undefined
              : setupStep === 'roster'
                ? handleChangeTeam
                : () => setSetupStep('roster')
          }
          lineupSize={lineupSize}
          startingOpen={startingOpen}
          splitCycle={splitCycle}
          softCap={softCap}
          halfAt={halfAt}
          endAt={endAt}
          onLineupSizeChange={(size) => {
            setLineupSize(size);
            setStartingOpen((open) => clampOpenCount(open, size));
          }}
          onStartingOpenChange={setStartingOpen}
          onSplitCycleChange={setSplitCycle}
          onSoftCapChange={setSoftCap}
          onHalfAtChange={setHalfAt}
          onEndAtChange={setEndAt}
          onImportPlayers={handleImportPlayers}
        />
      ) : (
        <ScoreBoard
          team1Name={team1Name}
          team2Name={team2Name}
          team1Score={team1Score}
          team2Score={team2Score}
          onTeam1ScoreChange={handleTeam1ScoreChange}
          onTeam2ScoreChange={handleTeam2ScoreChange}
          lineIndex={lineIndex}
          pointNumber={pointNumber}
          onReset={handleReset}
          onUndo={handleUndo}
          startingOpen={startingOpen}
          lineupSize={lineupSize}
          splitCycle={splitCycle}
          softCap={softCap}
          halfAt={halfAt}
          endAt={endAt}
          setSettingsVisible={setSettingsVisible}
          onOpenRoster={() => {
            setShowRoster(true);
            if (!gameStarted) setSetupStep('line');
          }}
          onBackToSetup={() => {
            setShowRoster(true);
            setSetupStep('line');
          }}
          pendingCount={pendingPlayers.length}
          roster={roster}
          openQueue={currentOpenQueue}
          womanQueue={currentWomanQueue}
          nextOpenQueue={nextOpenQueue}
          nextWomanQueue={nextWomanQueue}
          scoreHistory={scoreHistory}
          gameStarted={gameStarted}
          onKickoff={handleKickoff}
          onSubstitute={handleSubstitute}
        />
      )}
      {settingsVisible && (
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        team1Name={team1Name}
        team2Name={team2Name}
        onTeam1NameChange={setTeam1Name}
        onTeam2NameChange={setTeam2Name}
        startingOpen={startingOpen}
        onStartingOpenChange={setStartingOpen}
        lineupSize={lineupSize}
        onLineupSizeChange={(size) => {
          setLineupSize(size);
          setStartingOpen((open) => clampOpenCount(open, size));
        }}
        splitCycle={splitCycle}
        onSplitCycleChange={setSplitCycle}
        softCap={softCap}
        onSoftCapChange={setSoftCap}
        halfAt={halfAt}
        onHalfAtChange={setHalfAt}
        endAt={endAt}
        onEndAtChange={setEndAt}
        theme={theme}
        onThemeChange={setTheme}
        onReset={handleReset}
        onChangeTeam={handleChangeTeam}
        spectatorLink={watchRoomId ? watchRoomUrlFromLocation(watchRoomId) : ''}
        team1Score={team1Score}
        team2Score={team2Score}
        pointNumber={pointNumber}
        lineIndex={lineIndex}
        currentLine={currentLine}
        nextLine={nextLine}
        pendingPlayers={pendingPlayers}
        roster={roster}
        masterOpenQueue={masterOpenQueue}
        masterWomenQueue={masterWomenQueue}
        scoreHistory={scoreHistory}
      />
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: COLORS.background,
  },
  mainContent: {
    flex: 1,
    overflow: 'auto',
  },
};
