export interface Player {
  uuid: string;
  name: string;
  gender: 'O' | 'W';
  number: number;
}

/**
 * Mixed ratio rotation.
 * - ABBA: 4-point alternating cycle.
 * - AAB: 3-point cycle (two of the starting ratio, one of the opposite).
 * - 4-3 / 3-4: every point uses the same ratio.
 * - MEN / WOMEN: all of one gender (drills, single-gender play).
 */
export type GenderRatioMode =
  | 'ABBA'
  | 'AAB'
  | '4-3'
  | '3-4'
  | 'MEN'
  | 'WOMEN';

/** Players on the line each point (open + women-matching). */
export type LineupSize = 4 | 5 | 6 | 7;

/**
 * Gender ratio for point 1 of the half. Only applies to cyclic modes (ABBA, AAB);
 * other modes use a fixed split that's the same every point.
 */
export type StartsOn = 'O' | 'W';

/** Display theme. Light mode is tuned for outdoor / sunlight readability. */
export type Theme = 'dark' | 'light';