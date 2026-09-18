import { describe, it, expect } from 'vitest';
import { scoreOgFilename } from './scoreShareImage';

describe('scoreOgFilename', () => {
  it('builds a safe png name from teams and score', () => {
    expect(scoreOgFilename('Kickoff Test', 'Away!', 7, 6)).toBe(
      'stallparty-kickoff-test-7-6-away.png'
    );
  });

  it('falls back when a name is empty', () => {
    expect(scoreOgFilename('   ', 'Them', 0, 1)).toBe('stallparty-team-0-1-them.png');
  });
});
