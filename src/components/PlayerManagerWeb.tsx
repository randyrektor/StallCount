import React, { useState, useMemo, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Player, type LineupSize, type SplitCycle } from '../types';
import { THEME } from '../constants';
import { AppShell } from './AppShell';
import { PlayerSeat } from './PlayerSeat';
import {
  clampOpenCount,
  isSplitCycleAvailable,
  getGenderPattern,
} from '../utils/rotationHelpers';

const COLORS = {
  background: THEME.bgPage,
  card: THEME.bgElevated,
  text: THEME.text,
  textSecondary: THEME.textSecondary,
  open: THEME.open,
  women: THEME.women,
  delete: THEME.danger,
  add: THEME.success,
  border: THEME.border,
  input: THEME.bgInput,
  handle: 'var(--text-muted)',
};

interface PlayerManagerWebProps {
  roster: Player[];
  onRosterChange: (newRoster: Player[]) => void;
  onLateArrival: (player: Player) => void;
  pendingPlayers: Player[];
  masterOpenQueue?: Player[];
  masterWomenQueue?: Player[];
  onForcePendingToRotation?: (player: Player) => void;
  gameStarted?: boolean;
  setupStep?: 'roster' | 'line';
  usingSavedRoster?: boolean;
  onOpenScoreboard?: () => void;
  onContinueToLine?: () => void;
  onReady?: () => void;
  onOpenSettings?: () => void;
  onBack?: () => void;
  lineupSize?: LineupSize;
  startingOpen?: number;
  splitCycle?: SplitCycle;
  onLineupSizeChange?: (size: LineupSize) => void;
  onStartingOpenChange?: (open: number) => void;
  onSplitCycleChange?: (cycle: SplitCycle) => void;
}

function SortablePlayer({
  player,
  index,
  isEditMode,
  onDelete,
  isPending,
  onLongPress,
  onForcePending,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.uuid });
  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoved = useRef(false);
  const startPosition = useRef<{ x: number; y: number } | null>(null);

  // Handlers for long-press
  const handlePointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    if (isEditMode) return;
    
    // Reset movement tracking
    hasMoved.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPosition.current = { x: clientX, y: clientY };
    
    longPressTimeout.current = setTimeout(() => {
      // Only trigger long-press if we haven't moved significantly
      if (!hasMoved.current && onLongPress) {
        onLongPress();
      }
    }, 800);
  };

  const handlePointerMove = (e: React.PointerEvent | React.TouchEvent) => {
    if (!startPosition.current || isEditMode) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = Math.abs(clientX - startPosition.current.x);
    const deltaY = Math.abs(clientY - startPosition.current.y);
    
    // If moved more than 10px in any direction, cancel long-press
    if (deltaX > 10 || deltaY > 10) {
      hasMoved.current = true;
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }
    }
  };

  const handlePointerUp = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    startPosition.current = null;
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
    >
      {/* Player number outside the card */}
      <span style={styles.playerNumber}>
        {player.number > 0 ? player.number : index + 1}
      </span>
      <div style={{ width: 8 }} /> {/* Small gap */}
      <PlayerSeat
        ref={setNodeRef}
        gender={player.gender}
        name={player.name}
        pending={isPending}
        style={{
          opacity: isDragging ? 0.8 : 1,
          transform: CSS.Transform.toString(transform),
          transition,
          touchAction: 'none',
        }}
        {...attributes}
        {...listeners}
      >
        {isPending && <span className="player-seat-pending">Pending</span>}
        {isPending && onForcePending && isEditMode && (
          <button
            type="button"
            style={styles.forcePendingButton}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onForcePending(player);
            }}
          >
            Add now
          </button>
        )}
        <button
          style={{
            ...styles.deleteButton,
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: isEditMode ? 1 : 0,
            pointerEvents: isEditMode ? 'auto' : 'none',
            transition: 'opacity 0.2s',
          }}
          onClick={() => onDelete(player)}
          tabIndex={isEditMode ? 0 : -1}
          aria-label="Remove player"
        >
          ×
        </button>
      </PlayerSeat>
    </div>
  );
}

