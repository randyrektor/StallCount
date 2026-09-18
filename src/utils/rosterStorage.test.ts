import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Player } from '../types';
import {
  ROSTER_STORAGE_KEY,
  deleteRosterForTeam,
  loadRosterForTeam,
  saveRosterForTeam,
} from './rosterStorage';

const memory = new Map<string, string>();

function installLocalStorage() {
  memory.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    },
  });
}

const player: Player = {
  uuid: 'p1',
  name: 'Alex',
  gender: 'O',
  number: 1,
};

describe('rosterStorage', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    memory.clear();
  });

  it('saves and loads a roster by team name', () => {
    saveRosterForTeam('Disco', [player]);
    expect(loadRosterForTeam('Disco')).toEqual([player]);
  });

  it('deletes a team roster so the same name starts empty', () => {
    saveRosterForTeam('Disco', [player]);
    saveRosterForTeam('Away', [{ ...player, uuid: 'p2', name: 'Sam' }]);

    deleteRosterForTeam('Disco');

    expect(loadRosterForTeam('Disco')).toBeNull();
    expect(loadRosterForTeam('Away')).toHaveLength(1);
  });

  it('removes storage when the last roster is deleted', () => {
    saveRosterForTeam('Disco', [player]);
    deleteRosterForTeam('Disco');
    expect(memory.has(ROSTER_STORAGE_KEY)).toBe(false);
  });
});
