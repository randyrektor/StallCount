import { Player } from '../types';

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
