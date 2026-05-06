// Copies the canonical docs/* data files into public/ so Vite can serve
// them at runtime via fetch('/presets.json') and fetch('/methodology.md').
// Source of truth lives in docs/; the public/ copies are gitignored.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(import.meta.url), '..', '..')

const files = [
  ['docs/presets.json', 'public/presets.json'],
  ['docs/methodology-overview.md', 'public/methodology-overview.md'],
  ['docs/methodology.md', 'public/methodology.md'],
  ['docs/methodology-subscription.md', 'public/methodology-subscription.md'],
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
