import React, { useState, useEffect } from 'react';
import { Player, type GenderRatioMode, type LineupSize, type StartsOn, type Theme } from '../types';
import { getGenderPattern, modeHasStartingPoint } from '../utils/rotationHelpers';
import { THEME } from '../constants';

/** Compact ratio like "4O : 3W". */
function formatRatio(men: number, women: number): string {
  return `${men}O : ${women}W`;
}

/** One short line under each option; updates when players per point / starts-on changes. */
function shortGenderRatioDescription(
  mode: GenderRatioMode,
  size: LineupSize,
  startsOn: StartsOn
): string {
  if (mode === 'MEN') return `${size}O`;
  if (mode === 'WOMEN') return `${size}W`;
  if (mode === '4-3') {
    const { men, women } = getGenderPattern(0, '4-3', size);
    return formatRatio(men, women);
  }
  if (mode === '3-4') {
    const { men, women } = getGenderPattern(0, '3-4', size);
    return formatRatio(men, women);
  }
  if (mode === 'ABBA') {
    const a = getGenderPattern(0, 'ABBA', size, startsOn);
    const b = getGenderPattern(1, 'ABBA', size, startsOn);
    return `${formatRatio(a.men, a.women)} ↔ ${formatRatio(b.men, b.women)}`;
  }
  if (mode === 'AAB') {
    const aa = getGenderPattern(0, 'AAB', size, startsOn);
    const b = getGenderPattern(2, 'AAB', size, startsOn);
    return `${formatRatio(aa.men, aa.women)} ×2, ${formatRatio(b.men, b.women)}`;
  }
  return '';
}

const LINEUP_SIZE_OPTIONS: LineupSize[] = [4, 5, 6, 7];

