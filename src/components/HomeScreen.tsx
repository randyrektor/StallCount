import React, { useState, useEffect } from 'react';
import { COLORS, THEME } from '../constants';
import { AppShell } from './AppShell';

interface HomeScreenProps {
  onStart: (teamName: string) => void;
}

export function HomeScreen({ onStart }: HomeScreenProps) {
  const [teamName, setTeamName] = useState('');
  const [savedTeams, setSavedTeams] = useState<string[]>([]);

  useEffect(() => {
    // Load saved teams from localStorage
    const saved = localStorage.getItem('ultimate-teams');
    if (saved) {
      try {
        const teams = JSON.parse(saved);
        setSavedTeams(teams);
      } catch (e) {
        console.error('Error loading saved teams:', e);
      }
    }
  }, []);

  const handleStart = () => {
    if (!teamName.trim()) {
      alert('Please enter a team name');
      return;
    }

    // Save team to history if not already there
    const trimmedName = teamName.trim();
    const updatedTeams = [trimmedName, ...savedTeams.filter(t => t !== trimmedName)].slice(0, 5); // Keep last 5 teams
    localStorage.setItem('ultimate-teams', JSON.stringify(updatedTeams));
    
    onStart(trimmedName);
  };

  const handleSelectTeam = (name: string) => {
    setTeamName(name);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStart();
    }
  };

  return (
    <AppShell showHeader={false} width="narrow" center>
      <div className="shell-card">
          <h1 className="home-title" style={styles.title}>Ultimate Frisbee</h1>
          <p style={styles.subtitle}>Score tracker</p>
          
          <div style={styles.inputSection}>
            <label style={styles.label}>Your Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your team name"
              style={styles.input}
              autoFocus
            />
          </div>

          {savedTeams.length > 0 && (
            <div style={styles.savedTeamsSection}>
              <label style={styles.label}>Recent Teams</label>
              <div style={styles.teamList}>
                {savedTeams.map((team, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`recent-team${teamName === team ? ' is-selected' : ''}`}
                    onClick={() => handleSelectTeam(team)}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            style={styles.startButton}
            onClick={handleStart}
          >
            Continue
          </button>
      </div>
    </AppShell>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '500px',
    padding: '20px',
  },
  card: {
    backgroundColor: THEME.bgPanelStrong,
    borderRadius: '16px',
    padding: '40px',
    border: `1px solid ${THEME.borderStrong}`,
    boxShadow: THEME.shadowModal,
    backdropFilter: 'blur(10px)',
  },
  title: {
    fontWeight: 800,
    color: THEME.text,
    textAlign: 'center',
    margin: '0 0 6px 0',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: THEME.textMuted,
    textAlign: 'center',
    margin: '0 0 28px 0',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  inputSection: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: THEME.text,
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    backgroundColor: THEME.bgInputSoft,
    border: `2px solid ${THEME.borderSoft}`,
    borderRadius: '8px',
    color: THEME.text,
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  savedTeamsSection: {
    marginBottom: '24px',
  },
  teamList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  teamButton: {
    padding: '12px 16px',
    fontSize: '15px',
    backgroundColor: THEME.bgInputSoft,
    border: `1px solid ${THEME.borderSoft}`,
    borderRadius: '8px',
    color: THEME.text,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    fontWeight: '500',
  },
  startButton: {
    width: '100%',
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: THEME.open,
    color: THEME.textOnAccent,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: THEME.shadowCta,
  },
};
