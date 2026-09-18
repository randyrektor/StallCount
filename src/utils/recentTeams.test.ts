import { describe, it, expect } from 'vitest';
import {
  parseRecentTeams,
  rememberRecentTeam,
  removeRecentTeam,
  MAX_RECENT_TEAMS,
} from './recentTeams';

describe('parseRecentTeams', () => {
  it('keeps unique trimmed names in order', () => {
    expect(parseRecentTeams([' Disco ', 'Away', 'Disco', '', 12])).toEqual(['Disco', 'Away']);
  });

  it('returns empty for junk', () => {
    expect(parseRecentTeams(null)).toEqual([]);
    expect(parseRecentTeams({})).toEqual([]);
  });
});

describe('rememberRecentTeam', () => {
  it('moves an existing name to the front', () => {
    expect(rememberRecentTeam(['A', 'B', 'C'], 'B')).toEqual(['B', 'A', 'C']);
  });

  it('caps the list', () => {
    const next = rememberRecentTeam(['1', '2', '3', '4', '5'], '6');
    expect(next).toEqual(['6', '1', '2', '3', '4']);
    expect(next).toHaveLength(MAX_RECENT_TEAMS);
  });
});

describe('removeRecentTeam', () => {
  it('drops the named team and leaves the rest', () => {
    expect(removeRecentTeam(['Disco', 'Away', 'Home'], 'Away')).toEqual(['Disco', 'Home']);
  });

  it('is a no-op when the name is not in the list', () => {
    expect(removeRecentTeam(['Disco'], 'Away')).toEqual(['Disco']);
  });
});
