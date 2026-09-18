import React from 'react';
import { AppShell } from './AppShell';
import {
  snapshotShowsGender,
  type SpectatorLinkStatus,
  type SpectatorSnapshot,
} from '../utils/spectatorState';
import { isSoftCapReached } from '../utils/softCap';
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
      <div className="spectator-split-chips">
        <span className="spectator-chip spectator-chip--open">
          <strong>{open}</strong> Open
        </span>
        <span className="spectator-chip spectator-chip--women">
          <strong>{women}</strong> Women
        </span>
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
        <div className="spectator-score-row">
          <div className="spectator-team">
            <span className="spectator-name">{snapshot.us || 'Us'}</span>
            <span className="spectator-score score-num">{snapshot.s1}</span>
          </div>
          <span className="spectator-dash">–</span>
          <div className="spectator-team spectator-team--right">
            <span className="spectator-name">{snapshot.them || 'Them'}</span>
            <span className="spectator-score score-num">{snapshot.s2}</span>
          </div>
        </div>
        <div className="line-info spectator-line-info">
          <div className="line-info-row">
            <div className="line-info-point">
              <span>Point {snapshot.point}</span>
              {snapshot.softCap != null && (
                <span className={`line-info-cap${capReached ? ' is-reached' : ''}`}>
                  {capReached ? `Cap ${snapshot.softCap}` : `To ${snapshot.softCap}`}
                </span>
              )}
            </div>
            <GenderCyclePills splitCycle={snapshot.splitCycle} lineIndex={snapshot.lineIndex} />
          </div>
        </div>
        {showGender && (
          <div className="spectator-gender">
            <GenderSplit label="This point" open={snapshot.thisOpen} women={snapshot.thisWomen} />
          </div>
        )}
        <p className="spectator-hint">{copy.hint}</p>
      </div>
    </AppShell>
  );
}
