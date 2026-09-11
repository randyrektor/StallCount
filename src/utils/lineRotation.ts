import { Player } from '../types';

export type LineSeat =
  | { kind: 'player'; player: Player }
  | { kind: 'empty'; gender: 'O' | 'W'; key: string };

export function getLine(
  openQueue: Player[],
  womanQueue: Player[],
  pattern: { men: number; women: number },
  openIndex: number = 0,
  womenIndex: number = 0
): Player[] {
  const men = getWrapped(openQueue, openIndex, pattern.men);
  const women = getWrapped(womanQueue, womenIndex, pattern.women);
  return [...men, ...women];
}

/** Like getLine, but pads missing gender slots so the sideline always shows a full lineup. */
export function getLineSeats(
  openQueue: Player[],
  womanQueue: Player[],
  pattern: { men: number; women: number },
  openIndex: number = 0,
  womenIndex: number = 0
): LineSeat[] {
  const men = getWrapped(openQueue, openIndex, pattern.men);
  const women = getWrapped(womanQueue, womenIndex, pattern.women);
  const seats: LineSeat[] = [];
  for (let i = 0; i < pattern.men; i++) {
    if (men[i]) seats.push({ kind: 'player', player: men[i] });
    else seats.push({ kind: 'empty', gender: 'O', key: `empty-O-${i}` });
  }
  for (let i = 0; i < pattern.women; i++) {
    if (women[i]) seats.push({ kind: 'player', player: women[i] });
    else seats.push({ kind: 'empty', gender: 'W', key: `empty-W-${i}` });
  }
  return seats;
}

export function getWrapped<T>(queue: T[], start: number, count: number): T[] {
  if (queue.length === 0) return [];

  if (count >= queue.length) {
    return [...queue];
  }

  const result = [];
  for (let i = 0; i < count; i++) {
    const index = (start + i) % queue.length;
    result.push(queue[index]);
  }
  return result;
}
