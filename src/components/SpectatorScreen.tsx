import React from 'react';
import { AppShell } from './AppShell';
import type { SpectatorSnapshot } from '../utils/spectatorState';

export function SpectatorScreen({
  snapshot,
  onLeave,
}: {
  snapshot: SpectatorSnapshot;
  onLeave?: () => void;
}) {
  return (
    <AppShell
      title="Spectator"
      left={
        onLeave ? (
          <button type="button" className="btn btn-ghost" onClick={onLeave}>
            Close
          </button>
        ) : null
      }
    >
      <div className="spectator-card">
        <p className="spectator-kicker">Live snapshot from the sideline</p>
        <div className="spectator-score-row">
          <div className="spectator-team">
            <span className="spectator-name">{snapshot.us || 'Us'}</span>
            <span className="spectator-score">{snapshot.s1}</span>
          </div>
          <span className="spectator-dash">–</span>
          <div className="spectator-team spectator-team--right">
            <span className="spectator-name">{snapshot.them || 'Them'}</span>
            <span className="spectator-score">{snapshot.s2}</span>
          </div>
        </div>
        <p className="spectator-meta">Point {snapshot.point}</p>
        {snapshot.line.length > 0 && (
          <div className="spectator-line">
            <div className="spectator-line-label">On now</div>
            <p>{snapshot.line.join(' · ')}</p>
          </div>
        )}
        {snapshot.next.length > 0 && (
          <div className="spectator-line">
            <div className="spectator-line-label">Next</div>
            <p>{snapshot.next.join(' · ')}</p>
          </div>
        )}
        <p className="spectator-hint">Scan again or refresh the link to see the latest score.</p>
      </div>
    </AppShell>
  );
}
