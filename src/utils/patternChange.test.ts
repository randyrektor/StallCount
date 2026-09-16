import { describe, it, expect } from 'vitest';
import { getLine, getWrapped } from './lineRotation';
import { getGenderPattern } from './rotationHelpers';
import type { Player, LineupSize, SplitCycle } from '../types';

const o = (n: number): Player => ({
  uuid: `o-${n}`,
  name: String(n),
  gender: 'O',
  number: n,
});
const w = (n: number): Player => ({
  uuid: `w-${n}`,
  name: `W${n}`,
  gender: 'W',
  number: n,
});

function names(players: Player[]): string[] {
  return players.map((p) => p.name);
}

function advance(
  lineIndex: number,
  lineupSize: LineupSize,
  startingOpen: number,
  cycle: SplitCycle,
  openIndex: number,
  womenIndex: number
) {
  const pattern = getGenderPattern(lineIndex, lineupSize, startingOpen, cycle);
  return {
    openIndex: openIndex + pattern.men,
    womenIndex: womenIndex + pattern.women,
    lineIndex: lineIndex + 1,
  };
}

/**
 * Rec-league invariant: changing players-per-point or gender split must not
 * move the rotation window start (next-on). Only the window length changes.
 * Scoring then advances by the *new* pattern counts.
 */
describe('mid-game lineup size / gender split (next-on)', () => {
  it('8 open, 2-3-4-5 on a 4-person line; shrink to 3:3 keeps 2-3-4, next point is 5-6-7', () => {
    const openQ = [1, 2, 3, 4, 5, 6, 7, 8].map(o);
    const womenQ = [1, 2, 3, 4].map(w);
    // Point already rotated so open window starts at #2.
    const openIndex = 1;
    const womenIndex = 0;
    const lineIndex = 1;

    const before = getGenderPattern(lineIndex, 7, 4, 'same');
    expect(before).toEqual({ men: 4, women: 3 });
    expect(names(getWrapped(openQ, openIndex, before.men))).toEqual(['2', '3', '4', '5']);
    expect(names(getWrapped(womenQ, womenIndex, before.women))).toEqual(['W1', 'W2', 'W3']);

    // Same point, now 6v6 at 3:3. Indices are unchanged.
    const afterSize: LineupSize = 6;
    const afterOpen = 3;
    const now = getGenderPattern(lineIndex, afterSize, afterOpen, 'same');
    expect(now).toEqual({ men: 3, women: 3 });
    expect(names(getWrapped(openQ, openIndex, now.men))).toEqual(['2', '3', '4']);
    expect(names(getWrapped(womenQ, womenIndex, now.women))).toEqual(['W1', 'W2', 'W3']);

    const scored = advance(lineIndex, afterSize, afterOpen, 'same', openIndex, womenIndex);
    expect(names(getWrapped(openQ, scored.openIndex, now.men))).toEqual(['5', '6', '7']);
    expect(names(getWrapped(womenQ, scored.womenIndex, now.women))).toEqual(['W4', 'W1', 'W2']);
  });

  it('expanding the open count mid-point pulls the next-on players, does not reshuffle', () => {
    const openQ = [1, 2, 3, 4, 5, 6, 7, 8].map(o);
    const openIndex = 1;
    expect(names(getWrapped(openQ, openIndex, 3))).toEqual(['2', '3', '4']);
    expect(names(getWrapped(openQ, openIndex, 4))).toEqual(['2', '3', '4', '5']);
    expect(names(getWrapped(openQ, openIndex, 5))).toEqual(['2', '3', '4', '5', '6']);
  });

  it('4:3 → 3:4 on the same point: last open comes off, next woman comes on', () => {
    const openQ = [1, 2, 3, 4, 5, 6, 7].map(o);
    const womenQ = [1, 2, 3, 4, 5].map(w);
    const openIndex = 1;
    const womenIndex = 0;
    const lineIndex = 0;

    const fourThree = getGenderPattern(lineIndex, 7, 4, 'same');
    expect(names(getLine(openQ, womenQ, fourThree, openIndex, womenIndex))).toEqual([
      '2', '3', '4', '5', 'W1', 'W2', 'W3',
    ]);

    const threeFour = getGenderPattern(lineIndex, 7, 3, 'same');
    expect(names(getLine(openQ, womenQ, threeFour, openIndex, womenIndex))).toEqual([
      '2', '3', '4', 'W1', 'W2', 'W3', 'W4',
    ]);
  });

  it('does not clamp a wrapped raw index (would jump off next-on after several points)', () => {
    const openQ = [1, 2, 3, 4, 5, 6, 7, 8].map(o);
    // Three 4-open points: raw index 12, effective start is player 5 (12 % 8 = 4).
    const openIndex = 12;
    expect(openQ[openIndex % openQ.length].name).toBe('5');
    expect(names(getWrapped(openQ, openIndex, 4))).toEqual(['5', '6', '7', '8']);

    const wronglyClamped = Math.min(openIndex, openQ.length - 1);
    expect(wronglyClamped).toBe(7);
    expect(names(getWrapped(openQ, wronglyClamped, 4))).toEqual(['8', '1', '2', '3']);

    // Pattern change must keep the raw index: 5-6-7 stay, 8 comes off.
    expect(names(getWrapped(openQ, openIndex, 3))).toEqual(['5', '6', '7']);
  });

  it('ABBA: changing cycle mid-game still honours the same next-on people for the new pattern', () => {
    const openQ = [1, 2, 3, 4, 5, 6].map(o);
    const womenQ = [1, 2, 3, 4, 5].map(w);
    const openIndex = 2;
    const womenIndex = 1;
    const lineIndex = 1; // B in ABBA if starting 4-open

    expect(getGenderPattern(lineIndex, 7, 4, 'ABBA')).toEqual({ men: 3, women: 4 });
    expect(names(getWrapped(openQ, openIndex, 3))).toEqual(['3', '4', '5']);
    expect(names(getWrapped(womenQ, womenIndex, 4))).toEqual(['W2', 'W3', 'W4', 'W5']);

    // Coach switches to repeating 4:3. Window start stays; extra open is next-on #6.
    expect(names(getWrapped(openQ, openIndex, 4))).toEqual(['3', '4', '5', '6']);
    expect(names(getWrapped(womenQ, womenIndex, 3))).toEqual(['W2', 'W3', 'W4']);
  });

  it('women-matching queue shrinks the same way (keep earliest in the window)', () => {
    const womenQ = [1, 2, 3, 4, 5, 6, 7, 8].map(w);
    const womenIndex = 1;
    expect(names(getWrapped(womenQ, womenIndex, 4))).toEqual(['W2', 'W3', 'W4', 'W5']);
    expect(names(getWrapped(womenQ, womenIndex, 3))).toEqual(['W2', 'W3', 'W4']);
    const afterPoint = womenIndex + 3;
    expect(names(getWrapped(womenQ, afterPoint, 3))).toEqual(['W5', 'W6', 'W7']);
  });
});
