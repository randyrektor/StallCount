export interface Player {
  uuid: string;
  name: string;
  gender: 'O' | 'W';
  number: number;
}

/** Mixed ratio presets. AAB-* = 3-point cycle when short on one gender. */
export type GenderRatioMode =
  | 'ABBA'
  | 'AAB-MW'
  | 'AAB-WM'
  | '4-3'
  | '3-4'
  | 'MEN'
  | 'WOMEN';

/** Players on the line each point (open + women-matching). */
export type LineupSize = 4 | 5 | 6 | 7;