/**
 * Reads CSS design-token variables dynamically via getComputedStyle.
 * Used by Cytoscape graph canvas and imperative components that
 * cannot read CSS custom properties directly (e.g. canvas 2D context).
 *
 * Extends the original Evidence Ledger palette with God Mode tokens:
 * paper-3, ink-3, rule-2, signal-2, warn, info, and glow values.
 */

export interface ThemeColors {
  paper: string;
  paper2: string;
  paper3: string;
  ink: string;
  ink2: string;
  ink3: string;
  rule: string;
  rule2: string;
  signal: string;
  signal2: string;
  signalBg: string;
  ok: string;
  okBg: string;
  warn: string;
  info: string;
}

const LIGHT_DEFAULTS: ThemeColors = {
  paper:     '#F5F2EA',
  paper2:    '#EDE9DD',
  paper3:    '#E6E2D6',
  ink:       '#111111',
  ink2:      '#5A564D',
  ink3:      '#8A867D',
  rule:      '#CFCABD',
  rule2:     '#B8B3A6',
  signal:    '#FF4A1C',
  signal2:   '#E8431A',
  signalBg:  'rgba(255, 74, 28, 0.08)',
  ok:        '#1F7A4D',
  okBg:      'rgba(31, 122, 77, 0.08)',
  warn:      '#D4890C',
  info:      '#2563EB',
};

const DARK_DEFAULTS: ThemeColors = {
  paper:     '#07080A',
  paper2:    '#0F1014',
  paper3:    '#181A1F',
  ink:       '#E8E6E0',
  ink2:      '#8A8880',
  ink3:      '#5A5855',
  rule:      '#1E2028',
  rule2:     '#2A2D35',
  signal:    '#FF9F1C',
  signal2:   '#E8901A',
  signalBg:  'rgba(255, 159, 28, 0.12)',
  ok:        '#34D399',
  okBg:      'rgba(52, 211, 153, 0.10)',
  warn:      '#FBBF24',
  info:      '#60A5FA',
};

/**
 * Returns current theme colours from computed CSS custom properties.
 * Falls back to the appropriate default palette when running SSR
 * or if a property is missing.
 */
export function getThemeColors(): ThemeColors {
  if (typeof window === 'undefined') {
    return LIGHT_DEFAULTS;
  }

  const isDark =
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.hasAttribute('data-theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const defaults = isDark ? DARK_DEFAULTS : LIGHT_DEFAULTS;
  const style = getComputedStyle(document.documentElement);

  const v = (prop: string, fallback: string): string =>
    style.getPropertyValue(prop).trim() || fallback;

  return {
    paper:     v('--paper',      defaults.paper),
    paper2:    v('--paper-2',    defaults.paper2),
    paper3:    v('--paper-3',    defaults.paper3),
    ink:       v('--ink',        defaults.ink),
    ink2:      v('--ink-2',      defaults.ink2),
    ink3:      v('--ink-3',      defaults.ink3),
    rule:      v('--rule',       defaults.rule),
    rule2:     v('--rule-2',     defaults.rule2),
    signal:    v('--signal',     defaults.signal),
    signal2:   v('--signal-2',   defaults.signal2),
    signalBg:  v('--signal-bg',  defaults.signalBg),
    ok:        v('--ok',         defaults.ok),
    okBg:      v('--ok-bg',      defaults.okBg),
    warn:      v('--warn',       defaults.warn),
    info:      v('--info',       defaults.info),
  };
}

/**
 * Returns true when the document is currently in dark mode.
 */
export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.hasAttribute('data-theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}
