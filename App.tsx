// ScoreboardApp.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Player, type GenderRatioMode, type LineupSize } from './src/types';
import { PlayerManager } from './src/components/PlayerManager';
import { ScoreBoard } from './src/components/ScoreBoard';
import { SettingsModal } from './src/components/SettingsModal';
import { HomeScreen } from './src/components/HomeScreen';
import { RosterSetup } from './src/components/RosterSetup';
import { getLine, getWrapped } from './src/utils/lineRotation';
import {
  applySubstitutionToQueue,
  mergeRosterFromGenderQueues,
  assignNumbersByGender,
  getGenderPattern,
  insertPlayerAtGenderEndOfRoster,
} from './src/utils/rotationHelpers';
import {
  expandRawIndexAfterQueueAppend,
  applyQueueRemovalsForRosterChange,
  applyDragReorderToMasterQueues,
  partitionPendingForLineChange,
  applyPendingActivationsToQueues,
} from './src/utils/rosterManagerLogic';
import { COLORS } from './src/constants';
import { loadRosterForTeam, saveRosterForTeam } from './src/utils/rosterStorage';
import './src/global.css';
import { GradientBlobs } from './src/components/ScoreBoard';

// No hardcoded roster - players are added each game

const assignNumbers = assignNumbersByGender;

interface ScoreEvent {
  team: 1 | 2;
  lineIndex: number;
  pointNumber: number;
  openIndex: number;
  womenIndex: number;
}

