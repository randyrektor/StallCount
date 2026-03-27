import React, { useState, useEffect } from 'react';
import { Player, type GenderRatioMode, type LineupSize } from '../types';
import { getGenderPattern } from '../utils/rotationHelpers';

/** Readable line split for descriptions. */
function splitPlain(men: number, women: number): string {
  if (women === 0) return `${men} open`;
  if (men === 0) return `${women} women-matching`;
  return `${men} open, ${women} women-matching`;
}

/** One short line under each option; updates when players per point changes. */
function shortGenderRatioDescription(mode: GenderRatioMode, size: LineupSize): string {
  if (mode === 'MEN') return `${size} open only`;
  if (mode === 'WOMEN') return `${size} women-matching only`;
  if (mode === '4-3') {
    const { men, women } = getGenderPattern(0, '4-3', size);
    return `${splitPlain(men, women)} each point`;
  }
  if (mode === '3-4') {
    const { men, women } = getGenderPattern(0, '3-4', size);
    return `${splitPlain(men, women)} each point`;
  }
  if (mode === 'ABBA') {
    const a = getGenderPattern(0, 'ABBA', size);
    const b = getGenderPattern(1, 'ABBA', size);
    return `${splitPlain(a.men, a.women)} ↔ ${splitPlain(b.men, b.women)} (alternates)`;
  }
  if (mode === 'AAB-MW') {
    const aa = getGenderPattern(0, 'AAB-MW', size);
    const b = getGenderPattern(2, 'AAB-MW', size);
    return `AA: ${splitPlain(aa.men, aa.women)} · B: ${splitPlain(b.men, b.women)} (3-point loop)`;
  }
  if (mode === 'AAB-WM') {
    const aa = getGenderPattern(0, 'AAB-WM', size);
    const b = getGenderPattern(2, 'AAB-WM', size);
    return `AA: ${splitPlain(aa.men, aa.women)} · B: ${splitPlain(b.men, b.women)} (3-point loop)`;
  }
  return '';
}

const LINEUP_SIZE_OPTIONS: LineupSize[] = [4, 5, 6, 7];

const COLORS = {
  background: '#1a1a1a',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  open: '#4a90e2',
  women: '#e83e8c',
  border: '#404040',
  inputBg: '#1a1a1a',
  inputBorder: '#404040',
  button: '#4a90e2',
  buttonHover: '#357abd',
  danger: '#e74c3c',
  success: '#2ecc71',
  cardHover: '#383838',
};

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  team1Name: string;
  team2Name: string;
  onTeam1NameChange: (name: string) => void;
  onTeam2NameChange: (name: string) => void;
  gameStartTime: string;
  halftimeTime: string;
  endTime: string;
  onGameStartTimeChange: (time: string) => void;
  onHalftimeTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  genderRatioMode: GenderRatioMode;
  onGenderRatioModeChange: (mode: GenderRatioMode) => void;
  lineupSize: LineupSize;
  onLineupSizeChange: (size: LineupSize) => void;
  onReset: () => void;
  onChangeTeam?: () => void;
  // Export functionality props
  team1Score: number;
  team2Score: number;
  pointNumber: number;
  lineIndex: number;
  currentLine: Player[];
  pendingPlayers: Player[];
  roster: Player[];
  masterOpenQueue?: Player[];
  masterWomenQueue?: Player[];
}

