import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Dimensions } from 'react-native';
import { Player } from '../types';
import { getLine, getNextLine, getGenderBreakdown, rotateQueue } from '../utils/lineRotation';
import { commonStyles } from '../styles/common';

// Modern color palette
const COLORS = {
  background: '#1d1d1d',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  open: '#4a90e2', // Modern blue
  women: '#e83e8c', // Modern pink
  openMuted: '#324a6a', // Medium muted blue
  womenMuted: '#6a324a', // Medium muted pink
  scoreButtonMinus: '#e74c3c',
  scoreButtonPlus: '#2ecc71',
  border: '#404040',
  input: '#333333',
};

// Gradient blob colors
const BLOB_COLORS = {
  blue: 'rgba(74, 144, 226, 0.15)',  // COLORS.open with low opacity
  pink: 'rgba(232, 62, 140, 0.15)',  // COLORS.women with low opacity
  purple: 'rgba(147, 51, 234, 0.15)', // Additional accent color
};

const GradientBlobs = () => {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />
    </View>
  );
};

interface ScoreBoardProps {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  onTeam1ScoreChange: (score: number) => void;
  onTeam2ScoreChange: (score: number) => void;
  lineIndex: number;
  pointNumber: number;
  onReset: () => void;
  genderRatioMode?: 'ABBA' | '4-3' | '3-4';
  halftimeCountdown: string;
  endCountdown: string;
  setSettingsVisible: (visible: boolean) => void;
  roster: Player[];
  openQueue: Player[];
  womanQueue: Player[];
  nextOpenQueue: Player[];
  nextWomanQueue: Player[];
  lineHistory: any[];
  scoreHistory: any[];
  onLateArrival: (player: Player) => void;
  pendingPlayers: Player[];
  gameStarted: boolean;
}

