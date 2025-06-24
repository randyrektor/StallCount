import React, { useState, useEffect } from 'react';
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
  openMuted: 'rgba(74, 144, 226, 0.5)',
  womenMuted: 'rgba(232, 62, 140, 0.5)',
  scoreButtonMinus: '#e74c3c',
  scoreButtonPlus: '#2ecc71',
  border: '#404040',
  input: '#333333',
  delete: '#e74c3c',
};

// Gradient blob colors
const BLOB_COLORS = {
  blue: 'rgba(74, 144, 226, 0.15)',
  pink: 'rgba(232, 62, 140, 0.15)',
  purple: 'rgba(147, 51, 234, 0.15)',
};

// Add CSS keyframes for flash animation
const flashKeyframes = `
  @keyframes scoreFlash {
    0% {
      background-color: rgba(255, 255, 255, 0.05);
      border-color: transparent;
      box-shadow: none;
      transform: scale(1);
    }
    40% {
      background-color: rgba(46, 204, 113, 0.4);
      border-color: rgba(46, 204, 113, 0.9);
      box-shadow: 0 0 20px rgba(46, 204, 113, 0.7);
      transform: scale(1.02);
    }
    100% {
      background-color: rgba(255, 255, 255, 0.05);
      border-color: transparent;
      box-shadow: none;
      transform: scale(1);
    }
  }
`;

// Inject the keyframes into the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = flashKeyframes;
  document.head.appendChild(style);
}

