import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Player } from '../types';
import { commonStyles, playerCardStyle } from '../styles/common';

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
  handle: '#666666',
  section: '#383838',
};

interface PlayerManagerWebProps {
  roster: Player[];
  onRosterChange: (newRoster: Player[]) => void;
  scrollViewRef?: any;
  onLateArrival: (player: Player) => void;
  pendingPlayers: Player[];
}

function SortablePlayer({ player, index, isEditMode, onDelete, isPending, onLongPress }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.uuid });
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
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
      <span style={styles.playerNumber}>{index + 1}</span>
      <div style={{ width: 8 }} /> {/* Small gap */}
      <div
        ref={setNodeRef}
        style={{
          ...playerCardStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: player.gender === 'O'
            ? (isPending ? 'rgba(74,144,226,0.3)' : '#4a90e2')
            : (isPending ? 'rgba(232,62,140,0.3)' : '#e83e8c'),
          position: 'relative',
          opacity: isDragging ? 0.8 : 1,
          transform: CSS.Transform.toString(transform),
          transition,
          touchAction: 'none',
          flex: 1,
        }}
        {...attributes}
        {...listeners}
      >
        <span style={{ ...styles.playerName }}>{player.name}</span>
        {isPending && (
          <span style={{
            ...styles.pendingBadge,
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}>
            Pending
          </span>
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [panelHeight, setPanelHeight] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 10 } }),
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

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
  };

  // Handle drag move
  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !panelRef.current) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY - clientY;
    const newHeight = Math.max(24, Math.min(contentHeight + 24, panelHeight + deltaY)); // 24px for handle only
    
    setPanelHeight(newHeight);
    setDragStartY(clientY);
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const threshold = (contentHeight + 24) * 0.3; // Account for handle only
    if (panelHeight > threshold) {
      setIsVisible(true);
      setPanelHeight(contentHeight + 24); // 24px handle + content
    } else {
      setIsVisible(false);
      setPanelHeight(24); // Just the handle height
    }
  };

  // Add event listeners for drag
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
      const handleTouchMove = (e: TouchEvent) => handleDragMove(e);
      const handleMouseUp = () => handleDragEnd();
      const handleTouchEnd = () => handleDragEnd();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, panelHeight, contentHeight]);

  // Update panel height when visibility changes
  useEffect(() => {
    if (isVisible) {
      setPanelHeight(contentHeight + 24); // 24px handle + content
    } else {
      setPanelHeight(24); // Just the handle height
    }
  }, [isVisible, contentHeight]);

  // Consolidated drag end handler for player sorting
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

  // Handler to enter edit mode from long-press
  const handleLongPress = () => setIsEditMode(true);

  // Handler to exit edit mode
  const handleDone = () => setIsEditMode(false);

  return (
    <div style={styles.slidePanelContainer}>
      {isVisible && (
        <div
          style={styles.backdrop}
          onClick={() => setIsVisible(false)}
        />
      )}
      <div 
        ref={panelRef}
        style={{
          ...styles.slidePanel,
          height: `${Math.max(24, panelHeight)}px`, // Always show at least the drag handle
          zIndex: 1001, // Ensure panel is above the backdrop
        }}
      >
        <div 
          style={{
            ...styles.dragHandle,
            backgroundColor: isVisible ? '#1d1d1d' : '#2d2d2d',
          }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onClick={() => setIsVisible(v => !v)}
        >
          <div style={styles.handleBar} />
        </div>
        {/* Always render content for measurement, but hide visually when closed */}
        <div 
          ref={contentRef} 
          style={{
            ...styles.panelContent,
            opacity: isVisible ? 1 : 0,
            visibility: isVisible ? 'visible' : 'hidden',
            pointerEvents: isVisible ? 'auto' : 'none',
            transition: isDragging ? 'none' : 'opacity 0.3s ease-in-out, visibility 0.3s',
          }}
        >
          {/* Add player controls (input + gender row, then full-width button) */}
          <div style={styles.addPlayerSectionRow}>
            <div style={styles.inputGenderRow}>
              <input
                ref={inputRef}
                style={{ ...styles.input, minWidth: 0, flex: 1 }}
                value={newPlayer.name}
                onChange={e => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                placeholder="Enter player name..."
              />
              <div style={styles.genderButtonGroup}>
                <button
                  style={{ ...styles.genderButton, ...(newPlayer.gender === 'O' ? styles.genderButtonActiveOpen : {}) }}
                  onClick={() => setNewPlayer(prev => ({ ...prev, gender: 'O' }))}
                  aria-label="Open"
                >
                  Open
                </button>
                <button
                  style={{ ...styles.genderButton, ...(newPlayer.gender === 'W' ? styles.genderButtonActiveWomen : {}) }}
                  onClick={() => setNewPlayer(prev => ({ ...prev, gender: 'W' }))}
                  aria-label="Women"
                >
                  Women
                </button>
              </div>
            </div>
            <div style={{ width: '100%' }}>
              <button style={styles.addPlayerButtonFull} onClick={handleAddPlayer}>
                Add Player
              </button>
            </div>
          </div>

          {/* Show Done button in edit mode, but always reserve space to prevent layout shift */}
          <div style={styles.doneButtonRow}>
            <button
              style={{
                ...styles.doneButton,
                opacity: isEditMode ? 1 : 0,
                pointerEvents: isEditMode ? 'auto' : 'none',
                transition: 'opacity 0.2s',
              }}
              onClick={handleDone}
              aria-label="Done Editing"
            >
              Done
            </button>
          </div>

          <div style={styles.rosterContainer}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handlePlayerDragStart} onDragEnd={(e) => handlePlayerDragEnd(e, 'O')}>
              <div style={styles.rosterColumn}>
                <h3 style={styles.rosterTitle}>Open Players</h3>
                <SortableContext items={openPlayers.map(p => p.uuid)} strategy={verticalListSortingStrategy}>
                  {openPlayers.map((player, index) => (
                    <SortablePlayer key={player.uuid} player={player} index={index} isEditMode={isEditMode} onDelete={handleDeletePlayer} isPending={pendingOpenPlayers.some(p => p.uuid === player.uuid)} onLongPress={handleLongPress} />
                  ))}
                </SortableContext>
              </div>
            </DndContext>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handlePlayerDragStart} onDragEnd={(e) => handlePlayerDragEnd(e, 'W')}>
              <div style={styles.rosterColumn}>
                <h3 style={styles.rosterTitle}>Women Players</h3>
                <SortableContext items={womenPlayers.map(p => p.uuid)} strategy={verticalListSortingStrategy}>
                  {womenPlayers.map((player, index) => (
                    <SortablePlayer key={player.uuid} player={player} index={index} isEditMode={isEditMode} onDelete={handleDeletePlayer} isPending={pendingWomenPlayers.some(p => p.uuid === player.uuid)} onLongPress={handleLongPress} />
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
  slidePanelContainer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    pointerEvents: 'none',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  slidePanel: {
    position: 'relative',
    backgroundColor: '#2d2d2d', // fully opaque for the panel shell
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    overflow: 'hidden',
    transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: 'auto',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
    maxHeight: 'calc(100dvh - env(safe-area-inset-bottom))', // Use dynamic viewport height
    width: '100%',
  },
  dragHandle: {
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    backgroundColor: '#1d1d1d', // fully opaque for the handle
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    userSelect: 'none',
    touchAction: 'none',
  },
  handleBar: {
    width: '40px',
    height: '4px',
    backgroundColor: COLORS.handle,
    borderRadius: '2px',
  },
  panelContent: {
    padding: '0px 20px 20px 20px', // even tighter top padding
    maxHeight: 'calc(100dvh - 24px - env(safe-area-inset-bottom))', // Full height minus handle and safe area
    overflowY: 'auto',
    overflowX: 'hidden', // Prevent horizontal scroll
    backgroundColor: '#1d1d1d', // match ScoreBoard background
    WebkitOverflowScrolling: 'touch',
    width: '100%',
    boxSizing: 'border-box',
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
    backgroundColor: '#232323', // subtle gray for inactive
    color: COLORS.textSecondary,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    transition: 'background 0.2s, color 0.2s',
  },
  genderButtonActiveOpen: {
    backgroundColor: COLORS.open,
    color: COLORS.text,
    boxShadow: '0 2px 8px rgba(74,144,226,0.10)',
  },
  genderButtonActiveWomen: {
    backgroundColor: COLORS.women,
    color: COLORS.text,
    boxShadow: '0 2px 8px rgba(232,62,140,0.10)',
  },
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
    gap: '12px',
    backgroundColor: 'rgba(45, 45, 45, 0.5)',
    borderRadius: '12px',
    padding: '20px',
    border: `1px solid ${COLORS.border}`,
    width: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    flexWrap: 'nowrap',
  },
  rosterColumn: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
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
    color: '#fff',
    fontWeight: 500,
    textAlign: 'center',
    width: '100%',
    paddingLeft: 0,
    paddingRight: 0,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10.5px'
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
  toggleButton: {
    padding: '10px 20px',
    backgroundColor: COLORS.add,
    color: COLORS.text,
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
    background: 'rgba(0,0,0,0.35)',
    zIndex: 1000,
    transition: 'opacity 0.3s',
    pointerEvents: 'auto',
  },
  playerNumber: {
    minWidth: 28,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 15,
    color: '#b3b3b3',
    background: 'rgba(83, 0, 0, 0.08)',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  addPlayerSectionRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '0',
    backgroundColor: 'rgba(45, 45, 45, 0.5)',
    borderRadius: '12px',
    padding: '10px',
    marginBottom: '10px',
    border: `1px solid ${COLORS.border}`,
  },
  genderButtonGroup: {
    display: 'flex',
    gap: '10px',
  },
  inputGenderRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    marginBottom: '10px',
  },
  addPlayerButtonFull: {
    width: '100%',
    padding: '16px 0',
    backgroundColor: COLORS.add,
    color: COLORS.text,
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
    color: '#b3b3b3',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'background 0.15s',
    outline: 'none',
  },
  iconEditButtonActive: {
    color: COLORS.delete,
    background: 'rgba(231,76,60,0.08)',
  },
  doneButtonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 10,
  },
  doneButton: {
    background: COLORS.add,
    color: COLORS.text,
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '14px',
    padding: '8px 18px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(46,204,113,0.10)',
    transition: 'background 0.15s',
  },
}; 