/**
 * Editor color themes. Each id must match a `[data-ui-theme="..."]` block in
 * src/index.css that overrides --accent/--accent-dim — only the accent
 * changes between themes, the neutral ink/panel/line/fg base stays fixed.
 */
export type UiTheme = 'rangefinder' | 'cyan' | 'brass' | 'phosphor'

export const UI_THEMES: { id: UiTheme; label: string; swatch: string }[] = [
  { id: 'rangefinder', label: 'Rangefinder', swatch: '#d8532f' },
  { id: 'cyan', label: 'Cyan', swatch: '#38bdf8' },
  { id: 'brass', label: 'Brass', swatch: '#caa049' },
  { id: 'phosphor', label: 'Phosphor', swatch: '#57c785' },
]
