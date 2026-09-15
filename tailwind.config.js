/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // A calibration-instrument palette, not a generic dashboard one: a
      // near-black optical-bench body, hairline dividers instead of card
      // borders, and one accent — the red-orange of a rangefinder's index
      // mark — reserved for the thing you're actively pointing at
      // (selection, focus, the Calibrate action).
      colors: {
        ink: '#0a0c0f',
        panel: '#12161c',
        panel2: '#1a1f27',
        line: '#252b34',
        fg: '#dde2e8',
        muted: '#7d8794',
        accent: {
          DEFAULT: '#d8532f',
          dim: '#5c2c1d',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
