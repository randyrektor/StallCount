// ScoreboardApp.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, SafeAreaView, Alert, Platform, Modal, Text, TextInput, Button, TouchableOpacity, Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { Player } from './src/types';
import { PlayerManager } from './src/components/PlayerManager';
import { ScoreBoard } from './src/components/ScoreBoard';
import { rotateQueue, addPlayersToQueue, removePlayersFromQueue, getLine } from './src/utils/lineRotation';
import { COLORS } from './src/constants';
import './src/global.css';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Simple UUID generator
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const initialRoster: Player[] = [
  { uuid: generateUUID(), name: "Rhezie", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Randy", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Evan", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Jen", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Laura", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Danielle", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Haley", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Alyssa", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Morgan", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Ashley", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Nathan", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Sam", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Jordan", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Alex", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Jason", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Keira", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Hannah", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Nathalie", gender: "W", number: 0 },
];

function assignNumbers(roster: Player[]): Player[] {
  let openCount = 1;
  let womanCount = 1;
  return roster.map((player) => {
    if (player.gender === 'O') {
      return { ...player, number: openCount++ };
    } else if (player.gender === 'W') {
      return { ...player, number: womanCount++ };
    } else {
      return { ...player, number: 0 };
    }
  });
}

// Register service worker for PWA support
if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

interface LineState {
  openQueue: Player[];
  womanQueue: Player[];
  lineIndex: number;
  pointNumber: number;
}

// Add a new type for score history
interface ScoreEvent {
  team: 1 | 2;
  lineIndex: number;
  pointNumber: number;
  openIndex: number;
  womenIndex: number;
}

export default function App() {
  const scrollViewRef = useRef<GHScrollView>(null);
  const [team1Name] = useState('Disco Fever');
  const [team2Name, setTeam2Name] = useState('Away');
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [roster, setRoster] = useState(() => {
    const numberedRoster = assignNumbers(initialRoster);
    return numberedRoster;
  });
  const [masterOpenQueue, setMasterOpenQueue] = useState<Player[]>([]);
  const [masterWomenQueue, setMasterWomenQueue] = useState<Player[]>([]);
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [pointNumber, setPointNumber] = useState(1);
  const [lineHistory, setLineHistory] = useState<LineState[]>([]);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<string>('18:45'); // 7:00pm default
  const [halftimeTime, setHalftimeTime] = useState<string>('19:30');   // 7:30pm default
  const [endTime, setEndTime] = useState<string>('20:15');             // 8:15pm default
  const [genderRatioMode, setGenderRatioMode] = useState<'ABBA' | '4-3' | '3-4'>('ABBA');
  const [scoreHistory, setScoreHistory] = useState<ScoreEvent[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  // Countdown logic (moved from ScoreBoard)
  const [halftimeCountdown, setHalftimeCountdown] = useState('');
  const [endCountdown, setEndCountdown] = useState('');

  // Add state for rotation offsets
  const [rotationOffsetOpen, setRotationOffsetOpen] = useState(0);
  const [rotationOffsetWomen, setRotationOffsetWomen] = useState(0);

  // Track rotation index for men and women
  const [openIndex, setOpenIndex] = useState(0);
  const [womenIndex, setWomenIndex] = useState(0);

  // Initialize queues on mount
  useEffect(() => {
    // Only initialize if queues are empty
    if (masterOpenQueue.length === 0 && masterWomenQueue.length === 0) {
      const numbered = assignNumbers(roster);
      const newOpenPlayers = numbered.filter(p => p.gender === 'O');
      const newWomenPlayers = numbered.filter(p => p.gender === 'W');
      setMasterOpenQueue(newOpenPlayers);
      setMasterWomenQueue(newWomenPlayers);
      setOpenIndex(0);
      setWomenIndex(0);
    }
  }, [roster]);

  // Calculate total players used so far for proper rotation
  const getPattern = useCallback((idx: number) => {
    if (genderRatioMode === '4-3') return { men: 4, women: 3 };
    if (genderRatioMode === '3-4') return { men: 3, women: 4 };
    // ABBA pattern: A (4M/3W), B (3M/4W), B (3M/4W), A (4M/3W)
    const mod = idx % 4;
    if (mod === 0 || mod === 3) return { men: 4, women: 3 }; // A pattern: 4M + 3W = 7
    return { men: 3, women: 4 }; // B pattern: 3M + 4W = 7
  }, [genderRatioMode]);

  useEffect(() => {
    const lockOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        console.log('Orientation locked to landscape');
      } catch (error) {
        // Only log if it's not the expected NotSupportedError
        if (!(error instanceof Error && error.name === 'NotSupportedError')) {
          console.error('Error locking orientation:', error);
        }
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
      
      if (!halftimeDate || !endDate) {
        setHalftimeCountdown('00:00');
        setEndCountdown('00:00');
        return;
      }

      // Check if game has started
      if (startDate && now >= startDate) {
        setGameStarted(true);
      }

      // Check if game has ended
      if (endDate && now >= endDate) {
        setGameStarted(false);
      }

      const halftimeMs = halftimeDate.getTime() - now.getTime();
      const endMs = endDate.getTime() - now.getTime();
      
      setHalftimeCountdown(formatCountdown(halftimeMs));
      setEndCountdown(formatCountdown(endMs));
    }, 1000);

    // Initial set
    const now = new Date();
    const startDate = parseTimeToDate(gameStartTime);
    const halftimeDate = parseTimeToDate(halftimeTime);
    const endDate = parseTimeToDate(endTime);
    
    if (!halftimeDate || !endDate) {
      setHalftimeCountdown('00:00');
      setEndCountdown('00:00');
      return;
    }

    // Set initial game started state
    if (startDate && now >= startDate) {
      setGameStarted(true);
    }

    const halftimeMs = halftimeDate.getTime() - now.getTime();
    const endMs = endDate.getTime() - now.getTime();
    
    setHalftimeCountdown(formatCountdown(halftimeMs));
    setEndCountdown(formatCountdown(endMs));

    return () => clearInterval(interval);
  }, [gameStartTime, halftimeTime, endTime]);

  // Helper to get N players from a queue, wrapping if needed
  function getWrapped<T>(queue: T[], start: number, count: number): T[] {
    if (queue.length === 0) return [];
    const result = [];
    for (let i = 0; i < count; i++) {
      const index = (start + i) % queue.length;
      result.push(queue[index]);
    }
    return result;
  }

  // For current line, use the rotation index
  const currentPattern = getPattern(lineIndex);
  const currentOpenQueue = getWrapped(masterOpenQueue, openIndex, currentPattern.men);
  const currentWomanQueue = getWrapped(masterWomenQueue, womenIndex, currentPattern.women);

  // For next line, advance the index by the current pattern size
  const nextPattern = getPattern(lineIndex + 1);
  const nextOpenQueue = getWrapped(masterOpenQueue, (openIndex + currentPattern.men) % masterOpenQueue.length, nextPattern.men);
  const nextWomanQueue = getWrapped(masterWomenQueue, (womenIndex + currentPattern.women) % masterWomenQueue.length, nextPattern.women);

  const handleTeam1ScoreChange = (score: number) => {
    if (score < team1Score) {
      // Undo functionality
      const lastEvent = scoreHistory[scoreHistory.length - 1];
      if (lastEvent) {
        setTeam1Score(team1Score - 1);
        setLineIndex(lastEvent.lineIndex);
        setPointNumber(lastEvent.pointNumber);
        setOpenIndex(lastEvent.openIndex);
        setWomenIndex(lastEvent.womenIndex);
        setScoreHistory(scoreHistory.slice(0, -1));
      }
      return;
    } else if (score > team1Score) {
      // Get the next pattern to determine rotation
      const nextPattern = getPattern(lineIndex + 1);
      // Store current state before updating
      setScoreHistory([...scoreHistory, {
        team: 1,
        lineIndex,
        pointNumber,
        openIndex,
        womenIndex
      }]);
      // Advance the rotation index by the current pattern size
      setOpenIndex((prev) => (prev + currentPattern.men) % masterOpenQueue.length);
      setWomenIndex((prev) => (prev + currentPattern.women) % masterWomenQueue.length);
      setLineIndex(lineIndex + 1);
      setPointNumber(pointNumber + 1);
    }
    setTeam1Score(score);
  };

  const handleTeam2ScoreChange = (score: number) => {
    if (score < team2Score) {
      // Undo functionality
      const lastEvent = scoreHistory[scoreHistory.length - 1];
      if (lastEvent) {
        setTeam2Score(team2Score - 1);
        setLineIndex(lastEvent.lineIndex);
        setPointNumber(lastEvent.pointNumber);
        setOpenIndex(lastEvent.openIndex);
        setWomenIndex(lastEvent.womenIndex);
        setScoreHistory(scoreHistory.slice(0, -1));
      }
      return;
    } else if (score > team2Score) {
      // Get the next pattern to determine rotation
      const nextPattern = getPattern(lineIndex + 1);
      // Store current state before updating
      setScoreHistory([...scoreHistory, {
        team: 2,
        lineIndex,
        pointNumber,
        openIndex,
        womenIndex
      }]);
      // Advance the rotation index by the current pattern size
      setOpenIndex((prev) => (prev + currentPattern.men) % masterOpenQueue.length);
      setWomenIndex((prev) => (prev + currentPattern.women) % masterWomenQueue.length);
      setLineIndex(lineIndex + 1);
      setPointNumber(pointNumber + 1);
    }
    setTeam2Score(score);
  };

  // Reset function
  const handleReset = () => {
    setTeam1Score(0);
    setTeam2Score(0);
    setLineIndex(0);
    setPointNumber(1);
    setOpenIndex(0);
    setWomenIndex(0);
    setLineHistory([]);
    setScoreHistory([]);
    const numberedRoster = assignNumbers(initialRoster);
    setMasterOpenQueue(numberedRoster.filter(p => p.gender === 'O'));
    setMasterWomenQueue(numberedRoster.filter(p => p.gender === 'W'));
  };

  const handlePointNumberChange = (point: number) => {
    setPointNumber(point);
  };

  const handleLineIndexChange = (index: number) => {
    setLineIndex(index);
  };

  // Compute the current line snapshot for ScoreBoard
  const currentLineSnapshot = lineHistory.length > 0
    ? lineHistory[lineHistory.length - 1]
    : { openQueue: masterOpenQueue, womanQueue: masterWomenQueue };

  // Debug logs
  console.log('Current Line:', getLine(currentOpenQueue, currentWomanQueue, currentPattern).map(p => p.name));
  console.log('Next Line:', getLine(nextOpenQueue, nextWomanQueue, nextPattern).map(p => p.name));
  console.log('Current Pattern:', currentPattern);
  console.log('Next Pattern:', nextPattern);
  console.log('Current Total:', currentPattern.men + currentPattern.women);
  console.log('Next Total:', nextPattern.men + nextPattern.women);

  // Add function to handle late arrivals
  const handleLateArrival = (player: Player) => {
    // Check if player would be in current line by simulating adding them to the master queue
    const simulatedMasterOpenQueue = player.gender === 'O' 
      ? [...masterOpenQueue, player]
      : masterOpenQueue;
    const simulatedMasterWomenQueue = player.gender === 'W'
      ? [...masterWomenQueue, player]
      : masterWomenQueue;
    
    // Get the current line from the simulated master queues
    const simulatedCurrentLine = getLine(
      getWrapped(simulatedMasterOpenQueue, openIndex, currentPattern.men),
      getWrapped(simulatedMasterWomenQueue, womenIndex, currentPattern.women),
      currentPattern
    );
    
    const wouldBeInCurrentLine = simulatedCurrentLine.some(p => p.uuid === player.uuid);
    
    if (wouldBeInCurrentLine) {
      // If player would be in current line, add to pending
      setPendingPlayers(prev => [...prev, player]);
    } else {
      // If player would not be in current line, add directly to rotation
      if (player.gender === 'O') {
        setMasterOpenQueue(prev => [...prev, player]);
      } else {
        setMasterWomenQueue(prev => [...prev, player]);
      }
      // Add to roster immediately
      setRoster(prev => {
        const updated = [...prev, player];
        return assignNumbers(updated);
      });
    }
  };

  // Add effect to check pending players when line changes
  useEffect(() => {
    if (pendingPlayers.length === 0) return;

    // Only process pending players when the line changes
    const currentLine = getLine(currentOpenQueue, currentWomanQueue, currentPattern);
    const allCurrentLinePlayers = new Set(currentLine.map(p => p.uuid));
    
    // Try to add any pending players that aren't in current line
    pendingPlayers.forEach(player => {
      if (!allCurrentLinePlayers.has(player.uuid)) {
        // Add to the appropriate queue
        if (player.gender === 'O') {
          setMasterOpenQueue(prev => [...prev, player]);
        } else {
          setMasterWomenQueue(prev => [...prev, player]);
        }
        
        // Add to roster when no longer pending
        setRoster(prev => {
          const updated = [...prev, player];
          return assignNumbers(updated);
        });
        
        // Remove from pending players
        setPendingPlayers(prev => prev.filter(p => p.uuid !== player.uuid));
      }
    });
  }, [lineIndex]); // Only run when lineIndex changes

  // Add effect to handle roster changes without resetting queues
  useEffect(() => {
    // Get current line players
    const currentLine = getLine(currentOpenQueue, currentWomanQueue, currentPattern);
    const currentLinePlayerIds = new Set(currentLine.map(p => p.uuid));
    
    // Check if any deleted players were in the current line
    const deletedPlayers = roster.filter(p => !currentLinePlayerIds.has(p.uuid));
    const anyDeletedInCurrentLine = deletedPlayers.some(p => currentLinePlayerIds.has(p.uuid));
    
    // Only update master queues if no players in current line were deleted
    if (!anyDeletedInCurrentLine) {
      // Update the master queues with the new roster order, maintaining existing numbers
      const newOpenPlayers = roster.filter(p => p.gender === 'O');
      const newWomenPlayers = roster.filter(p => p.gender === 'W');
      
      // Calculate new indices to maintain the same relative position
      const newOpenIndex = Math.min(openIndex, newOpenPlayers.length - 1);
      const newWomenIndex = Math.min(womenIndex, newWomenPlayers.length - 1);
      
      setMasterOpenQueue(newOpenPlayers);
      setMasterWomenQueue(newWomenPlayers);
      setOpenIndex(newOpenIndex);
      setWomenIndex(newWomenIndex);
    }
  }, [roster, genderRatioMode]);

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
  }, [genderRatioMode]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.content}>
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
          genderRatioMode={genderRatioMode}
          halftimeCountdown={halftimeCountdown}
          endCountdown={endCountdown}
          setSettingsVisible={setSettingsVisible}
          roster={roster}
          openQueue={getWrapped(masterOpenQueue, openIndex, getPattern(lineIndex).men)}
          womanQueue={getWrapped(masterWomenQueue, womenIndex, getPattern(lineIndex).women)}
          nextOpenQueue={getWrapped(masterOpenQueue, openIndex + getPattern(lineIndex).men, getPattern(lineIndex + 1).men)}
          nextWomanQueue={getWrapped(masterWomenQueue, womenIndex + getPattern(lineIndex).women, getPattern(lineIndex + 1).women)}
          lineHistory={lineHistory}
          scoreHistory={scoreHistory}
          onLateArrival={handleLateArrival}
          pendingPlayers={pendingPlayers}
          gameStarted={gameStarted}
        />
        <PlayerManager
          roster={roster}
          onRosterChange={setRoster}
          scrollViewRef={scrollViewRef}
          onLateArrival={handleLateArrival}
          pendingPlayers={pendingPlayers}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    // Add appropriate styles for the header
  },
  content: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
});
