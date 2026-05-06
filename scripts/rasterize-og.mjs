// One-off: rasterize docs/og-image.svg → docs/og-image.png at 1200×630.
// Run via npx so no permanent dep is added:
//   npx -y -p @resvg/resvg-js node scripts/rasterize-og.mjs
//
// Re-run only when the SVG source changes; commit the resulting PNG so
// LinkedIn / Slack / Discord can fetch it for og:image previews.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'docs/og-image.svg')
const dst = resolve(root, 'docs/og-image.png')

const svg = readFileSync(src, 'utf8')
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  background: '#0d1117',
})
const png = resvg.render().asPng()
writeFileSync(dst, png)
console.log(`rasterize-og: ${src} → ${dst} (${png.length} bytes)`)