function AddGhostRow({
  gender,
  nextNumber,
  value,
  inputRef,
  onChange,
  onSubmit,
}: {
  gender: 'O' | 'W';
  nextNumber: number;
  value: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const genderLabel = gender === 'O' ? 'Open' : 'Women';
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
      <span style={styles.playerNumber}>{nextNumber}</span>
      <div style={{ width: 8 }} />
      <label
        className={`player-seat player-seat--empty player-seat--${gender === 'O' ? 'open' : 'women'} player-seat-add`}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={`Add ${genderLabel.toLowerCase()}`}
          aria-label={`Add ${genderLabel.toLowerCase()} player`}
        />
      </label>
    </div>
  );
}

function GenderRosterColumn({
  gender,
  title,
  players,
  firstCount,
  showLinePreview,
  isEditMode,
  pendingPlayers,
  onDelete,
  onLongPress,
  onForcePending,
  addValue,
  inputRef,
  onAddChange,
  onAddSubmit,
}: {
  gender: 'O' | 'W';
  title: string;
  players: Player[];
  firstCount: number;
  showLinePreview: boolean;
  isEditMode: boolean;
  pendingPlayers: Player[];
  onDelete: (player: Player) => void;
  onLongPress: () => void;
  onForcePending?: (player: Player) => void;
  addValue: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onAddChange: (value: string) => void;
  onAddSubmit: () => void;
}) {
  const first = players.slice(0, firstCount);
  const rest = players.slice(firstCount);
  const emptyCount = showLinePreview ? Math.max(0, firstCount - players.length) : 0;
  const isPending = (player: Player) => pendingPlayers.some((p) => p.uuid === player.uuid);
  const queue = showLinePreview ? first : players;

  return (
    <div style={styles.rosterColumn}>
      <h3 style={styles.rosterTitle}>{title}</h3>
      <SortableContext items={players.map((p) => p.uuid)} strategy={verticalListSortingStrategy}>
        {showLinePreview && <div className="roster-section-label">First line</div>}
        {queue.map((player, index) => (
          <SortablePlayer
            key={player.uuid}
            player={player}
            index={index}
            isEditMode={isEditMode}
            onDelete={onDelete}
            isPending={isPending(player)}
            onLongPress={onLongPress}
            onForcePending={onForcePending}
          />
        ))}
        {Array.from({ length: emptyCount }, (_, i) => (
          <div key={`empty-${gender}-${i}`} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ ...styles.playerNumber, opacity: 0.4 }}>{players.length + i + 1}</span>
            <div style={{ width: 8 }} />
            <PlayerSeat gender={gender} empty />
          </div>
        ))}
        <div className={showLinePreview ? 'roster-section-rest' : undefined}>
          {showLinePreview && rest.map((player, index) => (
            <SortablePlayer
              key={player.uuid}
              player={player}
              index={firstCount + index}
              isEditMode={isEditMode}
              onDelete={onDelete}
              isPending={isPending(player)}
              onLongPress={onLongPress}
              onForcePending={onForcePending}
            />
          ))}
          <AddGhostRow
            gender={gender}
            nextNumber={players.length + 1}
            value={addValue}
            inputRef={inputRef}
            onChange={onAddChange}
            onSubmit={onAddSubmit}
          />
        </div>
      </SortableContext>
    </div>
  );
}

const LINEUP_SIZE_OPTIONS: LineupSize[] = [4, 5, 6, 7];
const CYCLE_OPTIONS: { label: string; value: SplitCycle }[] = [
  { label: 'Same', value: 'same' },
  { label: 'ABBA', value: 'ABBA' },
  { label: 'AAB', value: 'AAB' },
];

