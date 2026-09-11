import React, { forwardRef } from 'react';
import { Player } from '../types';

interface PlayerSeatProps extends React.HTMLAttributes<HTMLDivElement> {
  gender: 'O' | 'W';
  name?: string;
  empty?: boolean;
  tone?: 'current' | 'next';
  pending?: boolean;
}

export const PlayerSeat = forwardRef<HTMLDivElement, PlayerSeatProps>(function PlayerSeat(
  {
    gender,
    name,
    empty = false,
    tone = 'current',
    pending = false,
    className = '',
    style,
    children,
    ...rest
  },
  ref
) {
  const genderLabel = gender === 'O' ? 'Open' : 'Women';
  const classes = [
    'player-seat',
    gender === 'O' ? 'player-seat--open' : 'player-seat--women',
    empty ? 'player-seat--empty' : '',
    tone === 'next' ? 'player-seat--next' : '',
    pending ? 'player-seat--pending' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      style={style}
      aria-label={empty ? `Empty ${genderLabel} seat` : name}
      {...rest}
    >
      <span className="player-seat-name">
        {empty ? `Empty · ${genderLabel}` : name}
      </span>
      {children}
    </div>
  );
});

export function seatFromPlayer(
  player: Player,
  extras?: Pick<PlayerSeatProps, 'tone' | 'pending'>
): PlayerSeatProps {
  return {
    gender: player.gender,
    name: player.name,
    ...extras,
  };
}
