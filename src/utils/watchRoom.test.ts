import { describe, it, expect } from 'vitest';
import {
  createWatchStore,
  mintRoomId,
  nextRoomAlarm,
  normalizeRoomId,
  parseWatchHash,
  WATCH_ROOM_IDLE_MS,
} from './watchRoom';
import { buildSpectatorSnapshot } from './spectatorState';

const snap = buildSpectatorSnapshot({
  us: 'Us',
  them: 'Them',
  s1: 1,
  s2: 0,
  point: 2,
  lineIndex: 1,
  lineupSize: 7,
  startingOpen: 4,
  splitCycle: 'ABBA',
  softCap: 15,
  now: 1,
});

describe('watch room ids', () => {
  it('mints a 6-character unambiguous id', () => {
    const id = mintRoomId(() => 0);
    expect(id).toHaveLength(6);
    expect(normalizeRoomId(id.toLowerCase())).toBe(id);
  });

  it('parses a live room hash', () => {
    expect(parseWatchHash('#watch/AB3K9X')).toEqual({ kind: 'room', roomId: 'AB3K9X' });
  });
});

describe('watch store', () => {
  it('lets a host publish and a viewer receive the snapshot', () => {
    const store = createWatchStore();
    const received: unknown[] = [];
    store.host('AB3K9X', 'secret', () => {});
    const joinMsg = store.join('AB3K9X', (msg) => received.push(msg));
    expect(joinMsg).toEqual({ type: 'state', snap: null });
    store.put('AB3K9X', 'secret', snap);
    expect(received).toEqual([{ type: 'state', snap }]);
  });

  it('rejects a put with the wrong key', () => {
    const store = createWatchStore();
    store.host('AB3K9X', 'secret', () => {});
    expect(store.put('AB3K9X', 'nope', snap)).toEqual({ type: 'error', error: 'forbidden' });
  });

  it('does not rebroadcast an unchanged score', () => {
    const store = createWatchStore();
    const received: unknown[] = [];
    store.host('AB3K9X', 'secret', () => {});
    store.join('AB3K9X', (msg) => received.push(msg));
    store.put('AB3K9X', 'secret', snap);
    received.length = 0;
    store.put('AB3K9X', 'secret', { ...snap, updatedAt: 99 });
    expect(received).toEqual([]);
  });
});

describe('room alarms', () => {
  it('expires after idle time with no activity', () => {
    const created = 1_000;
    const last = 1_000;
    expect(nextRoomAlarm(created + WATCH_ROOM_IDLE_MS + 1, created, last)).toBeNull();
  });

  it('schedules the sooner of idle vs max lifetime', () => {
    const created = 0;
    const last = 0;
    expect(nextRoomAlarm(0, created, last)).toBe(WATCH_ROOM_IDLE_MS);
  });
});
