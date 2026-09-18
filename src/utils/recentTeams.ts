export const RECENT_TEAMS_KEY = 'ultimate-teams';
export const MAX_RECENT_TEAMS = 5;

export function parseRecentTeams(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const teams: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const name = item.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    teams.push(name);
  }
  return teams;
}

export function rememberRecentTeam(
  teams: string[],
  name: string,
  max = MAX_RECENT_TEAMS
): string[] {
  const trimmed = name.trim();
  if (!trimmed) return teams.slice(0, max);
  return [trimmed, ...teams.filter((t) => t !== trimmed)].slice(0, max);
}

export function removeRecentTeam(teams: string[], name: string): string[] {
  return teams.filter((t) => t !== name);
}

export function loadRecentTeams(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_TEAMS_KEY);
    if (!raw) return [];
    return parseRecentTeams(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function saveRecentTeams(teams: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RECENT_TEAMS_KEY, JSON.stringify(teams));
  } catch {
    // quota
  }
}
