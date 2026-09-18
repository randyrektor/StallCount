import React, { useState, useEffect } from 'react';
import { Player, type LineupSize, type SplitCycle, type Theme } from '../types';
import {
  isSplitCycleAvailable,
  clampOpenCount,
} from '../utils/rotationHelpers';
import { APP_NAME, COPYRIGHT_HOLDER, GITHUB_URL, KOFI_URL, THEME } from '../constants';
import {
  buildScoreReport,
  downloadTextFile,
  scoreShareTitle,
} from '../utils/scoreReport';
import { qrImageUrl } from '../utils/spectatorState';
import { type SoftPointCap } from '../utils/softCap';
import { SoftCapInput } from './SoftCapInput';

/** Compact ratio like "4:2" (open : women-matching). */
function formatRatio(men: number, women: number): string {
  return `${men}:${women}`;
}

const LINEUP_SIZE_OPTIONS: LineupSize[] = [4, 5, 6, 7];
const CYCLE_OPTIONS: { label: string; value: SplitCycle; hint: string }[] = [
  { label: 'Repeating', value: 'same', hint: 'Every point' },
  { label: 'ABBA', value: 'ABBA', hint: 'A B B A' },
  { label: 'AAB', value: 'AAB', hint: 'A A B' },
];

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
  startingOpen: number;
  onStartingOpenChange: (open: number) => void;
  lineupSize: LineupSize;
  onLineupSizeChange: (size: LineupSize) => void;
  splitCycle: SplitCycle;
  onSplitCycleChange: (cycle: SplitCycle) => void;
  softCap: SoftPointCap;
  onSoftCapChange: (cap: SoftPointCap) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onReset: () => void;
  onChangeTeam?: () => void;
  onPreviewScoreReader?: () => void;
  spectatorLink?: string;
  // Export functionality props
  team1Score: number;
  team2Score: number;
  pointNumber: number;
  lineIndex: number;
  currentLine: Player[];
  nextLine?: Player[];
  pendingPlayers: Player[];
  roster: Player[];
  masterOpenQueue?: Player[];
  masterWomenQueue?: Player[];
  scoreHistory?: { team: 1 | 2; pointNumber: number }[];
}

