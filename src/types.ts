export interface Player {
  uuid: string;
  name: string;
  gender: 'O' | 'W';
  number: number;
}

/** How the open/women split changes from point to point. */
export type SplitCycle = 'same' | 'ABBA' | 'AAB';

/** Players on the line each point (open + women-matching). */
export type LineupSize = 4 | 5 | 6 | 7;

/** Display theme. Light mode is tuned for outdoor / sunlight readability. */
export type Theme = 'dark' | 'light';
