/**
 * Semantic color tokens. Each value resolves to a CSS variable defined in
 * src/global.css, which switches between dark and light themes based on the
 * data-theme attribute on <html>.
 */
export const COLORS = {
  background: 'var(--bg-page)',
  border: 'var(--border)',
};

/** Full theme palette for components that need more than the two basics. */
export const THEME = {
  bgPage: 'var(--bg-page)',
  bgApp: 'var(--bg-app)',
  bgElevated: 'var(--bg-elevated)',
  bgPanel: 'var(--bg-panel)',
  bgPanelStrong: 'var(--bg-panel-strong)',
  bgInput: 'var(--bg-input)',
  bgInputSoft: 'var(--bg-input-soft)',
  bgSubtle: 'var(--bg-subtle)',
  bgSubtle2: 'var(--bg-subtle-2)',
  bgSubtle3: 'var(--bg-subtle-3)',
  bgHandle: 'var(--bg-handle)',
  bgOverlay: 'var(--bg-overlay)',
  bgBackdrop: 'var(--bg-backdrop)',

  border: 'var(--border)',
  borderStrong: 'var(--border-strong)',
  borderSoft: 'var(--border-soft)',
  borderSofter: 'var(--border-softer)',
  borderSoftest: 'var(--border-softest)',
  borderFaint: 'var(--border-faint)',

  text: 'var(--text)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  textOnAccent: 'var(--text-on-accent)',

  open: 'var(--accent-open)',
  openStrong: 'var(--accent-open-strong)',
  openMuted: 'var(--accent-open-muted)',
  openTint: 'var(--accent-open-tint)',
  openGlow: 'var(--accent-open-glow)',
  women: 'var(--accent-women)',
  womenMuted: 'var(--accent-women-muted)',
  womenTint: 'var(--accent-women-tint)',

  success: 'var(--success)',
  successTint: 'var(--success-tint)',
  danger: 'var(--danger)',
  dangerTint: 'var(--danger-tint)',
  dangerBorder: 'var(--danger-border)',

  patternPillBg: 'var(--pattern-pill-bg)',
  patternPillActiveBg: 'var(--pattern-pill-active-bg)',
  patternPillText: 'var(--pattern-pill-text)',

  shadowCard: 'var(--shadow-card)',
  shadowModal: 'var(--shadow-modal)',
  shadowButton: 'var(--shadow-button)',
  shadowCta: 'var(--shadow-cta)',
};