export function SettingsModal({
  visible,
  onClose,
  team1Name,
  team2Name,
  onTeam1NameChange,
  onTeam2NameChange,
  startingOpen,
  onStartingOpenChange,
  lineupSize,
  onLineupSizeChange,
  splitCycle,
  onSplitCycleChange,
  softCap,
  onSoftCapChange,
  theme,
  onThemeChange,
  onReset,
  onChangeTeam,
  onPreviewScoreReader,
  spectatorLink = '',
  team1Score,
  team2Score,
  pointNumber,
  lineIndex,
  currentLine,
  nextLine = [],
  pendingPlayers,
  roster,
  masterOpenQueue = [],
  masterWomenQueue = [],
  scoreHistory = [],
}: SettingsModalProps) {
  const [localTeam1Name, setLocalTeam1Name] = useState(team1Name);
  const [localTeam2Name, setLocalTeam2Name] = useState(team2Name);
  const [localStartingOpen, setLocalStartingOpen] = useState(startingOpen);
  const [localLineupSize, setLocalLineupSize] = useState<LineupSize>(lineupSize);
  const [localSplitCycle, setLocalSplitCycle] = useState<SplitCycle>(splitCycle);
  const [localSoftCap, setLocalSoftCap] = useState<SoftPointCap>(softCap);
  const [localTheme, setLocalTheme] = useState<Theme>(theme);
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    if (!visible) return;
    setLocalTeam1Name(team1Name);
    setLocalTeam2Name(team2Name);
    setLocalStartingOpen(startingOpen);
    setLocalLineupSize(lineupSize);
    setLocalSplitCycle(splitCycle);
    setLocalSoftCap(softCap);
    setLocalTheme(theme);
  }, [visible, team1Name, team2Name, startingOpen, lineupSize, splitCycle, softCap, theme]);

  // Apply the chosen theme live as the user toggles, so they can see contrast
  // before saving. Reverts on cancel via handleCancel.
  useEffect(() => {
    if (!visible) return;
    document.documentElement.dataset.theme = localTheme;
  }, [localTheme, visible]);

  useEffect(() => {
    if (!isSplitCycleAvailable(localLineupSize, localStartingOpen, localSplitCycle)) {
      setLocalSplitCycle('same');
    }
  }, [localLineupSize, localStartingOpen, localSplitCycle]);

  const handleSave = () => {
    onTeam1NameChange(localTeam1Name);
    onTeam2NameChange(localTeam2Name);
    const open = clampOpenCount(localStartingOpen, localLineupSize);
    onLineupSizeChange(localLineupSize);
    onStartingOpenChange(open);
    onSplitCycleChange(
      isSplitCycleAvailable(localLineupSize, open, localSplitCycle) ? localSplitCycle : 'same'
    );
    onSoftCapChange(localSoftCap);
    onThemeChange(localTheme);
    onClose();
  };

  const handleCancel = () => {
    setLocalTeam1Name(team1Name);
    setLocalTeam2Name(team2Name);
    setLocalStartingOpen(startingOpen);
    setLocalLineupSize(lineupSize);
    setLocalSplitCycle(splitCycle);
    setLocalSoftCap(softCap);
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

  const reportText = buildScoreReport({
    team1Name,
    team2Name,
    team1Score,
    team2Score,
    pointNumber,
    lineupSize,
    startingOpen,
    splitCycle,
    softCap,
    roster,
    masterOpenQueue,
    masterWomenQueue,
    currentLine,
    scoreHistory,
  });
  const shareTitle = scoreShareTitle(team1Name, team2Name, team1Score, team2Score);

  const handleExportScore = () => {
    const gameDate = new Date().toLocaleDateString();
    downloadTextFile(`stallcount-${gameDate}-${team1Name}-vs-${team2Name}.txt`, reportText);
  };

  const handleCopyScore = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setShareStatus('Copied score report');
    } catch {
      setShareStatus('Copy failed — try Share or Download');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: shareTitle, text: reportText });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    await handleCopyScore();
  };

  const handleCopySpectatorLink = async () => {
    try {
      await navigator.clipboard.writeText(spectatorLink);
      setShareStatus('Spectator link copied');
    } catch {
      setShareStatus('Could not copy link');
    }
  };

  if (!visible) return null;

  const openCount = clampOpenCount(localStartingOpen, localLineupSize);
  const womenCount = localLineupSize - openCount;

  return (
    <div className="settings-overlay" style={styles.overlay} onClick={handleCancel}>
      <div className="settings-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header" style={styles.header}>
          <div>
            <h2 style={styles.title}>Settings</h2>
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
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Teams</h3>
            </div>
            <div style={styles.cardContent}>
              <div className="settings-teams-row" style={styles.teamsRow}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Us</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={localTeam1Name}
                    onChange={(e) => setLocalTeam1Name(e.target.value)}
                    placeholder="Your team"
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Opponent</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={localTeam2Name}
                    onChange={(e) => setLocalTeam2Name(e.target.value)}
                    placeholder="Opponent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Line</h3>
            </div>
            <div style={styles.cardContent}>
              <label style={styles.label}>Players per point</label>
              <div className="settings-lineup-row" style={{ ...styles.lineupSizeRow, marginBottom: 16 }}>
                {LINEUP_SIZE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    style={{
                      ...styles.lineupSizeButton,
                      ...(localLineupSize === n ? styles.lineupSizeButtonActive : {}),
                    }}
                    onClick={() => {
                      setLocalLineupSize(n);
                      setLocalStartingOpen((open) => clampOpenCount(open, n));
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <label style={styles.label}>Starting split</label>
              <div style={styles.splitStepper}>
                <button
                  type="button"
                  aria-label="+ Open"
                  style={{
                    ...styles.splitStepButton,
                    ...styles.splitStepButtonOpen,
                    ...(openCount >= localLineupSize ? styles.splitStepButtonDisabled : {}),
                  }}
                  disabled={openCount >= localLineupSize}
                  onClick={() => setLocalStartingOpen(Math.min(localLineupSize, openCount + 1))}
                >
                  + Open
                </button>
                <div style={styles.splitValue}>
                  <span style={styles.splitRatio}>{formatRatio(openCount, womenCount)}</span>
                </div>
                <button
                  type="button"
                  aria-label="+ Women"
                  style={{
                    ...styles.splitStepButton,
                    ...styles.splitStepButtonWomen,
                    ...(openCount <= 0 ? styles.splitStepButtonDisabled : {}),
                  }}
                  disabled={openCount <= 0}
                  onClick={() => setLocalStartingOpen(Math.max(0, openCount - 1))}
                >
                  + Women
                </button>
              </div>
              <label style={{ ...styles.label, marginTop: 16 }}>Cycle</label>
              <div className="settings-cycle-row" style={styles.cycleRow}>
                {CYCLE_OPTIONS.map((opt) => {
                  const cycleLocked = !isSplitCycleAvailable(localLineupSize, openCount, opt.value);
                  const isActive = localSplitCycle === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={cycleLocked}
                      aria-disabled={cycleLocked}
                      style={{
                        ...styles.lineupSizeButton,
                        ...(isActive ? styles.lineupSizeButtonActive : {}),
                        ...(cycleLocked ? styles.cycleButtonDisabled : {}),
                      }}
                      onClick={() => {
                        if (cycleLocked) return;
                        setLocalSplitCycle(opt.value);
                      }}
                    >
                      <span style={{
                        ...styles.ratioLabel,
                        ...(cycleLocked ? styles.cycleButtonDisabledText : {}),
                      }}>{opt.label}</span>
                      <span style={{
                        ...styles.ratioDescription,
                        ...(cycleLocked ? styles.cycleButtonDisabledText : {}),
                      }}>{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Game</h3>
            </div>
            <div style={styles.cardContent}>
              <label style={styles.label} htmlFor="settings-soft-cap">
                Soft point cap
              </label>
              <p style={styles.spectatorHint}>
                First team to this score wins. Leave blank for no cap.
              </p>
              <div style={{ marginBottom: 16 }}>
                <SoftCapInput
                  id="settings-soft-cap"
                  value={localSoftCap}
                  onChange={setLocalSoftCap}
                />
              </div>
              <div style={styles.compactActions}>
                <button type="button" style={styles.compactAction} onClick={handleNativeShare}>
                  Share
                </button>
                <button type="button" style={styles.compactAction} onClick={handleExportScore}>
                  Download
                </button>
                {onChangeTeam && (
                  <button type="button" style={styles.compactAction} onClick={handleChangeTeam}>
                    Change team
                  </button>
                )}
                <button type="button" style={styles.compactActionDanger} onClick={handleReset}>
                  Reset
                </button>
              </div>
              {shareStatus ? <p style={styles.shareStatus}>{shareStatus}</p> : null}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Spectators</h3>
            </div>
            <div style={styles.cardContent}>
              <p style={styles.spectatorHint}>
                Show this QR if the other sideline wants a live score reader. They scan once
                and leave the tab open — score, point, and gender update here.
              </p>
              {spectatorLink && (
                <img
                  alt="Spectator QR code"
                  src={qrImageUrl(spectatorLink)}
                  width={180}
                  height={180}
                  style={styles.qrImage}
                />
              )}
              <div style={styles.compactActions}>
                {onPreviewScoreReader && (
                  <button
                    type="button"
                    style={styles.compactAction}
                    onClick={onPreviewScoreReader}
                  >
                    Preview reader
                  </button>
                )}
                <button type="button" style={styles.compactAction} onClick={handleCopySpectatorLink}>
                  Copy link
                </button>
                {typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    style={styles.compactAction}
                    onClick={() => navigator.share({ title: shareTitle, url: spectatorLink, text: shareTitle })}
                  >
                    Share link
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="settings-about" style={styles.about}>
            <p style={styles.aboutCopy}>
              {APP_NAME} · © {new Date().getFullYear()} {COPYRIGHT_HOLDER}
            </p>
            <div className="settings-about-links" style={styles.aboutLinks}>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.aboutLink}
              >
                GitHub
              </a>
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.aboutLink}
              >
                Support on Ko-fi
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer" style={styles.footer}>
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
    zIndex: 3000,
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: THEME.shadowModal,
    border: `1px solid ${THEME.borderSofter}`,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '20px 24px 16px',
    borderBottom: `1px solid ${THEME.borderSoftest}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    color: COLORS.text,
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
    letterSpacing: '-0.5px',
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
    padding: '16px 24px',
    overflowY: 'auto',
    flex: 1,
  },
  card: {
    backgroundColor: THEME.bgSubtle3,
    borderRadius: '12px',
    marginBottom: '12px',
    border: `1px solid ${THEME.borderFaint}`,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '10px 16px',
    borderBottom: `1px solid ${THEME.borderFaint}`,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: '14px',
    fontWeight: '600',
    margin: 0,
  },
  cardContent: {
    padding: '14px 16px',
  },
  teamsRow: {
    display: 'grid',
    gap: '12px',
  },
  inputGroup: {
    marginBottom: 0,
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
  splitStepper: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '10px',
    alignItems: 'center',
  },
  splitStepButton: {
    padding: '14px 10px',
    backgroundColor: THEME.bgSubtle3,
    border: `1.5px solid ${THEME.borderSofter}`,
    borderRadius: '10px',
    cursor: 'pointer',
    color: COLORS.text,
    fontSize: '15px',
    fontWeight: 700,
    lineHeight: 1.2,
    outline: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  splitStepButtonOpen: {
    backgroundColor: COLORS.open,
    color: THEME.textOnAccent,
    border: 'none',
  },
  splitStepButtonWomen: {
    backgroundColor: COLORS.women,
    color: THEME.textOnAccent,
    border: 'none',
  },
  splitStepButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  splitValue: {
    textAlign: 'center',
    minWidth: '72px',
    padding: '0 4px',
  },
  splitRatio: {
    display: 'block',
    color: COLORS.text,
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    fontVariantNumeric: 'tabular-nums',
  },
  cycleRow: {
    display: 'grid',
    gap: '10px',
  },
  cycleButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    backgroundColor: THEME.bgSubtle3,
    border: `1.5px solid ${THEME.borderSofter}`,
  },
  cycleButtonDisabledText: {
    color: COLORS.textSecondary,
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
  compactActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  compactAction: {
    flex: '1 1 auto',
    padding: '12px 14px',
    backgroundColor: THEME.bgSubtle3,
    border: `1.5px solid ${THEME.borderSofter}`,
    borderRadius: '10px',
    cursor: 'pointer',
    color: COLORS.text,
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    boxSizing: 'border-box',
  },
  spectatorHint: {
    margin: '0 0 12px',
    fontSize: '13px',
    color: COLORS.textSecondary,
    lineHeight: 1.4,
  },
  qrImage: {
    display: 'block',
    margin: '0 auto 12px',
    background: '#fff',
    borderRadius: '8px',
    padding: '8px',
  },
  shareStatus: {
    margin: '10px 0 0',
    fontSize: '13px',
    color: COLORS.textSecondary,
  },
  compactActionDanger: {
    flex: '1 1 auto',
    padding: '12px 14px',
    backgroundColor: THEME.dangerTint,
    border: `1.5px solid ${THEME.dangerBorder}`,
    borderRadius: '10px',
    cursor: 'pointer',
    color: COLORS.danger,
    fontSize: '14px',
    fontWeight: 600,
  },
  about: {
    marginTop: '8px',
    padding: '12px 8px 4px',
    textAlign: 'center',
  },
  aboutCopy: {
    margin: '0 0 8px',
    fontSize: '12px',
    color: COLORS.textSecondary,
    lineHeight: 1.4,
  },
  aboutLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  aboutLink: {
    color: COLORS.open,
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
  },
  footer: {
    padding: '16px 24px',
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
