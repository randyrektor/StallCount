import React, { useState } from 'react';

const COLORS = {
  background: '#1a1a1a',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  open: '#4a90e2',
  women: '#e83e8c',
  border: '#404040',
  input: '#3d3d3d',
  button: '#4a90e2',
  buttonHover: '#357abd',
  danger: '#e74c3c',
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
  genderRatioMode: 'ABBA' | '4-3' | '3-4' | 'MEN' | 'WOMEN';
  onGenderRatioModeChange: (mode: 'ABBA' | '4-3' | '3-4' | 'MEN' | 'WOMEN') => void;
  onReset: () => void;
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
  onReset
}: SettingsModalProps) {
  const [localTeam1Name, setLocalTeam1Name] = useState(team1Name);
  const [localTeam2Name, setLocalTeam2Name] = useState(team2Name);
  const [localGameStartTime, setLocalGameStartTime] = useState(gameStartTime);
  const [localHalftimeTime, setLocalHalftimeTime] = useState(halftimeTime);
  const [localEndTime, setLocalEndTime] = useState(endTime);
  const [localGenderRatioMode, setLocalGenderRatioMode] = useState(genderRatioMode);

  const handleSave = () => {
    onTeam1NameChange(localTeam1Name);
    onTeam2NameChange(localTeam2Name);
    onGameStartTimeChange(localGameStartTime);
    onHalftimeTimeChange(localHalftimeTime);
    onEndTimeChange(localEndTime);
    onGenderRatioModeChange(localGenderRatioMode);
    onClose();
  };

  const handleCancel = () => {
    setLocalTeam1Name(team1Name);
    setLocalTeam2Name(team2Name);
    setLocalGameStartTime(gameStartTime);
    setLocalHalftimeTime(halftimeTime);
    setLocalEndTime(endTime);
    setLocalGenderRatioMode(genderRatioMode);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the game? This will clear all scores and line history.')) {
      onReset();
      onClose();
    }
  };

  if (!visible) return null;

  const GENDER_MODES = [
    { label: 'ABBA', value: 'ABBA' },
    { label: '4-3', value: '4-3' },
    { label: '3-4', value: '3-4' },
    { label: 'Men Only', value: 'MEN' },
    { label: 'Women Only', value: 'WOMEN' },
  ];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button style={styles.closeButton} onClick={onClose} aria-label="Close settings modal">
            ×
          </button>
        </div>

        <div style={styles.content}>
          {/* Team Names */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Team Names</h3>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Home Team</label>
              <input
                style={styles.input}
                type="text"
                value={localTeam1Name}
                onChange={(e) => setLocalTeam1Name(e.target.value)}
                placeholder="Enter home team name"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Away Team</label>
              <input
                style={styles.input}
                type="text"
                value={localTeam2Name}
                onChange={(e) => setLocalTeam2Name(e.target.value)}
                placeholder="Enter away team name"
              />
            </div>
          </div>

          {/* Game Times */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Game Times</h3>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Game Start</label>
              <input
                style={styles.input}
                type="time"
                value={localGameStartTime}
                onChange={(e) => setLocalGameStartTime(e.target.value)}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Halftime</label>
              <input
                style={styles.input}
                type="time"
                value={localHalftimeTime}
                onChange={(e) => setLocalHalftimeTime(e.target.value)}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Game End</label>
              <input
                style={styles.input}
                type="time"
                value={localEndTime}
                onChange={(e) => setLocalEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Gender Ratio Mode */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Gender Ratio Mode</h3>
            <div style={styles.radioGroup}>
              {GENDER_MODES.map((mode) => (
                <label style={styles.radioLabel} key={mode.value}>
                  <input
                    type="radio"
                    name="genderRatio"
                    value={mode.value}
                    checked={localGenderRatioMode === mode.value}
                    onChange={(e) => setLocalGenderRatioMode(e.target.value as 'ABBA' | '4-3' | '3-4' | 'MEN' | 'WOMEN')}
                    style={styles.radio}
                  />
                  <span style={styles.radioText}>{mode.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={{ ...styles.button, ...styles.resetButton }} onClick={handleReset}>
            Reset Game
          </button>
          <div style={styles.buttonGroup}>
            <button style={{ ...styles.button, ...styles.cancelButton }} onClick={handleCancel}>
              Cancel
            </button>
            <button style={{ ...styles.button, ...styles.saveButton }} onClick={handleSave}>
              Save
            </button>
          </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    color: COLORS.text,
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: COLORS.textSecondary,
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.2s',
  },
  content: {
    marginBottom: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    color: COLORS.textSecondary,
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: COLORS.input,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '6px',
    color: COLORS.text,
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '8px',
  },
  radio: {
    margin: 0,
  },
  radioText: {
    color: COLORS.text,
    fontSize: '14px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  saveButton: {
    backgroundColor: COLORS.button,
    color: COLORS.text,
  },
  cancelButton: {
    backgroundColor: COLORS.border,
    color: COLORS.text,
  },
  resetButton: {
    backgroundColor: COLORS.danger,
    color: COLORS.text,
  },
}; 