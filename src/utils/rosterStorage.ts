import type { Player } from '../types';

const STORAGE_KEY = 'ultimate-rosters';

type RosterMap = Record<string, Player[]>;

function isPlayer(x: unknown): x is Player {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.uuid === 'string' &&
    typeof o.name === 'string' &&
    (o.gender === 'O' || o.gender === 'W') &&
    typeof o.number === 'number'
  );
}

function normalizeTeamKey(teamName: string): string {
  return teamName.trim();
}

export function loadRosterForTeam(teamName: string): Player[] | null {
  if (typeof localStorage === 'undefined') return null;
  const key = normalizeTeamKey(teamName);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as unknown;
    if (!map || typeof map !== 'object') return null;
    const players = (map as RosterMap)[key];
    if (!Array.isArray(players)) return null;
    const valid = players.filter(isPlayer);
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

export function saveRosterForTeam(teamName: string, roster: Player[]): void {
  if (typeof localStorage === 'undefined') return;
  const key = normalizeTeamKey(teamName);
  if (!key) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let map: RosterMap = {};
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        map = { ...(parsed as RosterMap) };
      }
    }
    map[key] = roster;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save roster:', e);
  }
}
