import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GAME_SESSION_KEY,
  clearGameSessionForTeam,
  loadGameSession,
  saveGameSession,
  type GameSession,
} from './gameSession';

const memory = new Map<string, string>();

function installLocalStorage() {
  memory.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    },
  });
}

function session(team1Name: string): GameSession {
  return {
    v: 1,
    team1Name,
    team2Name: 'Away',
    team1Score: 3,
    team2Score: 2,
    roster: [],
    masterOpenQueue: [],
    masterWomenQueue: [],
    pendingPlayers: [],
    gameStarted: true,
    lineIndex: 0,
    pointNumber: 1,
    openIndex: 0,
    womenIndex: 0,
    scoreHistory: [],
    lineupSize: 7,
    startingOpen: 4,
    splitCycle: 'same',
    showRoster: false,
    setupStep: 'line',
  };
}

describe('clearGameSessionForTeam', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    memory.clear();
  });

  it('clears the active game when it belongs to the deleted team', () => {
    saveGameSession(session('Disco'));
    expect(clearGameSessionForTeam('Disco')).toBe(true);
    expect(loadGameSession()).toBeNull();
    expect(memory.has(GAME_SESSION_KEY)).toBe(false);
  });

  it('leaves a game for a different team in place', () => {
    saveGameSession(session('Disco'));
    expect(clearGameSessionForTeam('Away')).toBe(false);
    expect(loadGameSession()?.team1Name).toBe('Disco');
  });
});
