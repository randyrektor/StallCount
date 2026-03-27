# Visual Guide: New Team Management Feature

## User Flow

### Scenario 1: First Time User
```
┌─────────────────────────────────┐
│     Ultimate Frisbee            │
│     Score Tracker               │
│                                 │
│  Your Team Name                 │
│  ┌───────────────────────────┐ │
│  │ Enter your team name      │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │     Start Game     ▶       │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
         ⬇ (clicks Start)
┌─────────────────────────────────┐
│    [Score Screen]               │
│    Team: Disco Fever vs Away    │
│    [Game in progress...]        │
└─────────────────────────────────┘
```

### Scenario 2: Returning User
```
┌─────────────────────────────────┐
│     Ultimate Frisbee            │
│     Score Tracker               │
│                                 │
│  Your Team Name                 │
│  ┌───────────────────────────┐ │
│  │ Disco Fever               │ │
│  └───────────────────────────┘ │
│                                 │
│  Recent Teams                   │
│  ┌───────────────────────────┐ │
│  │ Disco Fever              ✓│ │ ← Most recent
│  │ Team Awesome              │ │
│  │ Flying Discs              │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │     Start Game     ▶       │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

### Scenario 3: Change Team Mid-Season
```
┌─────────────────────────────────┐
│    [Game Screen]                │
│    Settings Button →            │
└─────────────────────────────────┘
         ⬇
┌─────────────────────────────────┐
│    Settings Modal               │
│                                 │
│    [Team Names]                 │
│    [Game Times]                 │
│    [Gender Ratio]               │
│    [Export Score]               │
│                                 │
│  ┌──────────┐  ┌─────────────┐ │
│  │Reset Game│  │ Change Team │ │ ← New!
│  └──────────┘  └─────────────┘ │
└─────────────────────────────────┘
         ⬇ (clicks Change Team)
┌─────────────────────────────────┐
│   "Are you sure? This will      │
│    reset the current game"      │
│    [Cancel]  [Confirm]          │
└─────────────────────────────────┘
         ⬇ (confirms)
┌─────────────────────────────────┐
│    [Back to Home Screen]        │
│    Ready for new team entry     │
└─────────────────────────────────┘
```

## Features at a Glance

### Home Screen
- ✨ Beautiful gradient background (matches game screen)
- 🎨 Modern dark theme
- ⌨️  Enter key support
- 🖱️  Hover effects on all interactive elements
- 📝 Auto-focus on input field
- 🔄 Quick select from recent teams

### Storage
- 💾 Stores last 5 teams
- 🚀 Auto-loads most recent team
- 🔒 All data stored locally (no server needed)
- 🌐 Per-browser storage (standard localStorage)

### Integration
- ✅ Zero impact on existing game logic
- ✅ Seamless transition from home to game
- ✅ Settings panel integration
- ✅ Confirmation dialogs prevent accidents

## Technical Details

### LocalStorage Key
```javascript
"ultimate-teams": ["Team A", "Team B", "Team C", "Team D", "Team E"]
                    ↑ Most recent                              ↑ Oldest
```

### Component Tree
```
App.tsx
├─ showHomeScreen (state)
│
├─ HomeScreen (when showHomeScreen = true)
│  ├─ Team input
│  ├─ Recent teams list
│  └─ Start button
│
└─ Game Components (when showHomeScreen = false)
   ├─ ScoreBoard
   ├─ PlayerManager
   └─ SettingsModal
      └─ Change Team button → triggers showHomeScreen = true
```

### State Flow
```
App Mount
  ↓
Check localStorage
  ↓
Has saved team? ──→ Yes ──→ setShowHomeScreen(false)
  ↓                         Auto-load team
  No                        Show game
  ↓
setShowHomeScreen(true)
Show home screen
```

## Why This Approach?

### ✅ Advantages
1. **Simple**: No backend, no auth, no complexity
2. **Fast**: Instant load, no network requests
3. **Reliable**: Works offline, no server dependencies
4. **User-Friendly**: Remembers your team automatically
5. **Upgradeable**: Easy path to database/auth later

### 🎯 Perfect For
- Single device usage
- Personal tracking
- Quick game setup
- Offline games
- Immediate deployment

### 🔮 Easy Future Upgrade Path
When you're ready for database + auth:
1. Add authentication flow before home screen
2. Replace `localStorage.getItem` → `api.getTeams(userId)`
3. Replace `localStorage.setItem` → `api.saveTeam(userId, team)`
4. Add team sync across devices
5. Add roster templates per team
6. Add historical game data

All UI components are already structured for this upgrade!
