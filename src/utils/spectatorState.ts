export type SpectatorSnapshot = {
  v: 1;
  us: string;
  them: string;
  s1: number;
  s2: number;
  point: number;
  line: string[];
  next: string[];
};

const HASH_PREFIX = 'watch=';

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

export function encodeSpectatorSnapshot(snap: SpectatorSnapshot): string {
  return toBase64Url(JSON.stringify(snap));
}

export function decodeSpectatorSnapshot(raw: string): SpectatorSnapshot | null {
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as SpectatorSnapshot;
    if (!parsed || parsed.v !== 1) return null;
    if (typeof parsed.us !== 'string' || typeof parsed.them !== 'string') return null;
    if (typeof parsed.s1 !== 'number' || typeof parsed.s2 !== 'number') return null;
    return parsed;
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
