import { describe, it, expect } from 'vitest';
import { parseRosterText, mergeImportedPlayers, rosterToCsv } from './rosterImport';
import type { Player } from '../types';

const p = (name: string, gender: 'O' | 'W'): Player => ({
  uuid: name,
  name,
  gender,
  number: 0,
});

describe('parseRosterText', () => {
  it('parses CSV with header, jersey, and position', () => {
    const text = `name,gender,jersey,position
Alex,O,12,handler
Sam,W,7,cutter`;
    const { players, errors } = parseRosterText(text);
    expect(errors).toEqual([]);
    expect(players).toEqual([
      { name: 'Alex', gender: 'O', jersey: 12, position: 'handler' },
      { name: 'Sam', gender: 'W', jersey: 7, position: 'cutter' },
    ]);
  });

  it('accepts Open/Women words and trailing gender on the name', () => {
    const { players, errors } = parseRosterText('Jordan Open\nRiley, women');
    expect(errors).toEqual([]);
    expect(players.map((x) => [x.name, x.gender])).toEqual([
      ['Jordan', 'O'],
      ['Riley', 'W'],
    ]);
  });

  it('reports rows with no gender', () => {
    const { players, errors } = parseRosterText('Nobody');
    expect(players).toEqual([]);
    expect(errors[0]).toMatch(/gender/);
  });
});

describe('mergeImportedPlayers', () => {
  it('appends new names per gender and skips duplicates', () => {
    const { roster, added, skipped } = mergeImportedPlayers(
      [p('Alex', 'O'), p('Sam', 'W')],
      [
        { name: 'Alex', gender: 'O' },
        { name: 'Bo', gender: 'O' },
        { name: 'Kim', gender: 'W' },
      ]
    );
    expect(skipped).toBe(1);
    expect(added.map((x) => x.name)).toEqual(['Bo', 'Kim']);
    expect(roster.map((x) => x.name)).toEqual(['Alex', 'Bo', 'Sam', 'Kim']);
  });
});

describe('rosterToCsv', () => {
  it('writes a header row', () => {
    const csv = rosterToCsv([p('Alex', 'O')]);
    expect(csv.split('\n')[0]).toBe('name,gender,jersey,position');
    expect(csv).toContain('Alex,O');
  });
});
