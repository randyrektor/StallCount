import React, { useState, useEffect, useCallback } from 'react';
import { Player, type GenderRatioMode, type LineupSize, type StartsOn } from '../types';
import { getGenderPattern } from '../utils/rotationHelpers';
import { getLine } from '../utils/lineRotation';
import { THEME } from '../constants';

const COLORS = {
  background: THEME.bgApp,
  card: THEME.bgElevated,
  text: THEME.text,
  textSecondary: THEME.textSecondary,
  open: THEME.open,
  women: THEME.women,
  openMuted: THEME.openMuted,
  womenMuted: THEME.womenMuted,
  border: THEME.border,
  input: THEME.bgInput,
  delete: THEME.danger,
};

function normSubName(name: string): string {
  return name.trim().toLowerCase();
}

// Decorative blob tints (only render in dark mode; CSS hides them in light mode)
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
  genderRatioMode?: GenderRatioMode;
  lineupSize?: LineupSize;
  startsOn?: StartsOn;
  halftimeCountdown: string;
  endCountdown: string;
  showTimers: boolean;
  setSettingsVisible: (visible: boolean) => void;
  roster: Player[];
  openQueue: Player[];
  womanQueue: Player[];
  nextOpenQueue: Player[];
  nextWomanQueue: Player[];
  scoreHistory: any[];
  gameStarted?: boolean;
  onKickoff?: () => void;
  onSubstitute?: (outPlayer: Player, inPlayer: Player) => void;
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
  lineupSize = 7,
  startsOn = 'O',
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
  gameStarted = true,
  onKickoff,
  onSubstitute,
}: ScoreBoardProps) {
  const abbaPattern = ['A', 'B', 'B', 'A'] as const;
  const aabPattern = ['A', 'A', 'B'] as const;
  const patternIndexAbba = ((lineIndex % 4) + 4) % 4;
  const patternIndexAab = ((lineIndex % 3) + 3) % 3;
  const [isAnimating, setIsAnimating] = useState(false);
  const [flashTeam1, setFlashTeam1] = useState(false);
  const [flashTeam2, setFlashTeam2] = useState(false);
  const [subOut, setSubOut] = useState<Player | null>(null);

  openQueue = openQueue || [];
  womanQueue = womanQueue || [];
  nextOpenQueue = nextOpenQueue || [];
  nextWomanQueue = nextWomanQueue || [];

  const openPlayers = openQueue;
  const womenPlayers = womanQueue;

  const currentPattern = getGenderPattern(lineIndex, genderRatioMode, lineupSize, startsOn);
  const currentLine = getLine(openPlayers, womenPlayers, currentPattern);

  const nextPattern = getGenderPattern(lineIndex + 1, genderRatioMode, lineupSize, startsOn);
  const nextLine = getLine(nextOpenQueue, nextWomanQueue, nextPattern);

  const scoreDiff = team1Score - team2Score;

  // Use the same window slices App passes as props (not only getLine), and match by
  // gender+name as well as uuid so roster rows still align if UUIDs ever diverge.
  const onFieldSlots = [...openQueue, ...womanQueue];
  const onFieldUuids = new Set(onFieldSlots.map((p) => p.uuid));
  const onFieldGenderNames = new Set(
    onFieldSlots.map((p) => `${p.gender}:${normSubName(p.name)}`)
  );

  const subCandidates = subOut
    ? roster.filter((p) => {
        if (p.gender !== subOut.gender) return false;
        if (p.uuid === subOut.uuid) return false;
        if (onFieldUuids.has(p.uuid)) return false;
        if (onFieldGenderNames.has(`${p.gender}:${normSubName(p.name)}`)) return false;
        return true;
      })
    : [];

  const closeSubPicker = useCallback(() => setSubOut(null), []);

  useEffect(() => {
    if (!subOut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSubPicker();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [subOut, closeSubPicker]);

  const handlePickSubIn = (inPlayer: Player) => {
    if (subOut && onSubstitute) {
      onSubstitute(subOut, inPlayer);
    }
    setSubOut(null);
  };

  const handleScoreClick = (team: 'team1' | 'team2') => {
    if (!gameStarted || isAnimating) return;
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
    background: THEME.bgSubtle,
    position: 'relative' as any,
  };
  const scoreDiffStyle = {
    ...styles.scoreDiff,
    fontSize: isMobile ? '24px' : '28px',
    fontWeight: 700,
    color: scoreDiff > 0 ? THEME.success : scoreDiff < 0 ? THEME.danger : COLORS.text,
    minWidth: '36px',
    textAlign: 'center' as const,
    backgroundColor: THEME.bgInputSoft,
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
            style={{
              ...teamScoreButtonStyle,
              opacity: gameStarted ? 1 : 0.55,
              cursor: gameStarted ? 'pointer' : 'not-allowed',
            }}
            data-team="team1"
            onClick={() => handleScoreClick('team1')}
            aria-disabled={!gameStarted}
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
            style={{
              ...teamScoreButtonStyle,
              opacity: gameStarted ? 1 : 0.55,
              cursor: gameStarted ? 'pointer' : 'not-allowed',
            }}
            data-team="team2"
            onClick={() => handleScoreClick('team2')}
            aria-disabled={!gameStarted}
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

      {!gameStarted && (
        <div style={styles.kickoffBar}>
          <p style={styles.kickoffCopy}>
            Add anyone who just showed up. They join this line. Tap Start Game when the disc is pulled.
          </p>
          <button type="button" style={styles.kickoffButton} onClick={onKickoff}>
            Start Game
          </button>
        </div>
      )}

      <div style={styles.lineInfo}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', position: 'relative' }}>
          {/* Left: Point X */}
          <div style={{ flex: '0 0 auto', minWidth: 70, textAlign: 'left' }}>
            <span style={styles.lineInfoText}>Point {pointNumber}</span>
          </div>
          {/* Center: scoreDiff (absolutely centered in card, only on mobile) */}
          {isMobile && (
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              pointerEvents: 'none',
            }}>
              <div style={{
                ...styles.scoreDiff,
                fontSize: '18px',
                color: scoreDiff > 0 ? THEME.success : scoreDiff < 0 ? THEME.danger : COLORS.text,
                margin: 0,
                alignSelf: 'center',
                display: 'inline-block',
              }}>
                {scoreDiff !== 0 ? scoreDiff : '0'}
              </div>
            </div>
          )}
          {/* Right: rotating pattern indicator */}
          {genderRatioMode === 'ABBA' && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'flex-end',
              minWidth: 120,
              textAlign: 'right',
              zIndex: 1,
            }}>
              <div style={styles.patternDisplay}>
                {abbaPattern.map((p, i) => (
                  <div key={i} style={{ ...styles.patternItem, ...(patternIndexAbba === i ? styles.patternItemActive : {}) }}>
                    <span style={styles.patternText}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {genderRatioMode === 'AAB' && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'flex-end',
              minWidth: 100,
              textAlign: 'right',
              zIndex: 1,
            }}>
              <div style={styles.patternDisplay}>
                {aabPattern.map((p, i) => (
                  <div key={i} style={{ ...styles.patternItem, ...(patternIndexAab === i ? styles.patternItemActive : {}) }}>
                    <span style={styles.patternText}>{p}</span>
                  </div>
                ))}
              </div>
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
              <div key={player.uuid} style={styles.currentLineRow}>
                <div
                  style={{
                    ...styles.playerContainer,
                    ...styles.currentLineNameBlock,
                    backgroundColor: player.gender === 'O' ? COLORS.open : COLORS.women,
                  }}
                >
                  <span style={styles.playerText}>{player.name}</span>
                </div>
                {onSubstitute ? (
                  <button
                    type="button"
                    style={styles.subSideButton}
                    onClick={() => setSubOut(player)}
                    aria-label={`Substitute ${player.name}`}
                  >
                    Sub
                  </button>
                ) : null}
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

      {subOut && onSubstitute && (
        <div style={styles.subOverlay} onClick={closeSubPicker} role="presentation">
          <div
            style={styles.subModal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sub-modal-title"
          >
            <h4 id="sub-modal-title" style={styles.subModalTitle}>
              Sub out: {subOut.name}
            </h4>
            <p style={styles.subModalHelp}>
              Bench for field (tired / fresh): you swap numbers with {subOut.name} in the
              rotation list—same pointer, two people trade spots. Someone not in the list yet
              takes this slot and {subOut.name} goes to the end. Injury or leaving the game:
              remove them from the roster instead; their slot is deleted and everyone below moves
              up.
            </p>
            <div style={styles.subCandidateList}>
              {subCandidates.length === 0 ? (
                <p style={styles.subModalEmpty}>
                  No eligible subs: every {subOut.gender === 'O' ? 'open' : "women's"}-matching player
                  is already on this line. Add bench players from the roster panel or cancel.
                </p>
              ) : (
                subCandidates.map((p) => (
                  <button
                    key={p.uuid}
                    type="button"
                    style={{
                      ...styles.subCandidateButton,
                      backgroundColor: p.gender === 'O' ? COLORS.open : COLORS.women,
                    }}
                    onClick={() => handlePickSubIn(p)}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
            <button type="button" style={styles.subCancelButton} onClick={closeSubPicker}>
              Cancel
            </button>
          </div>
        </div>
      )}
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
    backgroundColor: THEME.bgPanel,
    borderRadius: '11px',
    marginBottom: '17px',
    border: `.5px solid ${THEME.borderStrong}`,
    boxShadow: THEME.shadowCard,
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
    background: THEME.bgSubtle,
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
    backgroundColor: THEME.bgInputSoft,
    borderRadius: '5.5px',
    minWidth: '36px',
    textAlign: 'center'
  },
  settingsButton: {
    backgroundColor: COLORS.open,
    color: THEME.textOnAccent,
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: THEME.shadowButton,
    transition: 'background 0.2s, color 0.2s',
  },

  lineInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8.5px',
    backgroundColor: THEME.bgPanel,
    borderRadius: '7.5px',
    marginBottom: '17px',
    border: `.5px solid ${THEME.borderStrong}`,
    boxShadow: THEME.shadowCard,
  },
  lineInfoLeft: { display: 'flex', alignItems: 'center', gap: '12.5px' },
  lineInfoText: { fontSize: '15.5px', fontWeight: 'bold', color: COLORS.text },
  patternDisplay: { display: 'flex', gap: '6.5px' },
  patternItem: {
    padding: '5px 10px',
    borderRadius: '3.5px',
    backgroundColor: THEME.patternPillBg,
  },
  patternItemActive: { backgroundColor: THEME.patternPillActiveBg },
  patternText: { color: THEME.patternPillText, fontSize: '13.5px', fontWeight: 'bold' },
  
  lineDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    flex: 1,
  },
  lineSection: {
    flex: 1,
    backgroundColor: THEME.bgPanel,
    borderRadius: '7.5px',
    padding: '12.5px',
    display: 'flex',
    flexDirection: 'column',
    border: `.5px solid ${THEME.borderStrong}`,
    boxShadow: THEME.shadowCard,
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
  currentLineRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: '6px',
    width: '100%',
    minWidth: 0,
  },
  currentLineNameBlock: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subSideButton: {
    flex: '0 0 36px',
    width: '36px',
    border: 'none',
    borderRadius: '3.5px',
    backgroundColor: THEME.bgSubtle,
    color: COLORS.text,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 2px',
    boxShadow: THEME.shadowButton,
  },
  subOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: THEME.bgOverlay,
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  subModal: {
    backgroundColor: COLORS.card,
    borderRadius: '12px',
    padding: '18px',
    maxWidth: '360px',
    width: '100%',
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  subModalTitle: {
    margin: '0 0 8px 0',
    color: COLORS.text,
    fontSize: '17px',
    fontWeight: 700,
  },
  subModalHelp: {
    margin: '0 0 14px 0',
    color: COLORS.textSecondary,
    fontSize: '13px',
    lineHeight: 1.4,
  },
  subModalEmpty: {
    margin: 0,
    color: COLORS.textSecondary,
    fontSize: '13px',
    lineHeight: 1.45,
  },
  subCandidateList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: 'min(50vh, 280px)',
    overflowY: 'auto',
  },
  subCandidateButton: {
    border: 'none',
    borderRadius: '6px',
    padding: '12px 14px',
    color: THEME.textOnAccent,
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  subCancelButton: {
    marginTop: '14px',
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: `1px solid ${COLORS.border}`,
    backgroundColor: 'transparent',
    color: COLORS.textSecondary,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
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
    color: THEME.textOnAccent,
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: THEME.shadowButton,
    opacity: 1,
    transition: 'background 0.2s, color 0.2s, opacity 0.2s ease',
  },
  kickoffBar: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    margin: '0 0 10px',
    padding: '12px 14px',
    backgroundColor: THEME.openTint,
    border: `1px solid ${THEME.openMuted}`,
    borderRadius: '10px',
  },
  kickoffCopy: {
    margin: 0,
    flex: '1 1 200px',
    color: COLORS.text,
    fontSize: '14px',
    lineHeight: 1.4,
  },
  kickoffButton: {
    backgroundColor: THEME.open,
    color: THEME.textOnAccent,
    border: 'none',
    padding: '12px 22px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: THEME.shadowCta,
    flex: '0 0 auto',
  },
}; 