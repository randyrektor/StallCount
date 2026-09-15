export const PLAYER_POSITIONS = ['handler', 'cutter', 'hybrid'] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  handler: 'Handler',
  cutter: 'Cutter',
  hybrid: 'Hybrid',
};

export const PLAYER_POSITION_SHORT: Record<PlayerPosition, string> = {
  handler: 'H',
  cutter: 'C',
  hybrid: 'Hy',
};

export function isPlayerPosition(value: unknown): value is PlayerPosition {
  return PLAYER_POSITIONS.includes(value as PlayerPosition);
}

export function parseJersey(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (!/^\d{1,2}$/.test(trimmed)) return undefined;
  return Number.parseInt(trimmed, 10);
}

export interface Player {
  uuid: string;
  name: string;
  gender: 'O' | 'W';
  /** Rotation order within the open or women queue (not the jersey). */
  number: number;
  jersey?: number;
  position?: PlayerPosition;
}

/** How the open/women split changes from point to point. */
export type SplitCycle = 'same' | 'ABBA' | 'AAB';

/** Players on the line each point (open + women-matching). */
export type LineupSize = 4 | 5 | 6 | 7;

/** Display theme. Light mode is tuned for outdoor / sunlight readability. */
export type Theme = 'dark' | 'light';
