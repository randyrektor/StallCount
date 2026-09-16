import type { Player, PlayerPosition } from '../types';
import { isPlayerPosition, parseJersey } from '../types';
import { assignNumbersByGender, insertPlayerAtGenderEndOfRoster } from './rotationHelpers';

export type ParsedRosterRow = {
  name: string;
  gender: 'O' | 'W';
  jersey?: number;
  position?: PlayerPosition;
};

function parseGender(raw: string): 'O' | 'W' | null {
  const g = raw.trim().toLowerCase();
  if (!g) return null;
  if (['o', 'open', 'm', 'man', 'men', 'male', 'guy', 'guys'].includes(g)) return 'O';
  if (['w', 'woman', 'women', 'f', 'female', 'lady', 'ladies', 'wmn'].includes(g)) return 'W';
  return null;
}

function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  if (line.includes(',')) return line.split(',').map((c) => c.trim());
  return line.trim().split(/\s{2,}/).map((c) => c.trim());
}

function looksLikeHeader(line: string): boolean {
  const first = splitRow(line)[0]?.toLowerCase() ?? '';
  return first === 'name' || first === 'player' || first === 'players';
}

/**
 * Parse a pasted/CSV roster. Accepts:
 *   Name, gender[, jersey][, position]
 *   Name  O
 *   Name, women, 12, handler
 */
export function parseRosterText(text: string): { players: ParsedRosterRow[]; errors: string[] } {
  const players: ParsedRosterRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    if (i === 0 && looksLikeHeader(line)) return;

    const cols = splitRow(line).filter((c) => c !== '');
    if (cols.length === 0) return;

    let name = cols[0];
    let gender: 'O' | 'W' | null = cols.length > 1 ? parseGender(cols[1]) : null;
    let restStart = 2;

    // "Alex O" or "Sam W" as a single cell, or "Name Open"
    if (!gender && cols.length === 1) {
      const m = name.match(/^(.*)\s+([A-Za-z]+)$/);
      if (m) {
        const g = parseGender(m[2]);
        if (g) {
          name = m[1].trim();
          gender = g;
          restStart = 1;
        }
      }
    }

    if (!name) {
      errors.push(`Line ${i + 1}: missing name`);
      return;
    }
    if (!gender) {
      errors.push(`Line ${i + 1}: set gender for ${name} (O/Open or W/Women)`);
      return;
    }

    const row: ParsedRosterRow = { name, gender };
    const extra = cols.slice(restStart);
    for (const cell of extra) {
      if (isPlayerPosition(cell.toLowerCase())) {
        row.position = cell.toLowerCase() as PlayerPosition;
        continue;
      }
      const jersey = parseJersey(cell);
      if (jersey != null) {
        row.jersey = jersey;
        continue;
      }
    }
    players.push(row);
  });

  return { players, errors };
}

export function rosterRowKey(name: string, gender: 'O' | 'W'): string {
  return `${gender}:${name.trim().toLowerCase()}`;
}

export function mergeImportedPlayers(roster: Player[], incoming: ParsedRosterRow[]): {
  roster: Player[];
  added: Player[];
  skipped: number;
} {
  const seen = new Set(roster.map((p) => rosterRowKey(p.name, p.gender)));
  const added: Player[] = [];
  let next = roster;
  let skipped = 0;

  for (const row of incoming) {
    const key = rosterRowKey(row.name, row.gender);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    const player: Player = {
      uuid: crypto.randomUUID(),
      name: row.name.trim(),
      gender: row.gender,
      number: 0,
      ...(row.jersey != null ? { jersey: row.jersey } : {}),
      ...(row.position ? { position: row.position } : {}),
    };
    added.push(player);
    next = insertPlayerAtGenderEndOfRoster(next, player);
  }

  return { roster: assignNumbersByGender(next), added, skipped };
}

export function rosterToCsv(roster: Player[]): string {
  const header = 'name,gender,jersey,position';
  const rows = roster.map((p) =>
    [p.name, p.gender, p.jersey ?? '', p.position ?? ''].join(',')
  );
  return [header, ...rows].join('\n');
}
