// ScoreboardApp.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  applyPendingActivationsToQueues,
  restoreActivatedPendingAfterUndo,
  expandRawIndexAfterQueueAppend,
} from './src/utils/rosterManagerLogic';
import { COLORS } from './src/constants';
import { loadRosterForTeam, saveRosterForTeam } from './src/utils/rosterStorage';
import { mergeImportedPlayers, type ParsedRosterRow } from './src/utils/rosterImport';
import { loadGameSession, saveGameSession, clearGameSession } from './src/utils/gameSession';
import { parseSpectatorHash, type SpectatorSnapshot } from './src/utils/spectatorState';
import { SpectatorScreen } from './src/components/SpectatorScreen';
import { AppShell } from './src/components/AppShell';

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
  const prevLineIndexRef = useRef(0);
  const [showHomeScreen, setShowHomeScreen] = useState<boolean | null>(null); // null = loading
  const [sessionReady, setSessionReady] = useState(false);
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
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = window.localStorage.getItem('ultimate-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [scoreHistory, setScoreHistory] = useState<ScoreEvent[]>([]);

  // Track rotation index for men and women
  const [openIndex, setOpenIndex] = useState(0);
  const [womenIndex, setWomenIndex] = useState(0);
  const [spectator, setSpectator] = useState<SpectatorSnapshot | null>(() =>
    typeof window === 'undefined' ? null : parseSpectatorHash(window.location.hash)
  );

  useEffect(() => {
    const onHash = () => setSpectator(parseSpectatorHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Load team name from localStorage on mount; resume an in-progress game if present.
  useEffect(() => {
    const session = loadGameSession();
    if (session) {
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
      setShowRoster(session.showRoster);
      setSetupStep(session.setupStep);
      setShowHomeScreen(false);
      prevLineIndexRef.current = session.lineIndex;
      setShowHomeScreen(false);
      setSessionReady(true);
      return;
    }

    const savedTeams = localStorage.getItem('ultimate-teams');
    if (savedTeams) {
      try {
        const teams = JSON.parse(savedTeams);
        if (teams.length > 0) {
          setShowHomeScreen(true);
        } else {
          setShowHomeScreen(true);
        }
      } catch (e) {
        console.error('Error loading team:', e);
        setShowHomeScreen(true);
      }
    } else {
      setShowHomeScreen(true);
    }
    setSessionReady(true);
  }, []);

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
    prevLineIndexRef.current = 0;
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
  };

  const handleKickoff = () => {
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
      setPendingPlayers((prev) => [...prev, ...added]);
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

  const handleTeam1ScoreChange = (newScore: number) => {
    if (!gameStarted) return;
    if (newScore <= team1Score) return;
    const currentPattern = getPattern(lineIndex);
    setScoreHistory((prev) => [
      ...prev,
      {
        team: 1,
        lineIndex,
        pointNumber,
        openIndex,
        womenIndex,
        pendingPlayerIds: pendingPlayers.map((p) => p.uuid),
      },
    ]);
    setTeam1Score(newScore);
    setOpenIndex((prev) => prev + currentPattern.men);
    setWomenIndex((prev) => prev + currentPattern.women);
    setLineIndex((prev) => prev + 1);
    setPointNumber((prev) => prev + 1);
  };

  const handleTeam2ScoreChange = (newScore: number) => {
    if (!gameStarted) return;
    if (newScore <= team2Score) return;
    const currentPattern = getPattern(lineIndex);
    setScoreHistory((prev) => [
      ...prev,
      {
        team: 2,
        lineIndex,
        pointNumber,
        openIndex,
        womenIndex,
        pendingPlayerIds: pendingPlayers.map((p) => p.uuid),
      },
    ]);
    setTeam2Score(newScore);
    setOpenIndex((prev) => prev + currentPattern.men);
    setWomenIndex((prev) => prev + currentPattern.women);
    setLineIndex((prev) => prev + 1);
    setPointNumber((prev) => prev + 1);
  };

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
      setPendingPlayers((prev) => prev.filter((p) => p.uuid !== player.uuid));
      const applied = applyPendingActivationsToQueues(
        masterOpenQueue,
        masterWomenQueue,
        [player],
        openIndex,
        womenIndex
      );
      setMasterOpenQueue(applied.masterOpenQueue);
      setMasterWomenQueue(applied.masterWomenQueue);
      setOpenIndex(applied.openIndex);
      setWomenIndex(applied.womenIndex);
    },
    [pendingPlayers, masterOpenQueue, masterWomenQueue, openIndex, womenIndex]
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

    setPendingPlayers((prev) => [...prev, player]);
  };

  useEffect(() => {
    const advanced = lineIndex > prevLineIndexRef.current;
    prevLineIndexRef.current = lineIndex;
    if (!advanced || pendingPlayers.length === 0) return;

    const { activate, stillPending } = partitionPendingForLineChange({
      pendingPlayers,
      masterOpenQueue,
      masterWomenQueue,
      openIndex,
      womenIndex,
      lineIndex,
      startingOpen,
      lineupSize,
      splitCycle,
    });

    if (activate.length > 0) {
      const applied = applyPendingActivationsToQueues(
        masterOpenQueue,
        masterWomenQueue,
        activate,
        openIndex,
        womenIndex
      );
      setMasterOpenQueue(applied.masterOpenQueue);
      setMasterWomenQueue(applied.masterWomenQueue);
      setOpenIndex(applied.openIndex);
      setWomenIndex(applied.womenIndex);
      setPendingPlayers(stillPending);
    }
  }, [lineIndex, openIndex, womenIndex, pointNumber, startingOpen, lineupSize, splitCycle]);

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
    if (!sessionReady || showHomeScreen) return;
    saveGameSession({
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
      showRoster,
      setupStep,
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
    showRoster,
    setupStep,
  ]);

  if (spectator) {
    return (
      <SpectatorScreen
        snapshot={spectator}
        onLeave={() => {
          window.location.hash = '';
          setSpectator(null);
        }}
      />
    );
  }

  // Show loading state briefly while checking localStorage
  if (showHomeScreen === null) {
    return <AppShell showHeader={false} />;
  }

  if (showHomeScreen) {
    return <HomeScreen onStart={handleStartGame} />;
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
          onLineupSizeChange={(size) => {
            setLineupSize(size);
            setStartingOpen((open) => clampOpenCount(open, size));
          }}
          onStartingOpenChange={setStartingOpen}
          onSplitCycleChange={setSplitCycle}
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
        theme={theme}
        onThemeChange={setTheme}
        onReset={handleReset}
        onChangeTeam={handleChangeTeam}
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
