import React, { useState } from 'react';
import { Player } from '../types';
import { COLORS } from '../constants';
import { GradientBlobs } from './ScoreBoard';

interface RosterSetupProps {
  teamName: string;
  onComplete: (roster: Player[]) => void;
  onBack: () => void;
}

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

export function RosterSetup({ teamName, onComplete, onBack }: RosterSetupProps) {
  const [roster, setRoster] = useState<Player[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [playerGender, setPlayerGender] = useState<'O' | 'W'>('O');

  const handleAddPlayer = () => {
    if (!playerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    const newPlayer: Player = {
      uuid: generateUUID(),
      name: playerName.trim(),
      gender: playerGender,
      number: 0, // Will be assigned later
    };

    setRoster([...roster, newPlayer]);
    setPlayerName('');
    // Keep the same gender selected for convenience
  };

  const handleRemovePlayer = (uuid: string) => {
    setRoster(roster.filter(p => p.uuid !== uuid));
  };

  const handleStartGame = () => {
    if (roster.length === 0) {
      alert('Please add at least one player to start the game');
      return;
    }

    // Assign numbers by gender
    let openCount = 1;
    let womanCount = 1;
    const numberedRoster = roster.map((player) => {
      if (player.gender === 'O') {
        return { ...player, number: openCount++ };
      } else if (player.gender === 'W') {
        return { ...player, number: womanCount++ };
      } else {
        return { ...player, number: 0 };
      }
    });

    onComplete(numberedRoster);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPlayer();
    }
  };

  const openPlayers = roster.filter(p => p.gender === 'O');
  const womenPlayers = roster.filter(p => p.gender === 'W');

  return (
    <div style={styles.container}>
      <GradientBlobs />
      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.header}>
            <button style={styles.backButton} onClick={onBack}>
              ← Back
            </button>
            <h1 style={styles.title}>{teamName}</h1>
          </div>
          <h2 style={styles.subtitle}>Add Your Players</h2>

          {/* Add Player Form */}
          <div style={styles.addPlayerSection}>
            <div style={styles.inputRow}>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Player name"
                style={styles.input}
                autoFocus
              />
              <div style={styles.genderToggle}>
                <button
                  style={{
                    ...styles.genderButton,
                    ...(playerGender === 'O' ? styles.genderButtonActive : {}),
                  }}
                  onClick={() => setPlayerGender('O')}
                >
                  Open
                </button>
                <button
                  style={{
                    ...styles.genderButton,
                    ...(playerGender === 'W' ? styles.genderButtonActiveWomen : {}),
                  }}
                  onClick={() => setPlayerGender('W')}
                >
                  Women
                </button>
              </div>
              <button style={styles.addButton} onClick={handleAddPlayer}>
                Add
              </button>
            </div>
          </div>

          {/* Roster Display */}
          <div style={styles.rosterSection}>
            <div style={styles.statsRow}>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Total Players:</span>
                <span style={styles.statValue}>{roster.length}</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Open:</span>
                <span style={{ ...styles.statValue, color: '#4a90e2' }}>{openPlayers.length}</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Women:</span>
                <span style={{ ...styles.statValue, color: '#e83e8c' }}>{womenPlayers.length}</span>
              </div>
            </div>

            {roster.length > 0 ? (
              <div style={styles.playerList}>
                {roster.map((player) => (
                  <div
                    key={player.uuid}
                    style={{
                      ...styles.playerCard,
                      backgroundColor: player.gender === 'O' 
                        ? 'rgba(74, 144, 226, 0.15)' 
                        : 'rgba(232, 62, 140, 0.15)',
                      borderColor: player.gender === 'O'
                        ? 'rgba(74, 144, 226, 0.3)'
                        : 'rgba(232, 62, 140, 0.3)',
                    }}
                  >
                    <div style={styles.playerInfo}>
                      <span style={styles.playerName}>{player.name}</span>
                      <span style={styles.playerGender}>
                        {player.gender === 'O' ? 'Open' : 'Women'}
                      </span>
                    </div>
                    <button
                      style={styles.removeButton}
                      onClick={() => handleRemovePlayer(player.uuid)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>No players added yet</p>
                <p style={styles.emptyHint}>Add players using the form above</p>
              </div>
            )}
          </div>

          {/* Start Game Button */}
          <button
            style={{
              ...styles.startButton,
              opacity: roster.length === 0 ? 0.5 : 1,
              cursor: roster.length === 0 ? 'not-allowed' : 'pointer',
            }}
            onClick={handleStartGame}
            disabled={roster.length === 0}
          >
            Start Game ({roster.length} player{roster.length !== 1 ? 's' : ''})
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
    minHeight: '100vh',
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: '20px',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '600px',
  },
  card: {
    backgroundColor: 'rgba(45, 45, 45, 0.8)',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)',
    backdropFilter: 'blur(10px)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '12px',
  },
  backButton: {
    backgroundColor: 'transparent',
    color: '#b3b3b3',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: 0,
  },
  subtitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#b3b3b3',
    margin: '0 0 24px 0',
  },
  addPlayerSection: {
    marginBottom: '24px',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '15px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '2px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#ffffff',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  genderToggle: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    padding: '4px',
  },
  genderButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: 'transparent',
    color: '#b3b3b3',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  genderButtonActive: {
    backgroundColor: '#4a90e2',
    color: '#ffffff',
  },
  genderButtonActiveWomen: {
    backgroundColor: '#e83e8c',
    color: '#ffffff',
  },
  addButton: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 'bold',
    backgroundColor: '#2ecc71',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  rosterSection: {
    marginBottom: '24px',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '16px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#b3b3b3',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '20px',
    color: '#ffffff',
    fontWeight: 'bold',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '4px',
  },
  playerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    border: '1px solid',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  playerName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
  },
  playerGender: {
    fontSize: '12px',
    color: '#b3b3b3',
  },
  removeButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    color: '#e74c3c',
    border: '1px solid rgba(231, 76, 60, 0.3)',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    lineHeight: 1,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#b3b3b3',
    margin: '0 0 8px 0',
  },
  emptyHint: {
    fontSize: '14px',
    color: '#666666',
    margin: 0,
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