export function ScoreBoard({
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  onTeam1ScoreChange,
  onTeam2ScoreChange,
  lineIndex,
  pointNumber,
  onReset,
  genderRatioMode = 'ABBA',
  halftimeCountdown,
  endCountdown,
  setSettingsVisible,
  roster,
  openQueue,
  womanQueue,
  nextOpenQueue,
  nextWomanQueue,
  lineHistory,
  scoreHistory,
  onLateArrival,
  pendingPlayers,
  gameStarted
}: ScoreBoardProps) {
  const [flashTeam, setFlashTeam] = useState<null | 1 | 2>(null);
  const patternIndex = lineIndex % 4;
  
  // Defensive: default all queues to empty arrays if undefined
  openQueue = openQueue || [];
  womanQueue = womanQueue || [];
  nextOpenQueue = nextOpenQueue || [];
  nextWomanQueue = nextWomanQueue || [];

  // Use openQueue and womanQueue from props for current line
  const openPlayers = openQueue;
  const womenPlayers = womanQueue;

  function getPattern(idx: number) {
    if (genderRatioMode === '4-3') return { men: 4, women: 3 };
    if (genderRatioMode === '3-4') return { men: 3, women: 4 };
    const mod = idx % 4;
    if (mod === 0 || mod === 3) return { men: 4, women: 3 };
    return { men: 3, women: 4 };
  }

  // Get the current pattern
  const currentPattern = getPattern(lineIndex);
  
  // Get the current line without additional rotation
  const currentLine = (openPlayers.length > 0 && womenPlayers.length > 0)
    ? getLine(openPlayers, womenPlayers, currentPattern)
    : [];

  // Next line preview
  const isLastA = lineIndex % 4 === 3;
  const nextPattern = isLastA ? { men: 4, women: 3 } : getPattern(lineIndex + 1);
  // Do not rotate again, just slice the window
  const nextLine = getLine(
    nextOpenQueue,
    nextWomanQueue,
    nextPattern
  );

  const scoreDiff = team1Score - team2Score;
  const scoreDiffText = scoreDiff === 0 ? '0' : `${scoreDiff > 0 ? '+' : ''}${scoreDiff}`;

  const isMobile = Dimensions.get('window').width < 600;

  return (
    <View style={styles.container}>
      <GradientBlobs />
      {/* Timers and settings in black card area only */}
      <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
        <View style={[styles.timersContainer, isMobile && styles.timersContainerMobile]}>
          {gameStarted && (
            <>
              <Text style={styles.timerText}>Halftime in: {halftimeCountdown}</Text>
              <Text style={styles.timerText}>Game ends: {endCountdown}</Text>
            </>
          )}
        </View>
        <View style={styles.topBarButtons}>
          {scoreHistory.length > 0 && (
            <TouchableOpacity 
              style={[styles.undoButton, isMobile && styles.undoButtonMobile]} 
              onPress={() => {
                const lastEvent = scoreHistory[scoreHistory.length - 1];
                if (lastEvent.team === 1) {
                  onTeam1ScoreChange(team1Score - 1);
                } else {
                  onTeam2ScoreChange(team2Score - 1);
                }
              }}
            >
              <Text style={styles.undoButtonText}>UNDO</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.settingsButton, isMobile && styles.settingsButtonMobile]} 
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.settingsButtonText}>SETTINGS</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.teamBox, flashTeam === 1 && styles.flash]}
          activeOpacity={0.7}
          onPress={() => {
            setFlashTeam(1);
            onTeam1ScoreChange(team1Score + 1);
            setTimeout(() => setFlashTeam(null), 150);
          }}
        >
          <Text style={styles.teamName}>{team1Name}</Text>
          <Text style={[styles.score, isMobile && styles.scoreMobile]}>{team1Score}</Text>
        </TouchableOpacity>
        {!isMobile && (
          <View style={styles.scoreDiffContainer}>
            <Text style={[
              styles.scoreDiff,
              scoreDiff > 0 && styles.scoreDiffPositive,
              scoreDiff < 0 && styles.scoreDiffNegative
            ]}>
              {scoreDiffText}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.teamBox, flashTeam === 2 && styles.flash]}
          activeOpacity={0.7}
          onPress={() => {
            setFlashTeam(2);
            onTeam2ScoreChange(team2Score + 1);
            setTimeout(() => setFlashTeam(null), 150);
          }}
        >
          <Text style={styles.teamName}>{team2Name}</Text>
          <Text style={[styles.score, isMobile && styles.scoreMobile]}>{team2Score}</Text>
        </TouchableOpacity>
      </View>
      {/* Point ABBA line with score diff on mobile */}
      <View style={styles.lineInfo}>
        <View style={styles.lineInfoLeft}>
          <Text style={styles.lineInfoText}>Point {pointNumber}</Text>
          {genderRatioMode === 'ABBA' && (
            <View style={styles.patternDisplay}>
              <View style={[styles.patternItem, patternIndex % 4 === 0 && styles.patternItemActive]}>
                <Text style={styles.patternText}>A</Text>
              </View>
              <View style={[styles.patternItem, patternIndex % 4 === 1 && styles.patternItemActive]}>
                <Text style={styles.patternText}>B</Text>
              </View>
              <View style={[styles.patternItem, patternIndex % 4 === 2 && styles.patternItemActive]}>
                <Text style={styles.patternText}>B</Text>
              </View>
              <View style={[styles.patternItem, patternIndex % 4 === 3 && styles.patternItemActive]}>
                <Text style={styles.patternText}>A</Text>
              </View>
            </View>
          )}
        </View>
        {isMobile && (
          <View style={styles.scoreDiffContainerMobileLine}>
            <Text style={[
              styles.scoreDiff,
              scoreDiff > 0 && styles.scoreDiffPositive,
              scoreDiff < 0 && styles.scoreDiffNegative
            ]}>
              {scoreDiffText}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.lineDisplay}>
        <View style={styles.lineSection}>
          <Text style={styles.lineTitle}>Current Line</Text>
          <View style={styles.playerListVertical}>
            {currentLine.map((player: Player, index: number) => (
              <View 
                key={index} 
                style={[
                  styles.playerContainer,
                  { backgroundColor: player.gender === 'O' ? COLORS.open : COLORS.women }
                ]}
              >
                <Text style={styles.playerText}>
                  {player.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.lineSection}>
          <Text style={styles.lineTitle}>Next Line</Text>
          <View style={styles.playerListVertical}>
            {nextLine.map((player: Player, index: number) => (
              <View 
                key={index} 
                style={[
                  styles.playerContainer,
                  { backgroundColor: player.gender === 'O' ? COLORS.openMuted : COLORS.womenMuted }
                ]}
              >
                <Text style={[styles.playerText, { color: COLORS.textSecondary }]}> 
                  {player.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.cardContainer,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  topBarMobile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  timersContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  timersContainerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  timerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingsButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  settingsButtonMobile: {
    marginLeft: 0,
    marginRight: 0,
    alignSelf: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
    position: 'relative',
    paddingHorizontal: 0,
    gap: 10,
  },
  teamBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(81, 80, 83, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 5,
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  scoreRowMobile: {
    gap: 4,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  scoreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  scoreButtonPlus: {
    backgroundColor: COLORS.scoreButtonPlus,
  },
  scoreButtonMinus: {
    backgroundColor: COLORS.scoreButtonMinus,
  },
  scoreButtonText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
    marginHorizontal: 10,
    color: COLORS.text,
    minWidth: 40,
    textAlign: 'center',
  },
  scoreMobile: {
    marginHorizontal: 4,
  },
  scoreDiffContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    marginBottom: 8,
  },
  scoreDiffContainerMobileLine: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 8,
  },
  scoreDiff: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 36,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  scoreDiffPositive: {
    color: '#2ecc71',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  scoreDiffNegative: {
    color: '#e74c3c',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  lineInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(81, 80, 83, 0.3)',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 5,
  },
  lineInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lineInfoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  patternDisplay: {
    flexDirection: 'row',
    gap: 8,
  },
  patternItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  patternItemActive: {
    backgroundColor: COLORS.open,
  },
  patternText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  lineDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineSection: {
    flex: 1,
    backgroundColor: 'rgba(81, 80, 83, 0.3)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 5,
  },
  lineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: COLORS.text,
  },
  playerListVertical: {
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  playerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  playerText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: COLORS.scoreButtonMinus,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  resetButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  flash: {
    backgroundColor: '#2ecc71', // quick green flash
  },
  topBarButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  undoButton: {
    backgroundColor: COLORS.scoreButtonMinus,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  undoButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  undoButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Add new blob styles
  blob: {
    position: 'absolute',
    borderRadius: 1000,
    filter: 'blur(80px)',
    opacity: 0.7,
  },
  blob1: {
    width: 500,
    height: 500,
    backgroundColor: BLOB_COLORS.blue,
    top: -100,
    left: -100,
    transform: [{ scale: 1.2 }],
  },
  blob2: {
    width: 500,
    height: 500,
    backgroundColor: BLOB_COLORS.pink,
    bottom: -50,
    right: -50,
    transform: [{ scale: 1.1 }],
  },
  blob3: {
    width: 550,
    height: 550,
    backgroundColor: BLOB_COLORS.purple,
    top: '90%',
    left: '30%',
    transform: [{ scale: 0.9 }],
  },
}); 