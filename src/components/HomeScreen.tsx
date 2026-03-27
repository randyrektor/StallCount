import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants';
import { GradientBlobs } from './ScoreBoard';

interface HomeScreenProps {
  onStart: (teamName: string) => void;
}

export function HomeScreen({ onStart }: HomeScreenProps) {
  const [teamName, setTeamName] = useState('');
  const [savedTeams, setSavedTeams] = useState<string[]>([]);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

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
    <div style={styles.container}>
      <GradientBlobs />
      <div style={styles.content}>
        <div style={styles.card}>
          <h1 style={styles.title}>Ultimate Frisbee</h1>
          <h2 style={styles.subtitle}>Score Tracker</h2>
          
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
                    style={{
                      ...styles.teamButton,
                      ...(hoveredButton === team ? {
                        backgroundColor: 'rgba(74, 144, 226, 0.25)',
                        borderColor: 'rgba(74, 144, 226, 0.5)',
                        transform: 'translateX(4px)',
                      } : {}),
                    }}
                    onClick={() => handleSelectTeam(team)}
                    onMouseEnter={() => setHoveredButton(team)}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            style={{
              ...styles.startButton,
              ...(hoveredButton === 'start' ? {
                backgroundColor: '#357abd',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(74, 144, 226, 0.4)',
              } : {}),
            }}
            onClick={handleStart}
            onMouseEnter={() => setHoveredButton('start')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
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
    backgroundColor: 'rgba(45, 45, 45, 0.8)',
    borderRadius: '16px',
    padding: '40px',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)',
    backdropFilter: 'blur(10px)',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: '500',
    color: '#b3b3b3',
    textAlign: 'center',
    margin: '0 0 32px 0',
  },
  inputSection: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '2px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#ffffff',
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
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    border: '1px solid rgba(74, 144, 226, 0.3)',
    borderRadius: '6px',
    color: '#ffffff',
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
    backgroundColor: '#4a90e2',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)',
  },
};
