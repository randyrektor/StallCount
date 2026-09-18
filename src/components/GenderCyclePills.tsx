import type { SplitCycle } from '../types';

const ABBA = ['A', 'B', 'B', 'A'] as const;
const AAB = ['A', 'A', 'B'] as const;

export function GenderCyclePills({
  splitCycle,
  lineIndex,
}: {
  splitCycle: SplitCycle;
  lineIndex: number;
}) {
  if (splitCycle !== 'ABBA' && splitCycle !== 'AAB') return null;
  const letters = splitCycle === 'AAB' ? AAB : ABBA;
  const len = letters.length;
  const active = ((lineIndex % len) + len) % len;
  return (
    <div className="line-info-pattern">
      <div className="pattern-display">
        {letters.map((letter, i) => (
          <div key={i} className={`pattern-item${active === i ? ' is-active' : ''}`}>
            <span>{letter}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
