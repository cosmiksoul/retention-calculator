// Copies the canonical docs/* data files into public/ so Vite can serve
// them at runtime via fetch('/presets.json') and fetch('/methodology.md').
// Source of truth lives in docs/; the public/ copies are gitignored.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(import.meta.url), '..', '..')

// Required files — build fails if any are missing.
const files = [
  ['docs/presets.json', 'public/presets.json'],
  ['docs/methodology-overview.md', 'public/methodology-overview.md'],
  ['docs/methodology.md', 'public/methodology.md'],
  ['docs/methodology-subscription.md', 'public/methodology-subscription.md'],
  ['docs/og-image.svg', 'public/og-image.svg'],
]

// Optional files — copied if present, otherwise skipped silently. Used for
// the rasterised og-image.png that LinkedIn / Slack / Discord expect (SVG
// support for og:image is patchy across platforms).
const optionalFiles = [
  ['docs/og-image.png', 'public/og-image.png'],
]

for (const [src, dest] of files) {
  const srcPath = resolve(root, src)
  const destPath = resolve(root, dest)
  if (!existsSync(srcPath)) {
    console.error(`prepare-data: missing source ${src}`)
    process.exit(1)
  }
  mkdirSync(dirname(destPath), { recursive: true })
  copyFileSync(srcPath, destPath)
  console.log(`prepare-data: ${src} → ${dest}`)
}

for (const [src, dest] of optionalFiles) {
  const srcPath = resolve(root, src)
  const destPath = resolve(root, dest)
  if (!existsSync(srcPath)) {
    console.warn(`prepare-data: optional ${src} not found, skipping`)
    continue
  }
  mkdirSync(dirname(destPath), { recursive: true })
  copyFileSync(srcPath, destPath)
  console.log(`prepare-data: ${src} → ${dest}`)
}
