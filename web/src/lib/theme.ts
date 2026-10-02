/**
 * Reads Evidence Ledger CSS variables dynamically with getComputedStyle.
 * Used by Cytoscape graph canvas and imperative components.
 */

export interface ThemeColors {
  paper: string;
  paper2: string;
  ink: string;
  ink2: string;
  rule: string;
  signal: string;
  ok: string;
}

export function getThemeColors(): ThemeColors {
  if (typeof window === 'undefined') {
    return {
      paper: '#F5F2EA',
      paper2: '#EDE9DD',
      ink: '#111111',
      ink2: '#5A564D',
      rule: '#CFCABD',
      signal: '#FF4A1C',
      ok: '#1F7A4D',
    };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    paper: style.getPropertyValue('--paper').trim() || '#F5F2EA',
    paper2: style.getPropertyValue('--paper-2').trim() || '#EDE9DD',
    ink: style.getPropertyValue('--ink').trim() || '#111111',
    ink2: style.getPropertyValue('--ink-2').trim() || '#5A564D',
    rule: style.getPropertyValue('--rule').trim() || '#CFCABD',
    signal: style.getPropertyValue('--signal').trim() || '#FF4A1C',
    ok: style.getPropertyValue('--ok').trim() || '#1F7A4D',
  };
}
