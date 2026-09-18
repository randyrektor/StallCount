import React from 'react';
import { APP_NAME, APP_URL } from '../constants';
import { AppShell } from './AppShell';
import {
  snapshotShowsGender,
  type SpectatorLinkStatus,
  type SpectatorSnapshot,
} from '../utils/spectatorState';
import { formatSoftCapBadge, isSoftCapReached } from '../utils/softCap';
import { activeClockReminder, clockReminderCopy } from '../utils/gameClock';
import { useNowTick } from '../hooks/useNowTick';
import { GenderCyclePills } from './GenderCyclePills';

function statusCopy(status: SpectatorLinkStatus): { kicker: string; hint: string } {
  if (status === 'preview') {
    return {
      kicker: 'Preview on this phone',
      hint: 'This is the reader opponents will see. Close to go back to scoring.',
    };
  }
  if (status === 'live') {
    return {
      kicker: 'Live',
      hint: 'Score updates from the sideline. Leave this tab open.',
    };
  }
  if (status === 'reconnecting') {
    return {
      kicker: 'Reconnecting',
      hint: 'Trying to reach the scorer. Last score is shown until then.',
    };
  }
  return {
    kicker: 'Snapshot',
    hint: 'This copy does not update. Use a live room link from Settings.',
  };
}

function GenderSplit({
  label,
  open,
  women,
}: {
  label: string;
  open: number;
  women: number;
}) {
  return (
    <div className="spectator-split">
      <div className="spectator-split-label">{label}</div>
      <div
        className="spectator-split-chips"
        role="group"
        aria-label={`${label}: ${open} open, ${women} women`}
      >
        {open > 0 && (
          <span
            className="spectator-chip spectator-chip--open"
            style={{ flexGrow: open, flexShrink: 1, flexBasis: 0 }}
          >
            <strong>{open}</strong>
            <span className="spectator-chip-label">Open</span>
          </span>
        )}
        {women > 0 && (
          <span
            className="spectator-chip spectator-chip--women"
            style={{ flexGrow: women, flexShrink: 1, flexBasis: 0 }}
          >
            <strong>{women}</strong>
            <span className="spectator-chip-label">Women</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function SpectatorScreen({
  snapshot,
  linkStatus = 'snapshot',
  onLeave,
}: {
  snapshot: SpectatorSnapshot | null;
  linkStatus?: SpectatorLinkStatus;
  onLeave?: () => void;
}) {
  const copy = statusCopy(linkStatus);
  const now = useNowTick();
  const clockReminder = snapshot
    ? activeClockReminder(snapshot.halfAt ?? null, snapshot.endAt ?? null, new Date(now))
    : null;
  if (!snapshot) {
    return (
      <AppShell
        title="Score reader"
        left={
          onLeave ? (
            <button type="button" className="btn btn-ghost" onClick={onLeave}>
              Close
            </button>
          ) : null
        }
      >
        <div className="spectator-card">
          <p className={`spectator-kicker spectator-kicker--${linkStatus}`}>{copy.kicker}</p>
          <p className="spectator-hint">Waiting for the scorer. Leave this tab open.</p>
          <TryStallCount />
        </div>
      </AppShell>
    );
  }
  const capReached = isSoftCapReached(snapshot.s1, snapshot.s2, snapshot.softCap);
  const showGender = snapshotShowsGender(snapshot);

  return (
    <AppShell
      title="Score reader"
      left={
        onLeave ? (
          <button type="button" className="btn btn-ghost" onClick={onLeave}>
            Close
          </button>
        ) : null
      }
    >
      <div className="spectator-card">
        <p className={`spectator-kicker spectator-kicker--${linkStatus}`}>{copy.kicker}</p>
        <div className="score-top-bar spectator-score-bar">
          <div className="score-teams">
            <div className="score-tile">
              <h2 className="score-team-name">{snapshot.us || 'Us'}</h2>
              <h1 className="score-num">{snapshot.s1}</h1>
            </div>
            <div className="score-tile">
              <h2 className="score-team-name">{snapshot.them || 'Them'}</h2>
              <h1 className="score-num">{snapshot.s2}</h1>
            </div>
          </div>
        </div>
        <div className="line-info spectator-line-info">
          <div className="line-info-row">
            <div className="line-info-point">
              <span>Point {snapshot.point}</span>
              {snapshot.softCap != null && (
                <span className={`line-info-cap${capReached ? ' is-reached' : ''}`}>
                  {formatSoftCapBadge(snapshot.softCap, capReached)}
                </span>
              )}
            </div>
            <GenderCyclePills splitCycle={snapshot.splitCycle} lineIndex={snapshot.lineIndex} />
          </div>
        </div>
        {clockReminder && (
          <p className={`spectator-clock-note${clockReminder.phase === 'now' ? ' spectator-clock-note--now' : ''}`}>
            {clockReminderCopy(clockReminder)}
          </p>
        )}
        {showGender && (
          <div className="spectator-gender">
            <GenderSplit label="This point" open={snapshot.thisOpen} women={snapshot.thisWomen} />
          </div>
        )}
        <p className="spectator-hint">{copy.hint}</p>
        <TryStallCount />
      </div>
    </AppShell>
  );
}

function TryStallCount() {
  return (
    <p className="spectator-promo">
      Scoring your own games? Try{' '}
      <a href={APP_URL} target="_blank" rel="noopener noreferrer">
        {APP_NAME}
      </a>.
    </p>
  );
}
