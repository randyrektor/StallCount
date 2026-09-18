import type { Player } from '../types';
import { isPlayerPosition } from '../types';

export const ROSTER_STORAGE_KEY = 'ultimate-rosters';

type RosterMap = Record<string, Player[]>;

function isPlayerShape(x: unknown): x is Player {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.uuid === 'string' &&
    typeof o.name === 'string' &&
    (o.gender === 'O' || o.gender === 'W') &&
    typeof o.number === 'number'
  );
}

function normalizePlayer(x: unknown): Player | null {
  if (!isPlayerShape(x)) return null;
  const o = x as Record<string, unknown>;
  const jersey =
    typeof o.jersey === 'number' && Number.isInteger(o.jersey) && o.jersey >= 0 && o.jersey <= 99
      ? o.jersey
      : undefined;
  return {
    uuid: x.uuid,
    name: x.name,
    gender: x.gender,
    number: x.number,
    ...(jersey != null ? { jersey } : {}),
    ...(isPlayerPosition(o.position) ? { position: o.position } : {}),
  };
}

function normalizeTeamKey(teamName: string): string {
  return teamName.trim();
}

function readRosterMap(): RosterMap {
  const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return { ...(parsed as RosterMap) };
}

function writeRosterMap(map: RosterMap): void {
  if (Object.keys(map).length === 0) {
    localStorage.removeItem(ROSTER_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(map));
}

export function loadRosterForTeam(teamName: string): Player[] | null {
  if (typeof localStorage === 'undefined') return null;
  const key = normalizeTeamKey(teamName);
  if (!key) return null;
  try {
    const players = readRosterMap()[key];
    if (!Array.isArray(players)) return null;
    const valid = players.map(normalizePlayer).filter((p): p is Player => p != null);
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
    const map = readRosterMap();
    map[key] = roster;
    writeRosterMap(map);
  } catch (e) {
    console.error('Failed to save roster:', e);
  }
}

export function deleteRosterForTeam(teamName: string): void {
  if (typeof localStorage === 'undefined') return;
  const key = normalizeTeamKey(teamName);
  if (!key) return;
  try {
    const map = readRosterMap();
    if (!(key in map)) return;
    delete map[key];
    writeRosterMap(map);
  } catch {
    // ignore
  }
}
