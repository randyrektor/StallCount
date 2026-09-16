import type { Player, LineupSize, SplitCycle } from '../types';

export const GAME_SESSION_KEY = 'ultimate-active-game';

export type PersistedScoreEvent = {
  team: 1 | 2;
  lineIndex: number;
  pointNumber: number;
  openIndex: number;
  womenIndex: number;
  pendingPlayerIds: string[];
};

export type GameSession = {
  v: 1;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  roster: Player[];
  masterOpenQueue: Player[];
  masterWomenQueue: Player[];
  pendingPlayers: Player[];
  gameStarted: boolean;
  lineIndex: number;
  pointNumber: number;
  openIndex: number;
  womenIndex: number;
  scoreHistory: PersistedScoreEvent[];
  lineupSize: LineupSize;
  startingOpen: number;
  splitCycle: SplitCycle;
  showRoster: boolean;
  setupStep: 'roster' | 'line';
};

function isLineupSize(n: unknown): n is LineupSize {
  return n === 4 || n === 5 || n === 6 || n === 7;
}

export function loadGameSession(): GameSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GAME_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSession;
    if (!parsed || parsed.v !== 1) return null;
    if (!isLineupSize(parsed.lineupSize)) return null;
    if (!Array.isArray(parsed.roster)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGameSession(session: GameSession): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(session));
  } catch {
    // quota
  }
}

export function clearGameSession(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(GAME_SESSION_KEY);
  } catch {
    // ignore
  }
}
