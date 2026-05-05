import typography from '@tailwindcss/typography'

// Maps a CSS-variable RGB triplet (e.g. `230 237 243`) into a Tailwind colour
// definition that supports opacity modifiers like `bg-bg-elev/40`. The
// `<alpha-value>` placeholder is replaced by Tailwind at build time.
const fromVar = (cssVar) => `rgb(var(${cssVar}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        // Foreground
        fg: {
          DEFAULT: fromVar('--c-fg'),
          strong: fromVar('--c-fg-strong'),
          muted: fromVar('--c-fg-muted'),
          dim: fromVar('--c-fg-dim'),
          faint: fromVar('--c-fg-faint'),
          disabled: fromVar('--c-fg-disabled'),
        },
        // Background surfaces
        bg: {
          DEFAULT: fromVar('--c-bg'),
          elev: fromVar('--c-bg-elev'),
          subtle: fromVar('--c-bg-subtle'),
        },
        // Borders / dividers
        line: {
          DEFAULT: fromVar('--c-line'),
          strong: fromVar('--c-line-strong'),
          soft: fromVar('--c-line-soft'),
        },
        // Accent (cyan family)
        accent: {
          DEFAULT: fromVar('--c-accent'),
          fg: fromVar('--c-accent-fg'),
          soft: fromVar('--c-accent-soft'),
          surface: fromVar('--c-accent-surface'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
}
