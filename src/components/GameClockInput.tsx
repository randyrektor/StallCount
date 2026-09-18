import React from 'react';
import {
  formatGameClockInput,
  parseGameClockTime,
  type GameClockTime,
} from '../utils/gameClock';

export function GameClockInput({
  value,
  onChange,
  id,
  ariaLabel,
}: {
  value: GameClockTime;
  onChange: (time: GameClockTime) => void;
  id?: string;
  ariaLabel: string;
}) {
  return (
    <input
      id={id}
      className="soft-cap-input game-clock-input"
      type="time"
      aria-label={ariaLabel}
      value={formatGameClockInput(value)}
      onChange={(e) => onChange(parseGameClockTime(e.target.value))}
    />
  );
}
