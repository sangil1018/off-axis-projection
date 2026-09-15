/** @type {import('tailwindcss').Config} */
function themeColor(name) {
  return `rgb(var(--${name}) / <alpha-value>)`
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Backed by CSS custom properties (see src/index.css) instead of fixed
      // hex values, so a `data-ui-theme` attribute can swap the whole
      // palette at runtime — see src/store/uiThemes.ts for the presets.
      colors: {
        ink: themeColor('ink'),
        panel: themeColor('panel'),
        panel2: themeColor('panel2'),
        line: themeColor('line'),
        fg: themeColor('fg'),
        muted: themeColor('muted'),
        accent: {
          DEFAULT: themeColor('accent'),
          dim: themeColor('accent-dim'),
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