export default function App() {
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const [showHomeScreen, setShowHomeScreen] = useState<boolean | null>(null); // null = loading
  const [showRosterSetup, setShowRosterSetup] = useState(false);
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('Away');
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [roster, setRoster] = useState<Player[]>([]);
  const [masterOpenQueue, setMasterOpenQueue] = useState<Player[]>([]);
  const [masterWomenQueue, setMasterWomenQueue] = useState<Player[]>([]);
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [pointNumber, setPointNumber] = useState(1);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<string>('18:45'); // 7:00pm default
  const [halftimeTime, setHalftimeTime] = useState<string>('19:30');   // 7:30pm default
  const [endTime, setEndTime] = useState<string>('20:15');             // 8:15pm default
  const [genderRatioMode, setGenderRatioMode] = useState<GenderRatioMode>('ABBA');
  const [lineupSize, setLineupSize] = useState<LineupSize>(7);
  const [scoreHistory, setScoreHistory] = useState<ScoreEvent[]>([]);

  // Countdown logic (moved from ScoreBoard)
  const [halftimeCountdown, setHalftimeCountdown] = useState('');
  const [endCountdown, setEndCountdown] = useState('');
  const [showTimers, setShowTimers] = useState(false);

  // Track rotation index for men and women
  const [openIndex, setOpenIndex] = useState(0);
  const [womenIndex, setWomenIndex] = useState(0);

  // Load team name from localStorage on mount
  useEffect(() => {
    const savedTeams = localStorage.getItem('ultimate-teams');
    if (savedTeams) {
      try {
        const teams = JSON.parse(savedTeams);
        if (teams.length > 0) {
          // Don't auto-load anymore - always show home screen
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

    const saved = loadRosterForTeam(trimmed);
    if (saved && saved.length > 0) {
      applyNewGameRoster(saved);
      setShowRosterSetup(false);
    } else {
      setRoster([]);
      setMasterOpenQueue([]);
      setMasterWomenQueue([]);
      setShowRosterSetup(true);
    }
  };

  const handleRosterComplete = (newRoster: Player[]) => {
    applyNewGameRoster(newRoster);
    setShowRosterSetup(false);
  };

  const handleBackToHomeScreen = () => {
    setShowRosterSetup(false);
    setShowHomeScreen(true);
  };

  const handleChangeTeam = () => {
    setShowHomeScreen(true);
    setShowRosterSetup(false);
  };

  // Queues are initialized when roster is completed in handleRosterComplete

  // Calculate total players used so far for proper rotation
  const getPattern = useCallback(
    (idx: number) => getGenderPattern(idx, genderRatioMode, lineupSize),
    [genderRatioMode, lineupSize]
  );

  // Web-compatible orientation lock (CSS-based)
  useEffect(() => {
    const lockOrientation = () => {
      try {
        document.documentElement.style.setProperty('--orientation', 'landscape');
      } catch (error) {
        console.error('Error setting orientation:', error);
      }
    };
    lockOrientation();
  }, []);

  useEffect(() => {
    function parseTimeToDate(timeStr: string | undefined): Date | null {
      if (!timeStr) return null;
      const now = new Date();
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      // If the time has already passed today, set it to today instead of tomorrow
      if (d < now) {
        d.setDate(d.getDate());
      }
      return d;
    }

    function formatCountdown(ms: number): string {
      if (ms <= 0) return '00:00';
      const totalSeconds = Math.floor(ms / 1000);
      const min = Math.floor(totalSeconds / 60);
      const sec = totalSeconds % 60;
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const startDate = parseTimeToDate(gameStartTime);
      const halftimeDate = parseTimeToDate(halftimeTime);
      const endDate = parseTimeToDate(endTime);
      
      if (!startDate || !halftimeDate || !endDate) {
        setHalftimeCountdown('');
        setEndCountdown('');
        setShowTimers(false);
        return;
      }

      // Check if current time is >= game start time
      const isGameStarted = now >= startDate;
      
      // Check if we're within 1 hour after game end
      const oneHourAfterEnd = new Date(endDate.getTime() + 60 * 60 * 1000);
      const isWithinOneHourAfterEnd = now <= oneHourAfterEnd;
      
      // Only show timers if game has started and we're not more than 1 hour after end
      const shouldShowTimers = isGameStarted && isWithinOneHourAfterEnd;
      setShowTimers(shouldShowTimers);

      if (shouldShowTimers) {
        const halftimeMs = halftimeDate.getTime() - now.getTime();
        const endMs = endDate.getTime() - now.getTime();

        setHalftimeCountdown(formatCountdown(halftimeMs));
        setEndCountdown(formatCountdown(endMs));
      } else {
        setHalftimeCountdown('');
        setEndCountdown('');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStartTime, halftimeTime, endTime]);

  // Calculate current queues based on rotation
  const currentPattern = getPattern(lineIndex);
  
  // Normalize indices to be within queue bounds
  const normalizedOpenIndex = masterOpenQueue.length > 0 ? openIndex % masterOpenQueue.length : 0;
  const normalizedWomenIndex = masterWomenQueue.length > 0 ? womenIndex % masterWomenQueue.length : 0;
  
  const currentOpenQueue = getWrapped(masterOpenQueue, normalizedOpenIndex, currentPattern.men);
  const currentWomanQueue = getWrapped(masterWomenQueue, normalizedWomenIndex, currentPattern.women);

  const handleTeam1ScoreChange = (newScore: number) => {
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
      },
    ]);
    setTeam1Score(newScore);
    setOpenIndex((prev) => prev + currentPattern.men);
    setWomenIndex((prev) => prev + currentPattern.women);
    setLineIndex((prev) => prev + 1);
    setPointNumber((prev) => prev + 1);
  };

  const handleTeam2ScoreChange = (newScore: number) => {
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
        [player]
      );
      setMasterOpenQueue(applied.masterOpenQueue);
      setMasterWomenQueue(applied.masterWomenQueue);
    },
    [pendingPlayers, masterOpenQueue, masterWomenQueue]
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
    
    // Get the last score event
    const lastEvent = scoreHistory[scoreHistory.length - 1];
    
    // Revert the score
    if (lastEvent.team === 1) {
      setTeam1Score(prev => prev - 1);
    } else {
      setTeam2Score(prev => prev - 1);
    }
    
    // Restore the previous line state
    setLineIndex(lastEvent.lineIndex);
    setPointNumber(lastEvent.pointNumber);
    setOpenIndex(lastEvent.openIndex);
    setWomenIndex(lastEvent.womenIndex);
    
    // Remove the last event from history
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
      // Late arrival already updated queues in handleLateArrival
    } else {
      const stillPendingIds = new Set(pendingPlayers.map(p => p.uuid));
      const activePlayers = newRoster.filter(p => !stillPendingIds.has(p.uuid));
      const pat = getPattern(lineIndex);
      const normO =
        nextMasterOpenQueue.length > 0
          ? nextOpenIndex % nextMasterOpenQueue.length
          : 0;
      const normW =
        nextMasterWomenQueue.length > 0
          ? nextWomenIndex % nextMasterWomenQueue.length
          : 0;
      const desiredOpenSlice = getWrapped(
        nextMasterOpenQueue,
        normO,
        pat.men
      );
      const desiredWomenSlice = getWrapped(
        nextMasterWomenQueue,
        normW,
        pat.women
      );
      const reordered = applyDragReorderToMasterQueues({
        masterOpenQueue: nextMasterOpenQueue,
        masterWomenQueue: nextMasterWomenQueue,
        openIndex: nextOpenIndex,
        womenIndex: nextWomenIndex,
        newRosterActivePlayers: activePlayers,
        desiredOpenLineSlice: desiredOpenSlice,
        desiredWomenLineSlice: desiredWomenSlice,
        openSliceLen: pat.men,
        womenSliceLen: pat.women,
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
    const tempRoster = assignNumbers(insertPlayerAtGenderEndOfRoster(roster, player));
    const currentPattern = getPattern(lineIndex);
    const isFirstPoint = pointNumber === 1;
    const currentOpenCount = masterOpenQueue.length;
    const currentWomenCount = masterWomenQueue.length;
    const neededOpenCount = currentPattern.men;
    const neededWomenCount = currentPattern.women;

    const simulatedOpenQueue =
      player.gender === 'O' ? [...masterOpenQueue, player] : masterOpenQueue;
    const simulatedWomenQueue =
      player.gender === 'W' ? [...masterWomenQueue, player] : masterWomenQueue;

    const fillsEmptySlotOnPointOne =
      isFirstPoint &&
      ((player.gender === 'O' && currentOpenCount < neededOpenCount) ||
        (player.gender === 'W' && currentWomenCount < neededWomenCount));

    setRoster(tempRoster);

    // Point 1 only: if we're short this gender to cover the line, add straight into rotation.
    // Otherwise mid-game adds stay off the rotation until pending logic puts them in (never same point).
    if (fillsEmptySlotOnPointOne) {
      if (player.gender === 'O') {
        const oldLen = masterOpenQueue.length;
        setMasterOpenQueue(simulatedOpenQueue);
        setMasterWomenQueue(simulatedWomenQueue);
        if (oldLen > 0) {
          setOpenIndex((idx) =>
            expandRawIndexAfterQueueAppend(idx, oldLen, simulatedOpenQueue.length)
          );
        }
      } else {
        const oldLen = masterWomenQueue.length;
        setMasterOpenQueue(simulatedOpenQueue);
        setMasterWomenQueue(simulatedWomenQueue);
        if (oldLen > 0) {
          setWomenIndex((idx) =>
            expandRawIndexAfterQueueAppend(idx, oldLen, simulatedWomenQueue.length)
          );
        }
      }
      return;
    }

    setPendingPlayers((prev) => [...prev, player]);
  };

  useEffect(() => {
    if (pendingPlayers.length === 0) return;

    const { activate, stillPending } = partitionPendingForLineChange({
      pendingPlayers,
      masterOpenQueue,
      masterWomenQueue,
      openIndex,
      womenIndex,
      lineIndex,
      pointNumber,
      genderRatioMode,
      lineupSize,
    });

    if (activate.length > 0) {
      const applied = applyPendingActivationsToQueues(
        masterOpenQueue,
        masterWomenQueue,
        activate
      );
      setMasterOpenQueue(applied.masterOpenQueue);
      setMasterWomenQueue(applied.masterWomenQueue);
      setPendingPlayers(stillPending);
    }
  }, [lineIndex, openIndex, womenIndex, pointNumber, genderRatioMode, lineupSize]);

  // Add effect to handle gender ratio mode changes
  useEffect(() => {
    // When gender ratio mode changes, update the master queues with the current roster order
    const newOpenPlayers = roster.filter(p => p.gender === 'O');
    const newWomenPlayers = roster.filter(p => p.gender === 'W');
    
    // Calculate new indices to maintain the same relative position
    const newOpenIndex = Math.min(openIndex, newOpenPlayers.length - 1);
    const newWomenIndex = Math.min(womenIndex, newWomenPlayers.length - 1);
    
    setMasterOpenQueue(newOpenPlayers);
    setMasterWomenQueue(newWomenPlayers);
    setOpenIndex(newOpenIndex);
    setWomenIndex(newWomenIndex);
  }, [genderRatioMode, lineupSize]);

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
    if (showHomeScreen || showRosterSetup) return;
    const key = team1Name.trim();
    if (!key) return;
    saveRosterForTeam(key, roster);
  }, [roster, team1Name, showHomeScreen, showRosterSetup]);

  // Show loading state briefly while checking localStorage
  if (showHomeScreen === null) {
    return (
      <div style={styles.container}>
        <GradientBlobs />
      </div>
    );
  }

  if (showHomeScreen) {
    return <HomeScreen onStart={handleStartGame} />;
  }

  if (showRosterSetup) {
    return (
      <RosterSetup
        teamName={team1Name}
        onComplete={handleRosterComplete}
        onBack={handleBackToHomeScreen}
      />
    );
  }

  return (
    <div style={styles.container}>
      <GradientBlobs />
      <div style={styles.mainContent}>
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
          genderRatioMode={genderRatioMode}
          lineupSize={lineupSize}
          halftimeCountdown={halftimeCountdown}
          endCountdown={endCountdown}
          showTimers={showTimers}
          setSettingsVisible={setSettingsVisible}
          roster={roster}
          openQueue={currentOpenQueue}
          womanQueue={currentWomanQueue}
          nextOpenQueue={getWrapped(masterOpenQueue, openIndex + getPattern(lineIndex).men, getPattern(lineIndex + 1).men)}
          nextWomanQueue={getWrapped(masterWomenQueue, womenIndex + getPattern(lineIndex).women, getPattern(lineIndex + 1).women)}
          scoreHistory={scoreHistory}
          onSubstitute={handleSubstitute}
        />
      </div>
      <PlayerManager
        roster={roster}
        onRosterChange={onRosterChange}
        scrollViewRef={scrollViewRef}
        onLateArrival={handleLateArrival}
        pendingPlayers={pendingPlayers}
        masterOpenQueue={masterOpenQueue}
        masterWomenQueue={masterWomenQueue}
        onForcePendingToRotation={handleForcePendingToRotation}
      />
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        team1Name={team1Name}
        team2Name={team2Name}
        onTeam1NameChange={setTeam1Name}
        onTeam2NameChange={setTeam2Name}
        gameStartTime={gameStartTime}
        halftimeTime={halftimeTime}
        endTime={endTime}
        onGameStartTimeChange={setGameStartTime}
        onHalftimeTimeChange={setHalftimeTime}
        onEndTimeChange={setEndTime}
        genderRatioMode={genderRatioMode}
        onGenderRatioModeChange={setGenderRatioMode}
        lineupSize={lineupSize}
        onLineupSizeChange={setLineupSize}
        onReset={handleReset}
        onChangeTeam={handleChangeTeam}
        team1Score={team1Score}
        team2Score={team2Score}
        pointNumber={pointNumber}
        lineIndex={lineIndex}
        currentLine={getLine(currentOpenQueue, currentWomanQueue, getPattern(lineIndex), normalizedOpenIndex, normalizedWomenIndex)}
        pendingPlayers={pendingPlayers}
        roster={roster}
        masterOpenQueue={masterOpenQueue}
        masterWomenQueue={masterWomenQueue}
      />
    </div>
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