export function SettingsModal({
  visible,
  onClose,
  team1Name,
  team2Name,
  onTeam1NameChange,
  onTeam2NameChange,
  gameStartTime,
  halftimeTime,
  endTime,
  onGameStartTimeChange,
  onHalftimeTimeChange,
  onEndTimeChange,
  genderRatioMode,
  onGenderRatioModeChange,
  lineupSize,
  onLineupSizeChange,
  onReset,
  onChangeTeam,
  team1Score,
  team2Score,
  pointNumber,
  lineIndex,
  currentLine,
  pendingPlayers,
  roster,
  masterOpenQueue = [],
  masterWomenQueue = [],
}: SettingsModalProps) {
  const [localTeam1Name, setLocalTeam1Name] = useState(team1Name);
  const [localTeam2Name, setLocalTeam2Name] = useState(team2Name);
  const [localGameStartTime, setLocalGameStartTime] = useState(gameStartTime);
  const [localHalftimeTime, setLocalHalftimeTime] = useState(halftimeTime);
  const [localEndTime, setLocalEndTime] = useState(endTime);
  const [localGenderRatioMode, setLocalGenderRatioMode] = useState<GenderRatioMode>(genderRatioMode);
  const [localLineupSize, setLocalLineupSize] = useState<LineupSize>(lineupSize);

  useEffect(() => {
    if (!visible) return;
    setLocalTeam1Name(team1Name);
    setLocalTeam2Name(team2Name);
    setLocalGameStartTime(gameStartTime);
    setLocalHalftimeTime(halftimeTime);
    setLocalEndTime(endTime);
    setLocalGenderRatioMode(genderRatioMode);
    setLocalLineupSize(lineupSize);
  }, [visible, team1Name, team2Name, gameStartTime, halftimeTime, endTime, genderRatioMode, lineupSize]);

  const handleSave = () => {
    onTeam1NameChange(localTeam1Name);
    onTeam2NameChange(localTeam2Name);
    onGameStartTimeChange(localGameStartTime);
    onHalftimeTimeChange(localHalftimeTime);
    onEndTimeChange(localEndTime);
    onGenderRatioModeChange(localGenderRatioMode);
    onLineupSizeChange(localLineupSize);
    onClose();
  };

  const handleCancel = () => {
    setLocalTeam1Name(team1Name);
    setLocalTeam2Name(team2Name);
    setLocalGameStartTime(gameStartTime);
    setLocalHalftimeTime(halftimeTime);
    setLocalEndTime(endTime);
    setLocalGenderRatioMode(genderRatioMode);
    setLocalLineupSize(lineupSize);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the game? This will clear all scores and line history.')) {
      onReset();
      onClose();
    }
  };

  const handleChangeTeam = () => {
    if (window.confirm('Are you sure you want to change your team? This will reset the current game.')) {
      onReset();
      if (onChangeTeam) {
        onChangeTeam();
      }
      onClose();
    }
  };

  const handleExportScore = () => {
    const timestamp = new Date().toLocaleString();
    const gameDate = new Date().toLocaleDateString();
    
    const exportText = `Ultimate Frisbee Score Report
Generated: ${timestamp}
Game Date: ${gameDate}

SCORE SUMMARY:
${team1Name}: ${team1Score}
${team2Name}: ${team2Score}

GAME PROGRESS:
Point Number: ${pointNumber}

FULL ROSTER (${roster.length} players):
${roster.map((player, index) => `${index + 1}. ${player.name} (${player.gender === 'O' ? 'Open' : 'Women'}) - #${player.number}`).join('\n')}

ROTATION ORDER (Open queue):
${masterOpenQueue.length ? masterOpenQueue.map((p, i) => `${i + 1}. ${p.name}`).join('\n') : '(none)'}

ROTATION ORDER (Women queue):
${masterWomenQueue.length ? masterWomenQueue.map((p, i) => `${i + 1}. ${p.name}`).join('\n') : '(none)'}

GAME SETTINGS:
Players per point: ${lineupSize}
Gender Ratio Mode: ${genderRatioMode}
Game Start Time: ${gameStartTime}
Halftime Time: ${halftimeTime}
End Time: ${endTime}

---
Report generated by Ultimate Score App
`;

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultimate-score-${gameDate}-${team1Name}-vs-${team2Name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!visible) return null;

  const GENDER_MODE_OPTIONS: { label: string; value: GenderRatioMode }[] = [
    { label: 'ABBA', value: 'ABBA' },
    { label: 'AAB (Open)', value: 'AAB-MW' },
    { label: 'AAB (Women)', value: 'AAB-WM' },
    { label: 'Open-Favored', value: '4-3' },
    { label: 'Women-Favored', value: '3-4' },
    { label: 'Open Only', value: 'MEN' },
    { label: 'Women-Matching Only', value: 'WOMEN' },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Game Settings</h2>
            <p style={styles.subtitle}>Configure your game options</p>
          </div>
          <button style={styles.closeButton} onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div style={styles.content}>
          {/* Team Names Section */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>⚡</span>
              <h3 style={styles.cardTitle}>Teams</h3>
            </div>
            <div style={styles.cardContent}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Your Team</label>
                <input
                  style={styles.input}
                  type="text"
                  value={localTeam1Name}
                  onChange={(e) => setLocalTeam1Name(e.target.value)}
                  placeholder="Enter your team name"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Opponent</label>
                <input
                  style={styles.input}
                  type="text"
                  value={localTeam2Name}
                  onChange={(e) => setLocalTeam2Name(e.target.value)}
                  placeholder="Enter opponent name"
                />
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>🎯</span>
              <h3 style={styles.cardTitle}>Players per point</h3>
            </div>
            <div style={styles.cardContent}>
              <div style={styles.lineupSizeRow}>
                {LINEUP_SIZE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    style={{
                      ...styles.lineupSizeButton,
                      ...(localLineupSize === n ? styles.lineupSizeButtonActive : {}),
                    }}
                    onClick={() => setLocalLineupSize(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gender Ratio Section */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>👥</span>
              <h3 style={styles.cardTitle}>Gender Ratio</h3>
            </div>
            <div style={styles.cardContent}>
              <div style={styles.ratioGrid}>
                {GENDER_MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    style={{
                      ...styles.ratioButton,
                      ...(localGenderRatioMode === mode.value ? styles.ratioButtonActive : {}),
                    }}
                    onClick={() => setLocalGenderRatioMode(mode.value)}
                  >
                    <span style={styles.ratioLabel}>{mode.label}</span>
                    <span style={styles.ratioDescription}>
                      {shortGenderRatioDescription(mode.value, localLineupSize)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Game Times Section */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>⏰</span>
              <h3 style={styles.cardTitle}>Game Times</h3>
            </div>
            <div style={styles.cardContent}>
              <div style={styles.timeGrid}>
                <div style={styles.timeInputGroup}>
                  <label style={styles.timeLabel}>Start</label>
                  <input
                    style={styles.timeInput}
                    type="time"
                    value={localGameStartTime}
                    onChange={(e) => setLocalGameStartTime(e.target.value)}
                  />
                </div>
                <div style={styles.timeInputGroup}>
                  <label style={styles.timeLabel}>Halftime</label>
                  <input
                    style={styles.timeInput}
                    type="time"
                    value={localHalftimeTime}
                    onChange={(e) => setLocalHalftimeTime(e.target.value)}
                  />
                </div>
                <div style={styles.timeInputGroup}>
                  <label style={styles.timeLabel}>End</label>
                  <input
                    style={styles.timeInput}
                    type="time"
                    value={localEndTime}
                    onChange={(e) => setLocalEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>🔧</span>
              <h3 style={styles.cardTitle}>Actions</h3>
            </div>
            <div style={styles.cardContent}>
              <button style={styles.actionButton} onClick={handleExportScore}>
                <span style={styles.actionIcon}>📄</span>
                <div style={styles.actionContent}>
                  <div style={styles.actionTitle}>Export Game Report</div>
                  <div style={styles.actionDescription}>Download score and roster</div>
                </div>
              </button>
              
              {onChangeTeam && (
                <button style={styles.actionButton} onClick={handleChangeTeam}>
                  <span style={styles.actionIcon}>🔄</span>
                  <div style={styles.actionContent}>
                    <div style={styles.actionTitle}>Change Team</div>
                    <div style={styles.actionDescription}>Start with a different team</div>
                  </div>
                </button>
              )}
              
              <button style={styles.actionButtonDanger} onClick={handleReset}>
                <span style={styles.actionIcon}>🗑️</span>
                <div style={styles.actionContent}>
                  <div style={styles.actionTitle}>Reset Game</div>
                  <div style={styles.actionDescription}>Clear scores and history</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.cancelButton} onClick={handleCancel}>
            Cancel
          </button>
          <button style={styles.saveButton} onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: '20px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '32px 32px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: COLORS.text,
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: '14px',
    margin: 0,
    fontWeight: '400',
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: COLORS.textSecondary,
    fontSize: '24px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    lineHeight: 1,
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '24px 32px',
    overflowY: 'auto',
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardIcon: {
    fontSize: '20px',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  cardContent: {
    padding: '20px',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    color: COLORS.textSecondary,
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: COLORS.inputBg,
    border: `1.5px solid ${COLORS.inputBorder}`,
    borderRadius: '10px',
    color: COLORS.text,
    fontSize: '15px',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  ratioGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px',
  },
  ratioButton: {
    padding: '14px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1.5px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    outline: 'none',
  },
  ratioButtonActive: {
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    border: `1.5px solid ${COLORS.open}`,
  },
  ratioLabel: {
    color: COLORS.text,
    fontSize: '15px',
    fontWeight: '600',
    display: 'block',
    marginBottom: '4px',
  },
  ratioDescription: {
    display: 'block',
    color: COLORS.textSecondary,
    fontSize: '12px',
    lineHeight: 1.35,
    fontWeight: 400,
  },
  lineupSizeRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  lineupSizeButton: {
    padding: '14px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1.5px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    cursor: 'pointer',
    color: COLORS.text,
    fontSize: '18px',
    fontWeight: 700,
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
    outline: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  lineupSizeButtonActive: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    border: `1.5px solid ${COLORS.open}`,
    outline: 'none',
  },
  timeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  timeInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  timeLabel: {
    color: COLORS.textSecondary,
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  timeInput: {
    padding: '12px',
    backgroundColor: COLORS.inputBg,
    border: `1.5px solid ${COLORS.inputBorder}`,
    borderRadius: '8px',
    color: COLORS.text,
    fontSize: '14px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  actionButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1.5px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '10px',
  },
  actionButtonDanger: {
    width: '100%',
    padding: '16px',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    border: '1.5px solid rgba(231, 76, 60, 0.3)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '10px',
  },
  actionIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  actionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'left',
  },
  actionTitle: {
    color: COLORS.text,
    fontSize: '15px',
    fontWeight: '600',
  },
  actionDescription: {
    color: COLORS.textSecondary,
    fontSize: '13px',
  },
  footer: {
    padding: '20px 32px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '14px 28px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: COLORS.text,
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  saveButton: {
    padding: '14px 32px',
    backgroundColor: COLORS.button,
    color: COLORS.text,
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)',
  },
};