const COLORS = {
  background: THEME.bgPage,
  card: THEME.bgElevated,
  text: THEME.text,
  textSecondary: THEME.textSecondary,
  open: THEME.open,
  women: THEME.women,
  border: THEME.border,
  inputBg: THEME.bgInput,
  inputBorder: THEME.border,
  button: THEME.open,
  buttonHover: THEME.openStrong,
  danger: THEME.danger,
  success: THEME.success,
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
  startsOn: StartsOn;
  onStartsOnChange: (value: StartsOn) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
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
  startsOn,
  onStartsOnChange,
  theme,
  onThemeChange,
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
  const [localStartsOn, setLocalStartsOn] = useState<StartsOn>(startsOn);
  const [localTheme, setLocalTheme] = useState<Theme>(theme);

  useEffect(() => {
    if (!visible) return;
    setLocalTeam1Name(team1Name);
    setLocalTeam2Name(team2Name);
    setLocalGameStartTime(gameStartTime);
    setLocalHalftimeTime(halftimeTime);
    setLocalEndTime(endTime);
    setLocalGenderRatioMode(genderRatioMode);
    setLocalLineupSize(lineupSize);
    setLocalStartsOn(startsOn);
    setLocalTheme(theme);
  }, [visible, team1Name, team2Name, gameStartTime, halftimeTime, endTime, genderRatioMode, lineupSize, startsOn, theme]);

  const showStartsOn = modeHasStartingPoint(localGenderRatioMode);

  // Apply the chosen theme live as the user toggles, so they can see contrast
  // before saving. Reverts on cancel via handleCancel.
  useEffect(() => {
    if (!visible) return;
    document.documentElement.dataset.theme = localTheme;
  }, [localTheme, visible]);

  const handleSave = () => {
    onTeam1NameChange(localTeam1Name);
    onTeam2NameChange(localTeam2Name);
    onGameStartTimeChange(localGameStartTime);
    onHalftimeTimeChange(localHalftimeTime);
    onEndTimeChange(localEndTime);
    onGenderRatioModeChange(localGenderRatioMode);
    onLineupSizeChange(localLineupSize);
    onStartsOnChange(localStartsOn);
    onThemeChange(localTheme);
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
    setLocalStartsOn(startsOn);
    setLocalTheme(theme);
    // Revert any live theme preview from the modal.
    document.documentElement.dataset.theme = theme;
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
    { label: 'AAB', value: 'AAB' },
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
          <div style={styles.headerActions}>
            <div
              role="group"
              aria-label="Theme"
              style={styles.themeSegmented}
            >
              <button
                type="button"
                aria-pressed={localTheme === 'dark'}
                style={{
                  ...styles.themeSegment,
                  ...(localTheme === 'dark' ? styles.themeSegmentActive : {}),
                }}
                onClick={() => setLocalTheme('dark')}
              >
                Dark
              </button>
              <button
                type="button"
                aria-pressed={localTheme === 'light'}
                style={{
                  ...styles.themeSegment,
                  ...(localTheme === 'light' ? styles.themeSegmentActive : {}),
                }}
                onClick={() => setLocalTheme('light')}
              >
                Light
              </button>
            </div>
            <button style={styles.closeButton} onClick={onClose} aria-label="Close settings">
              ✕
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {/* Team Names Section */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
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
                      {shortGenderRatioDescription(mode.value, localLineupSize, localStartsOn)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Starting Line — only shown for cyclic modes (ABBA, AAB) */}
          {showStartsOn && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Starting Line</h3>
              </div>
              <div style={styles.cardContent}>
                <div style={styles.themeToggleRow}>
                  <button
                    type="button"
                    style={{
                      ...styles.themeButton,
                      ...(localStartsOn === 'O' ? styles.themeButtonActive : {}),
                    }}
                    onClick={() => setLocalStartsOn('O')}
                  >
                    <span style={styles.themeButtonLabel}>Open</span>
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.themeButton,
                      ...(localStartsOn === 'W' ? styles.themeButtonActive : {}),
                    }}
                    onClick={() => setLocalStartsOn('W')}
                  >
                    <span style={styles.themeButtonLabel}>Woman-Matching</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Game Times Section */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
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
              <h3 style={styles.cardTitle}>Actions</h3>
            </div>
            <div style={styles.cardContent}>
              <button style={styles.actionButton} onClick={handleExportScore}>
                <div style={styles.actionContent}>
                  <div style={styles.actionTitle}>Export Game Report</div>
                  <div style={styles.actionDescription}>Download score and roster</div>
                </div>
              </button>

              {onChangeTeam && (
                <button style={styles.actionButton} onClick={handleChangeTeam}>
                  <div style={styles.actionContent}>
                    <div style={styles.actionTitle}>Change Team</div>
                    <div style={styles.actionDescription}>Start with a different team</div>
                  </div>
                </button>
              )}

              <button style={styles.actionButtonDanger} onClick={handleReset}>
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
    backgroundColor: THEME.bgOverlay,
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
    boxShadow: THEME.shadowModal,
    border: `1px solid ${THEME.borderSofter}`,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '32px 32px 24px',
    borderBottom: `1px solid ${THEME.borderSoftest}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  themeSegmented: {
    display: 'inline-flex',
    padding: '3px',
    backgroundColor: THEME.bgSubtle2,
    border: `1px solid ${THEME.borderFaint}`,
    borderRadius: '999px',
  },
  themeSegment: {
    appearance: 'none',
    border: 'none',
    background: 'transparent',
    color: COLORS.textSecondary,
    fontSize: '12px',
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: '999px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    outline: 'none',
  },
  themeSegmentActive: {
    backgroundColor: THEME.bgElevated,
    color: COLORS.text,
    boxShadow: THEME.shadowButton,
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
    backgroundColor: THEME.bgSubtle3,
    borderRadius: '12px',
    marginBottom: '20px',
    border: `1px solid ${THEME.borderFaint}`,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '16px 20px',
    borderBottom: `1px solid ${THEME.borderFaint}`,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
    backgroundColor: THEME.bgSubtle3,
    border: `1.5px solid ${THEME.borderSofter}`,
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    outline: 'none',
  },
  ratioButtonActive: {
    backgroundColor: THEME.openTint,
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
    backgroundColor: THEME.bgSubtle3,
    border: `1.5px solid ${THEME.borderSofter}`,
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
    backgroundColor: THEME.openTint,
    border: `1.5px solid ${COLORS.open}`,
    outline: 'none',
  },
  themeToggleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  themeButton: {
    padding: '14px 12px',
    backgroundColor: THEME.bgSubtle3,
    border: `1.5px solid ${THEME.borderSofter}`,
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'center',
  },
  themeButtonActive: {
    backgroundColor: THEME.openTint,
    border: `1.5px solid ${COLORS.open}`,
  },
  themeButtonLabel: {
    color: COLORS.text,
    fontSize: '15px',
    fontWeight: 700,
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
    backgroundColor: THEME.bgSubtle3,
    border: `1.5px solid ${THEME.borderSofter}`,
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
    backgroundColor: THEME.dangerTint,
    border: `1.5px solid ${THEME.dangerBorder}`,
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '10px',
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
    borderTop: `1px solid ${THEME.borderSoftest}`,
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '14px 28px',
    backgroundColor: THEME.bgSubtle2,
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
    color: THEME.textOnAccent,
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: THEME.shadowCta,
  },
};
