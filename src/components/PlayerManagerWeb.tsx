import React, { useState, useMemo, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Player } from '../types';
import { commonStyles } from '../styles/common';

// Modern color palette (matching ScoreBoard)
const COLORS = {
  background: '#1a1a1a',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  open: '#4a90e2',
  women: '#e83e8c',
  scoreButtonMinus: '#e74c3c',
  scoreButtonPlus: '#2ecc71',
  border: '#404040',
  input: '#3d3d3d',
};

interface PlayerManagerWebProps {
  roster: Player[];
  onRosterChange: (newRoster: Player[]) => void;
  scrollViewRef?: any;
  onLateArrival: (player: Player) => void;
  pendingPlayers: Player[];
}

function SortablePlayer({ player, index, isEditMode, onDelete, isPending }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.uuid });

  return (
    <div
      style={{
        ...styles.playerRow,
      }}
    >
      <span style={styles.numberSlot}>{index + 1}</span>
      <div
        ref={setNodeRef}
        style={{
          ...styles.playerItem,
          background: player.gender === 'O' 
            ? (isPending ? 'rgba(74,144,226,0.3)' : '#4a90e2')
            : (isPending ? 'rgba(232,62,140,0.3)' : '#e83e8c'),
          touchAction: 'none',
          opacity: isDragging ? 0.8 : 1,
          transform: CSS.Transform.toString(transform),
          transition,
          position: 'relative',
        }}
        {...attributes}
        {...listeners}
      >
        <span style={styles.playerName}>{player.name}</span>
        {isPending && (
          <span style={styles.pendingBadge}>Pending</span>
        )}
        {isEditMode && (
          <button
            style={styles.deleteButton}
            onClick={() => onDelete(player)}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export function PlayerManagerWeb({ roster, onRosterChange, onLateArrival, pendingPlayers }: PlayerManagerWebProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPlayer, setNewPlayer] = useState<{ name: string; gender: 'O' | 'W' }>({ name: '', gender: 'O' });
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 100, tolerance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 10 } })
  );

  // Split roster into open and women
  const openPlayers = useMemo(() => roster.filter(p => p.gender === 'O'), [roster]);
  const womenPlayers = useMemo(() => roster.filter(p => p.gender === 'W'), [roster]);

  // Split pending players into open and women
  const pendingOpenPlayers = useMemo(() => pendingPlayers.filter(p => p.gender === 'O'), [pendingPlayers]);
  const pendingWomenPlayers = useMemo(() => pendingPlayers.filter(p => p.gender === 'W'), [pendingPlayers]);

  // Consolidated drag end handler
  function handleDragEnd(event: any, gender: 'O' | 'W') {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const updated = [...roster]; // Copy the full current roster

    // Filter by gender
    const groupPlayers = updated.filter(p => p.gender === gender);
    const otherPlayers = updated.filter(p => p.gender !== gender);

    const oldIndex = groupPlayers.findIndex(p => p.uuid === active.id);
    const newIndex = groupPlayers.findIndex(p => p.uuid === over.id);

    const reordered = arrayMove(groupPlayers, oldIndex, newIndex);

    // Combine reordered group with preserved other group (maintaining order)
    const newRoster =
      gender === 'O' ? [...reordered, ...otherPlayers] : [...otherPlayers, ...reordered];

    // Update both roster and master queues
    onRosterChange(newRoster);
  }

  function handleDeletePlayer(player: Player) {
    // Simply remove the player without reassigning numbers
    onRosterChange(roster.filter(p => p.uuid !== player.uuid));
  }

  function assignNumbers(players: Player[]) {
    let openCount = 1;
    let womenCount = 1;
    return players.map(player => {
      if (player.gender === 'O') {
        return { ...player, number: openCount++ };
      } else {
        return { ...player, number: womenCount++ };
      }
    });
  }

  function addPlayer() {
    if (newPlayer.name.trim()) {
      const newPlayerWithNumber = {
        ...newPlayer,
        number: newPlayer.gender === 'O' ? openPlayers.length + 1 : womenPlayers.length + 1,
        uuid: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now()),
      };

      // Only call onLateArrival - don't add to roster here
      onLateArrival(newPlayerWithNumber);
      
      setNewPlayer({ name: '', gender: 'O' });
      inputRef.current?.focus();
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.hideButton} onClick={() => setIsVisible(!isVisible)}>
          {isVisible ? 'Hide Player Manager' : 'Show Player Manager'}
        </button>
        {isVisible && (
          <>
            <div style={{ flex: 1 }} />
            <button
              style={{ ...styles.toggleButton, ...(isEditMode ? styles.toggleButtonActive : {}) }}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </button>
          </>
        )}
      </div>
      {isVisible && (
        <>
          <div style={styles.addPlayerSection}>
            <input
              ref={inputRef}
              style={styles.input}
              value={newPlayer.name}
              onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
              placeholder="New player name"
            />
            <div style={styles.genderButtons}>
              <button
                style={{
                  ...styles.genderButton,
                  ...(newPlayer.gender === 'O' ? styles.genderButtonActiveOpen : {}),
                }}
                onClick={() => setNewPlayer({ ...newPlayer, gender: 'O' })}
              >
                Open
              </button>
              <button
                style={{
                  ...styles.genderButton,
                  ...(newPlayer.gender === 'W' ? styles.genderButtonActiveWomen : {}),
                }}
                onClick={() => setNewPlayer({ ...newPlayer, gender: 'W' })}
              >
                Women
              </button>
            </div>
            <button
              style={{
                ...styles.addButton,
                ...(newPlayer.name.trim() ? {} : styles.addButtonDisabled),
              }}
              onClick={addPlayer}
              disabled={!newPlayer.name.trim()}
            >
              Add Player
            </button>
          </div>
          <div style={styles.rostersSection}>
            {/* Open Section */}
            <div style={styles.rosterContainer}>
              <div style={styles.rosterTitle}>Open</div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'O')}>
                <SortableContext items={openPlayers.map(p => p.uuid)} strategy={verticalListSortingStrategy}>
                  {openPlayers.map((player, idx) => (
                    <SortablePlayer
                      key={player.uuid}
                      player={player}
                      index={idx}
                      isEditMode={isEditMode}
                      onDelete={handleDeletePlayer}
                      isPending={pendingPlayers.some(p => p.uuid === player.uuid)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {/* Show pending open players */}
              {pendingOpenPlayers.map((player, idx) => (
                <div key={player.uuid} style={styles.playerRow}>
                  <span style={styles.numberSlot}>P</span>
                  <div style={{
                    ...styles.playerItem,
                    background: 'rgba(74,144,226,0.3)',
                    opacity: 0.7,
                  }}>
                    <span style={styles.playerName}>{player.name}</span>
                    <span style={styles.pendingBadge}>Pending</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Women Section */}
            <div style={styles.rosterContainer}>
              <div style={styles.rosterTitle}>Women</div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'W')}>
                <SortableContext items={womenPlayers.map(p => p.uuid)} strategy={verticalListSortingStrategy}>
                  {womenPlayers.map((player, idx) => (
                    <SortablePlayer
                      key={player.uuid}
                      player={player}
                      index={idx}
                      isEditMode={isEditMode}
                      onDelete={handleDeletePlayer}
                      isPending={pendingPlayers.some(p => p.uuid === player.uuid)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {/* Show pending women players */}
              {pendingWomenPlayers.map((player, idx) => (
                <div key={player.uuid} style={styles.playerRow}>
                  <span style={styles.numberSlot}>P</span>
                  <div style={{
                    ...styles.playerItem,
                    background: 'rgba(232,62,140,0.3)',
                    opacity: 0.7,
                  }}>
                    <span style={styles.playerName}>{player.name}</span>
                    <span style={styles.pendingBadge}>Pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const baseFont = 'system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif';

const styles: any = {
  container: {
    ...commonStyles.cardContainer,
    background: COLORS.background,
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    fontFamily: baseFont,
    boxSizing: 'border-box',
  },
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  hideButton: {
    background: COLORS.input,
    color: COLORS.text,
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontWeight: 'bold',
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: baseFont,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
    fontFamily: baseFont,
  },
  addPlayerSection: {
    background: COLORS.card,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    border: `1px solid ${COLORS.border}`,
    fontFamily: baseFont,
  },
  input: {
    background: COLORS.input,
    color: COLORS.text,
    padding: '10px',
    borderRadius: 4,
    border: 'none',
    marginBottom: 8,
    fontSize: 16,
    outline: 'none',
    fontFamily: baseFont,
  },
  genderButtons: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    fontFamily: baseFont,
  },
  genderButton: {
    flex: 1,
    padding: '10px',
    borderRadius: 4,
    background: COLORS.input,
    color: COLORS.text,
    border: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: 16,
    fontFamily: baseFont,
  },
  genderButtonActiveOpen: {
    background: COLORS.open,
  },
  genderButtonActiveWomen: {
    background: COLORS.women,
  },
  addButton: {
    background: COLORS.scoreButtonPlus,
    color: COLORS.text,
    padding: '10px',
    borderRadius: 4,
    border: 'none',
    fontWeight: 'bold',
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: baseFont,
  },
  addButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  rostersSection: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'space-between',
    fontFamily: baseFont,
  },
  rosterContainer: {
    background: COLORS.card,
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    flex: 1,
    minWidth: 0,
    overflow: 'visible',
    fontFamily: baseFont,
  },
  rosterTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: baseFont,
  },
  playerRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 10,
    fontFamily: baseFont,
  },
  numberSlot: {
    width: 32,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    marginRight: 12,
    userSelect: 'none',
    fontFamily: baseFont,
  },
  playerItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    minWidth: 90,
    padding: '6px 12px',
    borderRadius: 4,
    marginBottom: 8,
    cursor: 'grab',
    transition: 'all 0.3s ease',
    border: '1px solid transparent',
    position: 'relative',
  },
  playerName: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: baseFont,
    flex: 1,
    letterSpacing: 0.5,
    userSelect: 'none',
  },
  deleteButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 20,
    height: 20,
    borderRadius: 10,
    background: COLORS.scoreButtonMinus,
    color: COLORS.text,
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    lineHeight: '20px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    fontFamily: baseFont,
    padding: 0,
  },
  toggleButton: {
    background: '#4a90e2',
    padding: '6px 12px',
    borderRadius: 6,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    border: 'none',
    cursor: 'pointer',
    fontFamily: baseFont,
  },
  toggleButtonActive: {
    background: '#e74c3c',
  },
  lateArrivalToggle: {
    marginBottom: 12,
  },
  pendingBadge: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.2)',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
}; 