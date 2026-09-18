import type { LineupSize, SplitCycle } from '../types';
import { getGenderPattern, isSplitCycleAvailable } from './rotationHelpers';
import type { SoftPointCap } from './softCap';

export const SPECTATOR_SNAPSHOT_VERSION = 2 as const;

export type SpectatorLinkStatus = 'preview' | 'snapshot' | 'live' | 'reconnecting';

export type SpectatorSnapshot = {
  v: typeof SPECTATOR_SNAPSHOT_VERSION;
  us: string;
  them: string;
  s1: number;
  s2: number;
  point: number;
  thisOpen: number;
  thisWomen: number;
  nextOpen: number;
  nextWomen: number;
  splitCycle: SplitCycle;
  lineIndex: number;
  softCap: SoftPointCap;
  updatedAt: number;
};

const HASH_PREFIX = 'watch=';
const CYCLES: SplitCycle[] = ['same', 'ABBA', 'AAB'];

function isSplitCycle(value: unknown): value is SplitCycle {
  return CYCLES.includes(value as SplitCycle);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function buildSpectatorSnapshot(input: {
  us: string;
  them: string;
  s1: number;
  s2: number;
  point: number;
  lineIndex: number;
  lineupSize: LineupSize;
  startingOpen: number;
  splitCycle: SplitCycle;
  softCap: SoftPointCap;
  now?: number;
}): SpectatorSnapshot {
  const cycle = isSplitCycleAvailable(input.lineupSize, input.startingOpen, input.splitCycle)
    ? input.splitCycle
    : 'same';
  const thisPoint = getGenderPattern(input.lineIndex, input.lineupSize, input.startingOpen, cycle);
  const nextPoint = getGenderPattern(input.lineIndex + 1, input.lineupSize, input.startingOpen, cycle);
  return {
    v: SPECTATOR_SNAPSHOT_VERSION,
    us: input.us,
    them: input.them,
    s1: input.s1,
    s2: input.s2,
    point: input.point,
    thisOpen: thisPoint.men,
    thisWomen: thisPoint.women,
    nextOpen: nextPoint.men,
    nextWomen: nextPoint.women,
    splitCycle: cycle,
    lineIndex: input.lineIndex,
    softCap: input.softCap,
    updatedAt: input.now ?? Date.now(),
  };
}

export function snapshotShowsGender(snap: SpectatorSnapshot): boolean {
  return snap.thisOpen + snap.thisWomen > 0;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(raw: string): string {
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function normalizeSoftCap(value: unknown): SoftPointCap {
  if (value == null) return null;
  if (!isFiniteNumber(value)) return null;
  return value;
}

function fromV1(parsed: Record<string, unknown>): SpectatorSnapshot | null {
  if (typeof parsed.us !== 'string' || typeof parsed.them !== 'string') return null;
  if (!isFiniteNumber(parsed.s1) || !isFiniteNumber(parsed.s2)) return null;
  return {
    v: SPECTATOR_SNAPSHOT_VERSION,
    us: parsed.us,
    them: parsed.them,
    s1: parsed.s1,
    s2: parsed.s2,
    point: isFiniteNumber(parsed.point) ? parsed.point : 1,
    thisOpen: 0,
    thisWomen: 0,
    nextOpen: 0,
    nextWomen: 0,
    splitCycle: 'same',
    lineIndex: 0,
    softCap: null,
    updatedAt: 0,
  };
}

function fromV2(parsed: Record<string, unknown>): SpectatorSnapshot | null {
  if (typeof parsed.us !== 'string' || typeof parsed.them !== 'string') return null;
  if (!isFiniteNumber(parsed.s1) || !isFiniteNumber(parsed.s2) || !isFiniteNumber(parsed.point)) {
    return null;
  }
  if (
    !isFiniteNumber(parsed.thisOpen) ||
    !isFiniteNumber(parsed.thisWomen) ||
    !isFiniteNumber(parsed.nextOpen) ||
    !isFiniteNumber(parsed.nextWomen)
  ) {
    return null;
  }
  if (!isSplitCycle(parsed.splitCycle)) return null;
  return {
    v: SPECTATOR_SNAPSHOT_VERSION,
    us: parsed.us,
    them: parsed.them,
    s1: parsed.s1,
    s2: parsed.s2,
    point: parsed.point,
    thisOpen: parsed.thisOpen,
    thisWomen: parsed.thisWomen,
    nextOpen: parsed.nextOpen,
    nextWomen: parsed.nextWomen,
    splitCycle: parsed.splitCycle,
    lineIndex: isFiniteNumber(parsed.lineIndex) ? parsed.lineIndex : 0,
    softCap: normalizeSoftCap(parsed.softCap),
    updatedAt: isFiniteNumber(parsed.updatedAt) ? parsed.updatedAt : 0,
  };
}

export function encodeSpectatorSnapshot(snap: SpectatorSnapshot): string {
  return toBase64Url(JSON.stringify(snap));
}

export function decodeSpectatorSnapshot(raw: string): SpectatorSnapshot | null {
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (record.v === 1) return fromV1(record);
    if (record.v === SPECTATOR_SNAPSHOT_VERSION) return fromV2(record);
    return null;
  } catch {
    return null;
  }
}

export function spectatorUrlFromLocation(snap: SpectatorSnapshot): string {
  const encoded = encodeSpectatorSnapshot(snap);
  const path = `${window.location.origin}${window.location.pathname}`;
  return `${path}#${HASH_PREFIX}${encoded}`;
}

export function parseSpectatorHash(hash: string): SpectatorSnapshot | null {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!trimmed.startsWith(HASH_PREFIX)) return null;
  return decodeSpectatorSnapshot(trimmed.slice(HASH_PREFIX.length));
}

export function qrImageUrl(data: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
