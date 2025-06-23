import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  open: '#4a90e2', // Modern blue
  women: '#e83e8c', // Modern pink
  openMuted: 'rgba(50, 74, 106, 0.3)',
  womenMuted: 'rgba(106, 50, 74, 0.3)',
  delete: '#e74c3c',
  add: '#2ecc71',
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
    <div style={styles.playerRow}>
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
        {isPending && <span style={styles.pendingBadge}>Pending</span>}
        <button
          style={{
            ...styles.deleteButton,
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
      </div>
    </div>
  );
}

export function PlayerManagerWeb({ roster, onRosterChange, onLateArrival, pendingPlayers }: PlayerManagerWebProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPlayer, setNewPlayer] = useState<{ name: string; gender: 'O' | 'W' }>({ name: '', gender: 'O' });
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

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

  // Measure content height when component mounts or content changes
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [roster, pendingPlayers, isEditMode]);

  // Consolidated drag end handler
  function handleDragEnd(event: any, gender: 'O' | 'W') {
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

  function handleAddPlayer() {
    if (newPlayer.name.trim()) {
      const newPlayerWithNumber = {
        ...newPlayer,
        uuid: crypto.randomUUID(),
        number: 0, 
      };
      onLateArrival(newPlayerWithNumber);
      setNewPlayer({ name: '', gender: 'O' });
      inputRef.current?.focus();
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.buttonRow}>
        <button style={styles.toggleButton} onClick={() => setIsVisible(!isVisible)}>
          {isVisible ? 'Done' : 'Player Manager'}
        </button>
      </div>

      <div 
        style={{
          ...styles.managerWrapper,
          height: isVisible ? contentHeight : 0,
          opacity: isVisible ? 1 : 0,
        }}
      >
        <div ref={contentRef} style={styles.managerContent}>
          {/* Edit and gender row */}
          <div style={styles.editGenderRow}>
            <div style={styles.genderRow}>
              <button
                style={{ ...styles.genderButton, ...(newPlayer.gender === 'O' ? styles.genderButtonActiveOpen : {}) }}
                onClick={() => setNewPlayer(prev => ({ ...prev, gender: 'O' }))}
              >
                Open
              </button>
              <button
                style={{ ...styles.genderButton, ...(newPlayer.gender === 'W' ? styles.genderButtonActiveWomen : {}) }}
                onClick={() => setNewPlayer(prev => ({ ...prev, gender: 'W' }))}
              >
                Women
              </button>
            </div>
            <div style={{ flex: 1 }} />
            <button 
              style={{ ...styles.actionButton, ...styles.editButton, ...(isEditMode ? styles.editModeActive : {}) }} 
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </button>
          </div>

          {/* Add player controls, new layout */}
          <div style={styles.addPlayerSectionModern}>
            <input
              ref={inputRef}
              style={styles.input}
              value={newPlayer.name}
              onChange={e => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
              placeholder="New player name"
            />
            <button style={styles.addPlayerButton} onClick={handleAddPlayer}>
              Add Player
            </button>
          </div>

          <div style={styles.rosterContainer}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'O')}>
              <div style={styles.rosterColumn}>
                <h3 style={styles.rosterTitle}>Open Players</h3>
                <SortableContext items={openPlayers.map(p => p.uuid)} strategy={verticalListSortingStrategy}>
                  {openPlayers.map((player, index) => (
                    <SortablePlayer key={player.uuid} player={player} index={index} isEditMode={isEditMode} onDelete={handleDeletePlayer} isPending={pendingOpenPlayers.some(p => p.uuid === player.uuid)} />
                  ))}
                </SortableContext>
              </div>
            </DndContext>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'W')}>
              <div style={styles.rosterColumn}>
                <h3 style={styles.rosterTitle}>Women Players</h3>
                <SortableContext items={womenPlayers.map(p => p.uuid)} strategy={verticalListSortingStrategy}>
                  {womenPlayers.map((player, index) => (
                    <SortablePlayer key={player.uuid} player={player} index={index} isEditMode={isEditMode} onDelete={handleDeletePlayer} isPending={pendingWomenPlayers.some(p => p.uuid === player.uuid)} />
                  ))}
                </SortableContext>
              </div>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}

const baseFont = 'system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif';

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    textAlign: 'center'
  },
  managerWrapper: {
    overflow: 'hidden',
    transition: 'height 0.3s ease-in-out, opacity 0.3s ease-in-out',
  },
  managerContent: {
    backgroundColor: 'rgba(45, 45, 45, 0.8)',
    borderRadius: '12px',
    padding: '20px',
  },
  addPlayerSection: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
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
    padding: '8px 16px',
    border: '.5px solid #fff',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: COLORS.textSecondary,
    cursor: 'pointer'
  },
  genderButtonActiveOpen: { backgroundColor: COLORS.open, color: COLORS.text, border: '.5px solid #fff' },
  genderButtonActiveWomen: { backgroundColor: COLORS.women, color: COLORS.text, border: '.5px solid #fff' },
  addButton: {
    padding: '10px 20px',
    backgroundColor: COLORS.add,
    color: COLORS.text,
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
    color: COLORS.text,
    transition: 'background 0.2s',
  },
  editButton: {
    backgroundColor: COLORS.delete,
    color: '#fff',
  },
  rosterContainer: {
    display: 'flex',
    gap: '20px'
  },
  rosterColumn: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: '15px',
    borderRadius: '8px',
  },
  rosterTitle: {
    color: COLORS.text,
    marginBottom: '15px'
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
    padding: '12px',
    borderRadius: '6px',
    color: COLORS.text,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'grab',
  },
  playerName: { fontWeight: '500' },
  pendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px'
  },
  deleteButton: {
    backgroundColor: COLORS.delete,
    color: 'white',
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
    color: COLORS.text,
    borderColor: COLORS.delete
  },
  addPlayerSectionNew: {
    display: 'flex',
    gap: '10px',
    marginBottom: '24px',
    alignItems: 'center',
    marginTop: '8px',
  },
  editRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: '8px',
  },
  addPlayerSectionModern: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'stretch',
    marginTop: '8px',
  },
  genderRow: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  addPlayerButton: {
    width: '100%',
    padding: '12px 0',
    backgroundColor: COLORS.add,
    color: COLORS.text,
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '2px',
    transition: 'background 0.2s',
  },
  editGenderRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: '8px',
  },
  buttonRow: {
    marginBottom: '20px',
  },
  toggleButton: {
    padding: '10px 20px',
    backgroundColor: COLORS.add,
    color: COLORS.text,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
}; 