export const GradientBlobs = () => {
  return (
    <div style={styles.blobsContainer}>
      <div style={{ ...styles.blob, ...styles.blob1 }} />
      <div style={{ ...styles.blob, ...styles.blob2 }} />
      <div style={{ ...styles.blob, ...styles.blob3 }} />
    </div>
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
  onUndo: () => void;
  genderRatioMode?: 'ABBA' | '4-3' | '3-4' | 'MEN' | 'WOMEN';
  halftimeCountdown: string;
  endCountdown: string;
  showTimers: boolean;
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
  onUndo,
  genderRatioMode = 'ABBA',
  halftimeCountdown,
  endCountdown,
  showTimers,
  setSettingsVisible,
  roster,
  openQueue,
  womanQueue,
  nextOpenQueue,
  nextWomanQueue,
  scoreHistory,
}: ScoreBoardProps) {
  const patternIndex = lineIndex % 4;
  const [isAnimating, setIsAnimating] = useState(false);
  const [flashTeam1, setFlashTeam1] = useState(false);
  const [flashTeam2, setFlashTeam2] = useState(false);

  openQueue = openQueue || [];
  womanQueue = womanQueue || [];
  nextOpenQueue = nextOpenQueue || [];
  nextWomanQueue = nextWomanQueue || [];

  const openPlayers = openQueue;
  const womenPlayers = womanQueue;

  function getPattern(idx: number) {
    if (genderRatioMode === '4-3') return { men: 4, women: 3 };
    if (genderRatioMode === '3-4') return { men: 3, women: 4 };
    if (genderRatioMode === 'MEN') return { men: 7, women: 0 };
    if (genderRatioMode === 'WOMEN') return { men: 0, women: 7 };
    const mod = idx % 4;
    if (mod === 0 || mod === 3) return { men: 4, women: 3 };
    return { men: 3, women: 4 };
  }

  const currentPattern = getPattern(lineIndex);
  const currentLine = getLine(openPlayers, womenPlayers, currentPattern);

  const nextPattern = getPattern(lineIndex + 1);
  const nextLine = getLine(nextOpenQueue, nextWomanQueue, nextPattern);

  const scoreDiff = team1Score - team2Score;

  const handleScoreClick = (team: 'team1' | 'team2') => {
    if (isAnimating) return;
    setIsAnimating(true);
    if (team === 'team1') {
      setFlashTeam1(true);
      onTeam1ScoreChange(team1Score + 1);
      setTimeout(() => setFlashTeam1(false), 300);
    } else {
      setFlashTeam2(true);
      onTeam2ScoreChange(team2Score + 1);
      setTimeout(() => setFlashTeam2(false), 300);
    }
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  // Robust mobile/desktop layout fixes
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
  // Remove debug border from player columns
  const lineSectionStyle = {
    ...styles.lineSection,
    flex: '1 1 0%',
    minWidth: 0,
  };
  const scoreStyle = {
    ...styles.score,
    fontSize: isMobile ? '32px' : styles.score.fontSize,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
    margin: '0 auto',
    background: undefined,
    borderRadius: '6px',
    padding: '8px 0',
  };

  // Responsive team scores row
  const teamScoresRowStyle = {
    display: 'flex',
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    gap: isMobile ? '10px' : styles.scoreContainer.gap,
  };
  const teamScoreButtonStyle = {
    ...styles.teamDisplay,
    flex: 1,
    width: '100%',
    minWidth: undefined,
    maxWidth: undefined,
    flexDirection: 'column' as const,
    alignItems: 'center',
    minHeight: isMobile ? '50px' : styles.teamDisplay.minHeight,
    padding: isMobile ? '8px 8px' : styles.teamDisplay.padding,
    background: 'rgba(255,255,255,0.05)',
    position: 'relative' as any,
  };
  const scoreDiffStyle = {
    ...styles.scoreDiff,
    fontSize: isMobile ? '24px' : '28px',
    fontWeight: 700,
    color: scoreDiff > 0 ? '#2ecc71' : scoreDiff < 0 ? '#e74c3c' : COLORS.text,
    minWidth: '36px',
    textAlign: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '5.5px',
    padding: '0 8.5px',
  };

  // Make player columns always scale with browser width
  const lineDisplayStyle = {
    display: 'flex',
    flexDirection: 'row' as const,
    width: '100%',
    flexWrap: 'nowrap' as const,
    overflowX: 'visible' as const,
    gap: isMobile ? '8px' : styles.lineDisplay.gap,
  };

  // Add overlay style for flash effect
  const flashOverlayStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '11px',
    pointerEvents: 'none' as const,
    zIndex: 0,
    backgroundColor: 'rgba(46, 204, 113, 0.4)', // green
    border: '2px solid rgba(46, 204, 113, 0.9)',
    boxShadow: '0 0 20px rgba(46, 204, 113, 0.7)',
    animation: 'scoreFlashOverlay 0.3s ease-out',
  };

  // Add keyframes for overlay flash (inject if not present)
  if (typeof document !== 'undefined' && !document.getElementById('score-flash-overlay-keyframes')) {
    const style = document.createElement('style');
    style.id = 'score-flash-overlay-keyframes';
    style.textContent = `
      @keyframes scoreFlashOverlay {
        0% {
          opacity: 0;
        }
        40% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  return (
    <div style={styles.container}>
      <div style={{ ...styles.topRow, marginBottom: isMobile ? '2.5px' : styles.topRow.marginBottom }}>
        <div style={styles.timersSection}>
          {showTimers && (
            <>
              <span style={styles.timerText}>Halftime in: {halftimeCountdown}</span>
              <span style={styles.timerText}>Game end: {endCountdown}</span>
            </>
          )}
        </div>
        <div style={{
          ...styles.settingsSection,
          padding: isMobile ? '2.5px 0' : styles.settingsSection.padding,
          marginBottom: isMobile ? '2.5px' : styles.settingsSection.marginBottom,
          gap: isMobile ? '4px' : styles.settingsSection.gap,
        }}>
          <button
            style={{
              ...styles.undoButton,
              opacity: scoreHistory.length === 0 ? 0.5 : 1,
              cursor: scoreHistory.length === 0 ? 'not-allowed' : 'pointer',
            }}
            onClick={onUndo}
            disabled={scoreHistory.length === 0}
          >
            UNDO
          </button>
          <button
            style={{
              ...styles.settingsButton,
            }}
            onClick={() => setSettingsVisible(true)}
          >
            SETTINGS
          </button>
        </div>
      </div>
      <div
        style={{
          ...styles.topBar,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          padding: isMobile ? '6px' : styles.topBar.padding,
        }}
      >
        {/* Only the team scores row is forced side by side */}
        <div style={teamScoresRowStyle}>
          <button
            style={teamScoreButtonStyle}
            data-team="team1"
            onClick={() => handleScoreClick('team1')}
          >
            {/* Flash overlay for team 1 */}
            {flashTeam1 && <div style={flashOverlayStyle}></div>}
            <h2 style={{
              ...styles.teamName,
              fontSize: isMobile ? '15px' : styles.teamName.fontSize,
              marginBottom: isMobile ? '2px' : styles.teamName.marginBottom,
              position: 'relative',
              zIndex: 1,
            }}>{team1Name}</h2>
            <h1 style={{ ...scoreStyle, position: 'relative', zIndex: 1 }}>{team1Score}</h1>
          </button>
          {/* Score diff only visible between scores on non-mobile */}
          {!isMobile && (
            <div style={scoreDiffStyle}>{scoreDiff !== 0 ? scoreDiff : '0'}</div>
          )}
          <button
            style={teamScoreButtonStyle}
            data-team="team2"
            onClick={() => handleScoreClick('team2')}
          >
            {/* Flash overlay for team 2 */}
            {flashTeam2 && <div style={flashOverlayStyle}></div>}
            <h2 style={{
              ...styles.teamName,
              fontSize: isMobile ? '15px' : styles.teamName.fontSize,
              marginBottom: isMobile ? '2px' : styles.teamName.marginBottom,
              position: 'relative',
              zIndex: 1,
            }}>{team2Name}</h2>
            <h1 style={{ ...scoreStyle, position: 'relative', zIndex: 1 }}>{team2Score}</h1>
          </button>
        </div>
      </div>

      <div style={styles.lineInfo}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={styles.lineInfoText}>Point {pointNumber}</span>
          {genderRatioMode === 'ABBA' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div style={styles.patternDisplay}>
                {['A', 'B', 'B', 'A'].map((p, i) => (
                  <div key={i} style={{ ...styles.patternItem, ...(patternIndex === i ? styles.patternItemActive : {}) }}>
                    <span style={styles.patternText}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isMobile && genderRatioMode === 'ABBA' && (
            <div style={{
              ...styles.scoreDiff,
              fontSize: '16px',
              color: scoreDiff > 0 ? '#2ecc71' : scoreDiff < 0 ? '#e74c3c' : COLORS.text,
              marginLeft: 'auto',
              marginRight: 0,
              alignSelf: 'center',
            }}>
              {scoreDiff !== 0 ? scoreDiff : '0'}
            </div>
          )}
        </div>
      </div>
      {/* Team columns always scale, never scroll */}
      <div style={lineDisplayStyle}>
        <div style={lineSectionStyle}>
          <h3 style={styles.lineTitle}>Current Line</h3>
          <div style={styles.playerListVertical}>
            {currentLine.map((player: Player) => (
              <div key={player.uuid} style={{...styles.playerContainer, backgroundColor: player.gender === 'O' ? COLORS.open : COLORS.women }}>
                <span style={styles.playerText}>{player.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={lineSectionStyle}>
          <h3 style={styles.lineTitle}>Next Line</h3>
          <div style={styles.playerListVertical}>
            {nextLine.map((player: Player) => (
              <div key={player.uuid} style={{ ...styles.playerContainer, backgroundColor: player.gender === 'O' ? COLORS.openMuted : COLORS.womenMuted }}>
                <span style={{ ...styles.playerText, color: COLORS.textSecondary }}>{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '17px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  blobsContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
  },
  blob1: { width: '300px', height: '300px', background: BLOB_COLORS.blue, top: '5%', left: '5%' },
  blob2: { width: '300px', height: '300px', background: BLOB_COLORS.pink, top: '20%', right: '15%' },
  blob3: { width: '300px', height: '300px', background: BLOB_COLORS.purple, top: '55%', right: '40%' },
  
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8.5px',
    backgroundColor: 'rgba(45, 45, 45, 0.5)',
    borderRadius: '11px',
    marginBottom: '17px',
    border: '.5px solid rgba(255,255,255,0.22)',
    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
  },
  scoreContainer: {
    display: 'flex',
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: '17px'
  },
  teamDisplay: {
    textAlign: 'center',
    flex: 1,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid transparent',
    borderRadius: '11px',
    color: 'inherit',
    padding: '12.5px 16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '70px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  teamName: { 
    margin: 0, 
    fontSize: '17.5px', 
    fontWeight: '600', 
    color: COLORS.textSecondary,
    marginBottom: '4px'
  },
  score: { 
    margin: 0, 
    fontSize: '45px', 
    fontWeight: 'bold', 
    color: COLORS.text,
  },
  scoreDiff: { 
    fontSize: '22px', 
    fontWeight: '600', 
    color: COLORS.text, 
    padding: '0 8.5px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '5.5px',
    minWidth: '36px',
    textAlign: 'center'
  },
  settingsButton: {
    backgroundColor: COLORS.open,
    color: COLORS.text,
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    transition: 'background 0.2s, color 0.2s',
  },

  lineInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8.5px',
    backgroundColor: 'rgba(45, 45, 45, 0.5)',
    borderRadius: '7.5px',
    marginBottom: '17px',
    border: '.5px solid rgba(255,255,255,0.22)',
    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
  },
  lineInfoLeft: { display: 'flex', alignItems: 'center', gap: '12.5px' },
  lineInfoText: { fontSize: '15.5px', fontWeight: 'bold', color: COLORS.text },
  patternDisplay: { display: 'flex', gap: '6.5px' },
  patternItem: {
    padding: '5px 10px',
    borderRadius: '3.5px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  patternItemActive: { backgroundColor: COLORS.open },
  patternText: { color: COLORS.text, fontSize: '13.5px', fontWeight: 'bold' },
  
  lineDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    flex: 1,
  },
  lineSection: {
    flex: 1,
    backgroundColor: 'rgba(45, 45, 45, 0.5)',
    borderRadius: '7.5px',
    padding: '12.5px',
    display: 'flex',
    flexDirection: 'column',
    border: '.5px solid rgba(255,255,255,0.22)',
    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
  },
  lineTitle: {
    fontSize: '17px',
    fontWeight: 'bold',
    marginBottom: '10px',
    textAlign: 'center',
    color: COLORS.text,
  },
  playerListVertical: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '6.5px',
    flex: 1
  },
  playerContainer: {
    padding: '8.5px 10.5px',
    borderRadius: '3.5px',
    textAlign: 'center',
  },
  playerText: {
    color: COLORS.text,
    fontSize: '15.5px',
    fontWeight: '500',
  },
  settingsSection: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '8.5px 0',
    marginBottom: '8.5px',
    gap: '8.5px',
  },
  scoreDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '8.5px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: COLORS.textSecondary,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6.5px',
  },
  timersSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5px',
  },
  timerText: {
    color: COLORS.textSecondary,
    fontSize: '13.5px',
    fontWeight: 500,
    letterSpacing: '0.5px',
  },
  undoButton: {
    backgroundColor: COLORS.delete,
    color: COLORS.text,
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    opacity: 1,
    transition: 'background 0.2s, color 0.2s, opacity 0.2s ease',
  },
}; 