function LineSetup({
  lineupSize,
  startingOpen,
  splitCycle,
  onLineupSizeChange,
  onStartingOpenChange,
  onSplitCycleChange,
}: {
  lineupSize: LineupSize;
  startingOpen: number;
  splitCycle: SplitCycle;
  onLineupSizeChange: (size: LineupSize) => void;
  onStartingOpenChange: (open: number) => void;
  onSplitCycleChange?: (cycle: SplitCycle) => void;
}) {
  const openCount = clampOpenCount(startingOpen, lineupSize);
  const womenCount = lineupSize - openCount;

  const setSize = (n: LineupSize) => {
    const open = clampOpenCount(startingOpen, n);
    onLineupSizeChange(n);
    onStartingOpenChange(open);
    if (onSplitCycleChange && !isSplitCycleAvailable(n, open, splitCycle)) {
      onSplitCycleChange('same');
    }
  };

  return (
    <div className="line-setup">
      <div className="line-setup-group">
        <span className="line-setup-label">Players per point</span>
        <div className="line-setup-pills">
          {LINEUP_SIZE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`line-setup-pill${lineupSize === n ? ' is-active' : ''}`}
              onClick={() => setSize(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="line-setup-group">
        <span className="line-setup-label">Starting split</span>
        <div className="line-setup-split">
          <button
            type="button"
            className="line-setup-pill line-setup-pill--open"
            disabled={openCount >= lineupSize}
            aria-label="+ Open"
            onClick={() => onStartingOpenChange(Math.min(lineupSize, openCount + 1))}
          >
            + Open
          </button>
          <span className="line-setup-ratio">{openCount}:{womenCount}</span>
          <button
            type="button"
            className="line-setup-pill line-setup-pill--women"
            disabled={openCount <= 0}
            aria-label="+ Women"
            onClick={() => onStartingOpenChange(Math.max(0, openCount - 1))}
          >
            + Women
          </button>
        </div>
      </div>
      {onSplitCycleChange && (
        <div className="line-setup-group">
          <span className="line-setup-label">Cycle</span>
          <div className="line-setup-pills">
            {CYCLE_OPTIONS.map((opt) => {
              const locked = !isSplitCycleAvailable(lineupSize, openCount, opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`line-setup-pill${splitCycle === opt.value ? ' is-active' : ''}`}
                  disabled={locked}
                  onClick={() => {
                    if (!locked) onSplitCycleChange(opt.value);
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function PlayerManagerWeb({
  roster,
  onRosterChange,
  onLateArrival,
  pendingPlayers,
  masterOpenQueue = [],
  masterWomenQueue = [],
  onForcePendingToRotation,
  gameStarted = false,
  setupStep = 'roster',
  usingSavedRoster = false,
  onOpenScoreboard,
  onContinueToLine,
  onReady,
  onOpenSettings,
  onBack,
  lineupSize = 7,
  startingOpen = 4,
  splitCycle = 'ABBA',
  onLineupSizeChange,
  onStartingOpenChange,
  onSplitCycleChange,
}: PlayerManagerWebProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [openDraft, setOpenDraft] = useState('');
  const [womenDraft, setWomenDraft] = useState('');
  const openInputRef = useRef<HTMLInputElement>(null);
  const womenInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );

  // List order = master rotation queue first (source of truth after subs), then roster-only extras (e.g. pending).
  const openPlayers = useMemo(() => {
    const ids = new Set(masterOpenQueue.map((p) => p.uuid));
    const extras = roster.filter((p) => p.gender === 'O' && !ids.has(p.uuid));
    return [...masterOpenQueue, ...extras];
  }, [masterOpenQueue, roster]);

  const womenPlayers = useMemo(() => {
    const ids = new Set(masterWomenQueue.map((p) => p.uuid));
    const extras = roster.filter((p) => p.gender === 'W' && !ids.has(p.uuid));
    return [...masterWomenQueue, ...extras];
  }, [masterWomenQueue, roster]);

  // Split pending players into open and women
  const pendingOpenPlayers = useMemo(() => pendingPlayers.filter(p => p.gender === 'O'), [pendingPlayers]);
  const pendingWomenPlayers = useMemo(() => pendingPlayers.filter(p => p.gender === 'W'), [pendingPlayers]);

  function handlePlayerDragEnd(event: any, gender: 'O' | 'W') {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const group = gender === 'O' ? openPlayers : womenPlayers;
    const oldIndex = group.findIndex(p => p.uuid === active.id);
    const newIndex = group.findIndex(p => p.uuid === over.id);
    const reorderedGroup = arrayMove(group, oldIndex, newIndex);

    const otherGroup = gender === 'O' ? womenPlayers : openPlayers;
    const newRoster = gender === 'O' ? [...reorderedGroup, ...otherGroup] : [...otherGroup, ...reorderedGroup];

    onRosterChange(assignNumbers(newRoster));
  }

  // Handle drag start to cancel any pending long-press
  function handlePlayerDragStart(event: any) {
    // Cancel any pending long-press when drag actually starts
    // This is a safety measure in case the movement detection didn't catch it
    if (event.active) {
      // The long-press timeout will be cleared by the movement detection
      // but this provides an additional safety net
    }
  }

  function handleDeletePlayer(playerToDelete: Player) {
    // Remove the player from the roster
    const newRoster = roster.filter(p => p.uuid !== playerToDelete.uuid);
    
    // Reassign numbers to maintain proper ordering
    const renumberedRoster = assignNumbers(newRoster);
    
    // Update the roster through the parent component
    onRosterChange(renumberedRoster);
  }

  function assignNumbers(players: Player[]) {
    let openCount = 1;
    let womenCount = 1;
    return players.map(player => ({
      ...player,
      number: player.gender === 'O' ? openCount++ : womenCount++,
    }));
  }

  function handleAddPlayer(gender: 'O' | 'W') {
    const name = (gender === 'O' ? openDraft : womenDraft).trim();
    if (!name) return;
    onLateArrival({
      name,
      gender,
      uuid: crypto.randomUUID(),
      number: 0,
    });
    if (gender === 'O') {
      setOpenDraft('');
      openInputRef.current?.focus();
    } else {
      setWomenDraft('');
      womenInputRef.current?.focus();
    }
  }

  const handleLongPress = () => setIsEditMode(true);
  const isRosterStep = !gameStarted && setupStep === 'roster';
  const isLineStep = !gameStarted && setupStep === 'line';

  const firstPattern = useMemo(
    () => getGenderPattern(0, lineupSize, startingOpen, splitCycle),
    [lineupSize, startingOpen, splitCycle]
  );

  const shellTitle = gameStarted ? 'Roster' : isLineStep ? 'This game' : 'Roster';

  return (
    <AppShell
      title={shellTitle}
      left={
        <>
          {onBack && !gameStarted && (
            <button type="button" className="btn btn-ghost" onClick={onBack}>
              ← Back
            </button>
          )}
          {gameStarted && (
            <>
              <button type="button" className="btn btn-ghost" onClick={onOpenScoreboard}>
                Scoreboard
              </button>
              {onOpenSettings && (
                <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>
                  Settings
                </button>
              )}
            </>
          )}
        </>
      }
      right={
        <>
          {isEditMode && (
            <button type="button" className="btn btn-primary" onClick={() => setIsEditMode(false)}>
              Done
            </button>
          )}
        </>
      }
    >
          {gameStarted && pendingPlayers.length > 0 && (
            <div style={styles.pendingExplainer}>
              <strong style={{ color: COLORS.text }}>Pending</strong>
              <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                {' '}
                — their number would be on this point, so they wait. After this point they take that slot (e.g. field is 4-5-6-1, new #7 stays pending, next rotation is 4-5-6-7).
              </span>
            </div>
          )}

          {isRosterStep && (
            <p style={styles.rosterHint}>
              {usingSavedRoster
                ? 'Default roster — add or reorder. You can add more later.'
                : 'Add names. You can add more later.'}
            </p>
          )}

          {isLineStep && onLineupSizeChange && onStartingOpenChange && (
            <>
              <p style={styles.rosterHint}>Who’s on the field this game. Lists below are the first point.</p>
              <LineSetup
                lineupSize={lineupSize}
                startingOpen={startingOpen}
                splitCycle={splitCycle}
                onLineupSizeChange={onLineupSizeChange}
                onStartingOpenChange={onStartingOpenChange}
                onSplitCycleChange={onSplitCycleChange}
              />
            </>
          )}

          {gameStarted && (
            <p style={styles.rosterHint}>Hold a name to remove. Subs are on the scoreboard.</p>
          )}

          <div style={styles.rosterContainer}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handlePlayerDragStart} onDragEnd={(e) => handlePlayerDragEnd(e, 'O')}>
              <GenderRosterColumn
                gender="O"
                title="Open"
                players={openPlayers}
                firstCount={firstPattern.men}
                showLinePreview={isLineStep}
                isEditMode={isEditMode}
                pendingPlayers={pendingOpenPlayers}
                onDelete={handleDeletePlayer}
                onLongPress={handleLongPress}
                onForcePending={onForcePendingToRotation}
                addValue={openDraft}
                inputRef={openInputRef}
                onAddChange={setOpenDraft}
                onAddSubmit={() => handleAddPlayer('O')}
              />
            </DndContext>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handlePlayerDragStart} onDragEnd={(e) => handlePlayerDragEnd(e, 'W')}>
              <GenderRosterColumn
                gender="W"
                title="Women"
                players={womenPlayers}
                firstCount={firstPattern.women}
                showLinePreview={isLineStep}
                isEditMode={isEditMode}
                pendingPlayers={pendingWomenPlayers}
                onDelete={handleDeletePlayer}
                onLongPress={handleLongPress}
                onForcePending={onForcePendingToRotation}
                addValue={womenDraft}
                inputRef={womenInputRef}
                onAddChange={setWomenDraft}
                onAddSubmit={() => handleAddPlayer('W')}
              />
            </DndContext>
          </div>

          {isRosterStep && (
            <button type="button" className="btn btn-primary kickoff-footer" onClick={onContinueToLine}>
              Continue
            </button>
          )}
          {isLineStep && (
            <button type="button" className="btn btn-primary kickoff-footer" onClick={onReady}>
              Ready
            </button>
          )}
    </AppShell>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: THEME.bgApp,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: `1px solid ${COLORS.border}`,
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    gap: '8px',
    flex: '1 1 0',
  },
  headerRight: {
    display: 'flex',
    gap: '8px',
    flex: '1 1 0',
    justifyContent: 'flex-end',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: COLORS.text,
    textAlign: 'center',
    flex: '0 1 auto',
  },
  headerButton: {
    backgroundColor: THEME.bgInput,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  headerButtonActive: {
    backgroundColor: COLORS.add,
    color: THEME.textOnAccent,
    borderColor: COLORS.add,
  },
  kickoffButton: {
    backgroundColor: THEME.open,
    color: THEME.textOnAccent,
    border: 'none',
    padding: '10px 18px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: THEME.shadowCta,
  },
  pageBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    WebkitOverflowScrolling: 'touch',
  },
  addPlayerSection: {
    display: 'flex',
    gap: '10px',
    marginBottom: '2px',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    backgroundColor: COLORS.input,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '6px',
    color: COLORS.text,
    fontSize: '14px'
  },
  genderButtons: { display: 'flex', gap: '5px' },
  genderButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: THEME.bgInput,
    color: COLORS.textSecondary,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    boxShadow: THEME.shadowButton,
    transition: 'background 0.2s, color 0.2s',
  },
  genderButtonActiveOpen: {
    backgroundColor: COLORS.open,
    color: THEME.textOnAccent,
    boxShadow: '0 2px 8px rgba(74,144,226,0.10)',
  },
  genderButtonActiveWomen: {
    backgroundColor: COLORS.women,
    color: THEME.textOnAccent,
    boxShadow: '0 2px 8px rgba(232,62,140,0.10)',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: COLORS.add,
    color: THEME.textOnAccent,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  actionButtonsRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  actionButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: COLORS.add,
    color: THEME.textOnAccent,
    transition: 'background 0.2s',
  },
  editButton: {
    backgroundColor: COLORS.delete,
    color: THEME.textOnAccent,
  },
  rosterContainer: {
    display: 'flex',
    gap: '16px',
    backgroundColor: THEME.bgPanel,
    borderRadius: '12px',
    padding: '12px 16px 20px 16px',
    border: `1px solid ${COLORS.border}`,
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'visible',
    flexWrap: 'nowrap',
  },
  rosterColumn: {
    flex: 1,
    minWidth: 0,
    overflow: 'visible',
  },
  rosterTitle: {
    color: COLORS.text,
    marginTop: 0,
    marginBottom: '10px',
    textAlign: 'center',
    width: '100%',
    display: 'block',
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  numberSlot: {
    color: COLORS.textSecondary,
    width: '20px'
  },
  playerItem: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'grab',
  },
  playerName: {
    color: THEME.textOnAccent,
    fontWeight: 500,
    textAlign: 'center',
    width: '100%',
    paddingLeft: 0,
    paddingRight: 0,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: THEME.textOnAccent,
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10.5px'
  },
  deleteButton: {
    backgroundColor: COLORS.delete,
    color: THEME.textOnAccent,
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  editModeActive: {
    backgroundColor: COLORS.delete,
    color: THEME.textOnAccent,
    borderColor: COLORS.delete
  },
  addPlayerSectionNew: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
    alignItems: 'center',
    marginTop: '8px',
  },
  addPlayerSectionModern: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '12px',
    alignItems: 'stretch',
    marginTop: '8px',
  },
  genderRow: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  toggleButton: {
    padding: '10px 20px',
    backgroundColor: COLORS.add,
    color: THEME.textOnAccent,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: THEME.bgBackdrop,
    zIndex: 1000,
    transition: 'opacity 0.3s',
    pointerEvents: 'auto',
  },
  playerNumber: {
    minWidth: 28,
    flexShrink: 0,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 15,
    color: THEME.textSecondary,
    background: THEME.bgSubtle,
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  addPlayerSectionRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '0',
    backgroundColor: THEME.bgPanel,
    borderRadius: '12px',
    padding: '10px',
    marginBottom: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  genderButtonGroup: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  inputGenderRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    marginBottom: 0,
    flexWrap: 'wrap',
  },
  addPlayerButton: {
    flex: '0 0 auto',
    padding: '10px 18px',
    backgroundColor: THEME.open,
    color: THEME.textOnAccent,
    border: 'none',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: THEME.shadowCta,
  },
  addPlayerButtonFull: {
    width: '100%',
    padding: '16px 0',
    backgroundColor: COLORS.add,
    color: THEME.textOnAccent,
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(46,204,113,0.15)',
  },
  iconEditButton: {
    background: 'none',
    border: 'none',
    color: COLORS.textSecondary,
    fontSize: '20px',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'background 0.15s',
    outline: 'none',
  },
  iconEditButtonActive: {
    color: COLORS.delete,
    background: THEME.dangerTint,
  },
  doneButtonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  doneButton: {
    background: COLORS.add,
    color: THEME.textOnAccent,
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '14px',
    padding: '8px 18px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(46,204,113,0.10)',
    transition: 'background 0.15s',
  },
  rosterHint: {
    margin: '0 0 10px 0',
    fontSize: '13px',
    lineHeight: 1.45,
    color: COLORS.textSecondary,
  },
  orderHeading: {
    margin: '0 0 10px 0',
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: COLORS.text,
  },
  pendingExplainer: {
    marginBottom: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: THEME.bgPanel,
    border: `1px solid ${COLORS.border}`,
    lineHeight: 1.4,
  },
  forcePendingButton: {
    position: 'absolute',
    right: '36px',
    top: '50%',
    transform: 'translateY(-50%)',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 700,
    border: 'none',
    borderRadius: '4px',
    backgroundColor: COLORS.add,
    color: THEME.textOnAccent,
    cursor: 'pointer',
    zIndex: 2,
  },
}; 