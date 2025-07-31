// ScoreboardApp.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Player } from './src/types';
import { PlayerManager } from './src/components/PlayerManager';
import { ScoreBoard } from './src/components/ScoreBoard';
import { SettingsModal } from './src/components/SettingsModal';
import { rotateQueue, addPlayersToQueue, removePlayersFromQueue, getLine } from './src/utils/lineRotation';
import { COLORS } from './src/constants';
import './src/global.css';
import { GradientBlobs } from './src/components/ScoreBoard';

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
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const [team1Name, setTeam1Name] = useState('Disco Fever');
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
  const [genderRatioMode, setGenderRatioMode] = useState<'ABBA' | '4-3' | '3-4' | 'MEN' | 'WOMEN'>('ABBA');
  const [scoreHistory, setScoreHistory] = useState<ScoreEvent[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  // Countdown logic (moved from ScoreBoard)
  const [halftimeCountdown, setHalftimeCountdown] = useState('');
  const [endCountdown, setEndCountdown] = useState('');
  const [showTimers, setShowTimers] = useState(false);

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
    if (genderRatioMode === 'MEN') return { men: 7, women: 0 };
    if (genderRatioMode === 'WOMEN') return { men: 0, women: 7 };
    // ABBA pattern: A (4M/3W), B (3M/4W), B (3M/4W), A (4M/3W)
    const mod = idx % 4;
    if (mod === 0 || mod === 3) return { men: 4, women: 3 }; // A pattern: 4M + 3W = 7
    return { men: 3, women: 4 }; // B pattern: 3M + 4W = 7
  }, [genderRatioMode]);

  // Web-compatible orientation lock (CSS-based)
  useEffect(() => {
    const lockOrientation = () => {
      try {
        // Use CSS to lock orientation to landscape
        document.documentElement.style.setProperty('--orientation', 'landscape');
        console.log('Orientation locked to landscape via CSS');
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

  function getWrapped<T>(queue: T[], start: number, count: number): T[] {
    if (queue.length === 0) return [];
    const result = [];
    for (let i = 0; i < count; i++) {
      const index = (start + i) % queue.length;
      result.push(queue[index]);
    }
    return result;
  }

  const handleTeam1ScoreChange = (newScore: number) => {
    if (newScore > team1Score) {
      const currentPattern = getPattern(lineIndex);
      setScoreHistory(prev => [...prev, {
        team: 1,
        lineIndex,
        pointNumber,
        openIndex,
        womenIndex,
      }]);
      setTeam1Score(newScore);
      setOpenIndex(prev => prev + currentPattern.men);
      setWomenIndex(prev => prev + currentPattern.women);
      setLineIndex(prev => prev + 1);
      setPointNumber(prev => prev + 1);
    } else {
      setTeam1Score(newScore);
    }
  };

  const handleTeam2ScoreChange = (newScore: number) => {
    if (newScore > team2Score) {
      const currentPattern = getPattern(lineIndex);
      setScoreHistory(prev => [...prev, {
        team: 2,
        lineIndex,
        pointNumber,
        openIndex,
        womenIndex,
      }]);
      setTeam2Score(newScore);
      setOpenIndex(prev => prev + currentPattern.men);
      setWomenIndex(prev => prev + currentPattern.women);
      setLineIndex(prev => prev + 1);
      setPointNumber(prev => prev + 1);
    } else {
      setTeam2Score(newScore);
    }
  };

  const handleReset = () => {
    setTeam1Score(0);
    setTeam2Score(0);
    setLineIndex(0);
    setPointNumber(1);
    setLineHistory([]);
    setScoreHistory([]);
    setGameStarted(false);
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

  const handlePointNumberChange = (point: number) => {
    setPointNumber(point);
  };

  const handleLineIndexChange = (index: number) => {
    // Save current line state to history
    const currentLineState: LineState = {
      openQueue: currentOpenQueue,
      womanQueue: currentWomanQueue,
      lineIndex,
      pointNumber,
    };
    setLineHistory(prev => [...prev, currentLineState]);
    
    // Update indices
    const currentPattern = getPattern(lineIndex);
    const nextPattern = getPattern(index);
    
    setOpenIndex(prev => prev + currentPattern.men);
    setWomenIndex(prev => prev + currentPattern.women);
    setLineIndex(index);
    setPointNumber(1);
  };

  const onRosterChange = (newRoster: Player[]) => {
    console.log('=== onRosterChange Debug ===');
    console.log('New roster:', newRoster.map(p => p.name));
    console.log('Current masterOpenQueue:', masterOpenQueue.map(p => p.name));
    
    const newRosterIds = new Set(newRoster.map(p => p.uuid));
    const removedPlayers = roster.filter(p => !newRosterIds.has(p.uuid));
    const addedPlayers = newRoster.filter(p => !roster.some(rp => rp.uuid === p.uuid));
    
    console.log('Removed players:', removedPlayers.map(p => p.name));
    console.log('Added players:', addedPlayers.map(p => p.name));
  
    let nextMasterOpenQueue = [...masterOpenQueue];
    let nextMasterWomenQueue = [...masterWomenQueue];
    let nextOpenIndex = openIndex;
    let nextWomenIndex = womenIndex;
  
    if (removedPlayers.length > 0) {
      // This is a removal
      const currentPattern = getPattern(lineIndex);
  
      const openLineUUIDs = new Set(getWrapped(masterOpenQueue, openIndex, currentPattern.men).map(p => p.uuid));
      const womenLineUUIDs = new Set(getWrapped(masterWomenQueue, womenIndex, currentPattern.women).map(p => p.uuid));
  
      removedPlayers.forEach(player => {
        const isOnLine = player.gender === 'O' ? openLineUUIDs.has(player.uuid) : womenLineUUIDs.has(player.uuid);
        
        if (isOnLine) {
          // Player on the line was removed. Just filter them out. The line will auto-adjust.
          if (player.gender === 'O') {
            nextMasterOpenQueue = nextMasterOpenQueue.filter(p => p.uuid !== player.uuid);
          } else {
            nextMasterWomenQueue = nextMasterWomenQueue.filter(p => p.uuid !== player.uuid);
          }
        } else {
          // Player not on the line was removed. We need to preserve the line.
          if (player.gender === 'O' && nextMasterOpenQueue.length > 0) {
            const oldQueue = nextMasterOpenQueue;
            const oldLength = oldQueue.length;
            const effectiveStart = nextOpenIndex % oldLength;
            const startPlayer = oldQueue[effectiveStart];
            const rotations = Math.floor(nextOpenIndex / oldLength);
            
            const newQueue = oldQueue.filter(p => p.uuid !== player.uuid);
            
            if (newQueue.length < oldQueue.length) {
              const newLength = newQueue.length;
              const newEffectiveIndex = newQueue.findIndex(p => p.uuid === startPlayer?.uuid);
  
              if (newEffectiveIndex !== -1) {
                nextOpenIndex = rotations * newLength + newEffectiveIndex;
                nextMasterOpenQueue = newQueue;
              }
            }
          } else if (player.gender === 'W' && nextMasterWomenQueue.length > 0) {
            const oldQueue = nextMasterWomenQueue;
            const oldLength = oldQueue.length;
            const effectiveStart = nextWomenIndex % oldLength;
            const startPlayer = oldQueue[effectiveStart];
            const rotations = Math.floor(nextWomenIndex / oldLength);
            
            const newQueue = oldQueue.filter(p => p.uuid !== player.uuid);
  
            if (newQueue.length < oldQueue.length) {
              const newLength = newQueue.length;
              const newEffectiveIndex = newQueue.findIndex(p => p.uuid === startPlayer?.uuid);
    
              if (newEffectiveIndex !== -1) {
                nextWomenIndex = rotations * newLength + newEffectiveIndex;
                nextMasterWomenQueue = newQueue;
              }
            }
          }
        }
      });
    } else if (addedPlayers.length > 0) {
      // This is a late arrival - the player was already added to the queue in handleLateArrival
      // We don't need to do anything here to preserve the queue order
    } else {
      // This is a re-order (drag and drop), not a removal or addition.
      const stillPendingIds = new Set(pendingPlayers.map(p => p.uuid));
      const activePlayers = newRoster.filter(p => !stillPendingIds.has(p.uuid));
      nextMasterOpenQueue = activePlayers.filter(p => p.gender === 'O');
      nextMasterWomenQueue = activePlayers.filter(p => p.gender === 'W');
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
    const tempRoster = assignNumbers([...roster, player]);
    
    const currentPattern = getPattern(lineIndex);
    
    // Check if adding this player to the current queue would put them in the current line
    const simulatedOpenQueue = player.gender === 'O' ? [...masterOpenQueue, player] : masterOpenQueue;
    const simulatedWomenQueue = player.gender === 'W' ? [...masterWomenQueue, player] : masterWomenQueue;
    
    // Normalize indices to be within queue bounds
    const normalizedOpenIndex = masterOpenQueue.length > 0 ? openIndex % masterOpenQueue.length : 0;
    const normalizedWomenIndex = masterWomenQueue.length > 0 ? womenIndex % masterWomenQueue.length : 0;
    
    // Use the same normalized indices for both calculations to compare the same relative positions
    const normalizedSimulatedOpenIndex = normalizedOpenIndex;
    const normalizedSimulatedWomenIndex = normalizedWomenIndex;
    
    // Get the current line without the new player
    const currentLine = getLine(masterOpenQueue, masterWomenQueue, currentPattern, normalizedOpenIndex, normalizedWomenIndex);
    // Get the line with the new player
    const lineWithNewPlayer = getLine(simulatedOpenQueue, simulatedWomenQueue, currentPattern, normalizedSimulatedOpenIndex, normalizedSimulatedWomenIndex);
    
    // Check if the new player would displace someone from the current line
    // A player should only go to pending if they would replace someone currently on the line
    const currentLinePlayerIds = new Set(currentLine.map(p => p.uuid));
    const newLinePlayerIds = new Set(lineWithNewPlayer.map(p => p.uuid));
    
    // Check if any player from the current line is missing from the new line
    const displacedPlayers = currentLine.filter(p => !newLinePlayerIds.has(p.uuid));
    const wouldDisplaceCurrentPlayer = displacedPlayers.length > 0;

    // Debug logging
    console.log('=== Late Arrival Debug ===');
    console.log('Player:', player.name, player.gender);
    console.log('Current pattern:', currentPattern);
    console.log('Current open queue:', masterOpenQueue.map(p => p.name));
    console.log('Current women queue:', masterWomenQueue.map(p => p.name));
    console.log('Open index:', openIndex);
    console.log('Women index:', womenIndex);
    console.log('Normalized open index:', normalizedOpenIndex);
    console.log('Normalized women index:', normalizedWomenIndex);
    console.log('Normalized simulated open index:', normalizedSimulatedOpenIndex);
    console.log('Normalized simulated women index:', normalizedSimulatedWomenIndex);
    console.log('Simulated open queue:', simulatedOpenQueue.map(p => p.name));
    console.log('Simulated women queue:', simulatedWomenQueue.map(p => p.name));
    console.log('Current line without new player:', currentLine.map(p => p.name));
    console.log('Line with new player:', lineWithNewPlayer.map(p => p.name));
    console.log('Player in current line:', currentLine.some(p => p.uuid === player.uuid));
    console.log('Player in new line:', lineWithNewPlayer.some(p => p.uuid === player.uuid));
    console.log('Would displace current player:', wouldDisplaceCurrentPlayer);
    console.log('Point number:', pointNumber);
    console.log('========================');

    setRoster(tempRoster);

    // Check if this is the first point and we need to fill the field
    const isFirstPoint = pointNumber === 1;
    const currentOpenCount = masterOpenQueue.length;
    const currentWomenCount = masterWomenQueue.length;
    const neededOpenCount = currentPattern.men;
    const neededWomenCount = currentPattern.women;
    
    // If it's the first point and we don't have enough players of this gender, 
    // immediately add them to fill the field (don't put them in pending)
    if (isFirstPoint) {
      if (player.gender === 'O' && currentOpenCount < neededOpenCount) {
        setMasterOpenQueue(simulatedOpenQueue);
        setMasterWomenQueue(simulatedWomenQueue);
        return;
      } else if (player.gender === 'W' && currentWomenCount < neededWomenCount) {
        setMasterOpenQueue(simulatedOpenQueue);
        setMasterWomenQueue(simulatedWomenQueue);
        return;
      }
    }

    // Normal pending logic for non-first points or when we have enough players
    if (wouldDisplaceCurrentPlayer) {
        console.log('Adding to pending:', player.name);
        setPendingPlayers(prev => [...prev, player]);
    } else {
        console.log('Adding to queue immediately:', player.name);
        // Append the new player to the end of the correct queue, preserving the current order
        if (player.gender === 'O') {
          setMasterOpenQueue(prev => {
            const newQueue = [...prev, player];
            console.log('New open queue after adding Peter:', newQueue.map(p => p.name));
            
            // Check what the current line would be with the new queue
            const newCurrentLine = getLine(newQueue, masterWomenQueue, currentPattern, normalizedOpenIndex, normalizedWomenIndex);
            console.log('Current line after adding Peter:', newCurrentLine.map(p => p.name));
            
            return newQueue;
          });
          // Maintain the same normalized index when adding a player
          // If current normalized index is 3, we need to keep it at 3 with the new queue length
          const currentNormalizedIndex = openIndex % masterOpenQueue.length;
          const newQueueLength = masterOpenQueue.length + 1;
          const newOpenIndex = currentNormalizedIndex;
          setOpenIndex(newOpenIndex);
        } else {
          setMasterWomenQueue(prev => {
            const newQueue = [...prev, player];
            console.log('New women queue after adding Peter:', newQueue.map(p => p.name));
            return newQueue;
          });
          // Maintain the same normalized index when adding a player
          // If current normalized index is 3, we need to keep it at 3 with the new queue length
          const currentNormalizedIndex = womenIndex % masterWomenQueue.length;
          const newQueueLength = masterWomenQueue.length + 1;
          const newWomenIndex = currentNormalizedIndex;
          setWomenIndex(newWomenIndex);
        }
    }
  };

  // Add effect to check pending players when line changes
  useEffect(() => {
    if (pendingPlayers.length === 0) return;

    const newCurrentPattern = getPattern(lineIndex);
    const playersToActivate: Player[] = [];
    const playersStillPending: Player[] = [];

    const currentOpenCount = masterOpenQueue.length;
    const currentWomenCount = masterWomenQueue.length;
    const neededOpenCount = newCurrentPattern.men;
    const neededWomenCount = newCurrentPattern.women;

    pendingPlayers.forEach(p => {
        const simulatedOpen = p.gender === 'O' ? [...masterOpenQueue, p] : masterOpenQueue;
        const simulatedWomen = p.gender === 'W' ? [...masterWomenQueue, p] : masterWomenQueue;
        const lineWithPendingPlayer = getLine(simulatedOpen, simulatedWomen, newCurrentPattern, openIndex, womenIndex);
        
        // If it's the first point and we need more players of this gender, activate immediately
        if (pointNumber === 1) {
          if (p.gender === 'O' && currentOpenCount < neededOpenCount) {
            playersToActivate.push(p);
            return;
          } else if (p.gender === 'W' && currentWomenCount < neededWomenCount) {
            playersToActivate.push(p);
            return;
          }
        }
        
        // Normal logic: only activate if they wouldn't be in the current line
        if (lineWithPendingPlayer.some(lineP => lineP.uuid === p.uuid)) {
            playersStillPending.push(p);
        } else {
            playersToActivate.push(p);
        }
    });

    if (playersToActivate.length > 0) {
        setMasterOpenQueue(prev => [...prev, ...playersToActivate.filter(p => p.gender === 'O')]);
        setMasterWomenQueue(prev => [...prev, ...playersToActivate.filter(p => p.gender === 'W')]);
        setPendingPlayers(playersStillPending);
    }
  }, [lineIndex, openIndex, womenIndex, pointNumber]);

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

  // Debug ScoreBoard props
  useEffect(() => {
    console.log('=== ScoreBoard Props Debug ===');
    console.log('currentOpenQueue:', currentOpenQueue.map(p => p.name));
    console.log('currentWomanQueue:', currentWomanQueue.map(p => p.name));
    console.log('normalizedOpenIndex:', normalizedOpenIndex);
    console.log('normalizedWomenIndex:', normalizedWomenIndex);
    console.log('openIndex:', openIndex, 'masterOpenQueue.length:', masterOpenQueue.length);
    console.log('normalizedOpenIndex calculation:', openIndex, '%', masterOpenQueue.length, '=', openIndex % masterOpenQueue.length);
    console.log('========================');
  }, [currentOpenQueue, currentWomanQueue, normalizedOpenIndex, normalizedWomenIndex, openIndex, masterOpenQueue.length]);

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
          halftimeCountdown={halftimeCountdown}
          endCountdown={endCountdown}
          showTimers={showTimers}
          setSettingsVisible={setSettingsVisible}
          roster={roster}
          openQueue={currentOpenQueue}
          womanQueue={currentWomanQueue}
          nextOpenQueue={getWrapped(masterOpenQueue, openIndex + getPattern(lineIndex).men, getPattern(lineIndex + 1).men)}
          nextWomanQueue={getWrapped(masterWomenQueue, womenIndex + getPattern(lineIndex).women, getPattern(lineIndex + 1).women)}
          lineHistory={lineHistory}
          scoreHistory={scoreHistory}
          onLateArrival={handleLateArrival}
          pendingPlayers={pendingPlayers}
          gameStarted={gameStarted}
        />
      </div>
      <PlayerManager
        roster={roster}
        onRosterChange={onRosterChange}
        scrollViewRef={scrollViewRef}
        onLateArrival={handleLateArrival}
        pendingPlayers={pendingPlayers}
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
        onReset={handleReset}
        team1Score={team1Score}
        team2Score={team2Score}
        pointNumber={pointNumber}
        lineIndex={lineIndex}
        currentLine={getLine(currentOpenQueue, currentWomanQueue, getPattern(lineIndex), normalizedOpenIndex, normalizedWomenIndex)}
        pendingPlayers={pendingPlayers}
        roster={roster}
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
