/** First team to this score wins. `null` means no cap. */
export type SoftPointCap = number | null;

export function parseSoftCap(raw: unknown): SoftPointCap {
  if (raw == null || raw === '' || raw === 'off' || raw === 'none') return null;
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 30) return null;
  return rounded;
}

export function isSoftCapReached(
  team1Score: number,
  team2Score: number,
  cap: SoftPointCap
): boolean {
  if (cap == null) return false;
  return Math.max(team1Score, team2Score) >= cap;
}

export function formatSoftCap(cap: SoftPointCap): string {
  return cap == null ? 'Off' : String(cap);
}

/** Compact badge next to "Point N" — not "To 15", which looks like a point limit. */
export function formatSoftCapBadge(cap: number, reached: boolean): string {
  return reached ? `Score cap ${cap}` : `Score to ${cap}`;
}
