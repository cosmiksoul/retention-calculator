// PNG export helper for chart cards. Captures a DOM node via html-to-image
// and triggers a browser download.
//
// We force a solid `--c-bg-elev` background so the rounded card looks the
// same off-screen as it does on the page (the chart wrapper uses
// `bg-bg-elev/40`, which is too transparent to read on a white-ish viewer).
//
// Tables/wrappers inside chart cards may have `overflow-x-auto` so their
// content stays inside the column on narrow viewports. html-to-image
// rasterises whatever the DOM is rendering — including scrollbars — so we
// temporarily flip every scrollable descendant to `overflow: visible` for
// the snapshot, then restore. The captured image gets the full content
// without scrollbars baked in.

import { toPng } from 'html-to-image'

function suppressScrollbars(root) {
  const overrides = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let node = root
  while (node) {
    if (node instanceof HTMLElement) {
      const cs = getComputedStyle(node)
      if (
        cs.overflowX === 'auto' ||
        cs.overflowX === 'scroll' ||
        cs.overflowY === 'auto' ||
        cs.overflowY === 'scroll'
      ) {
        overrides.push({
          el: node,
          ox: node.style.overflowX,
          oy: node.style.overflowY,
        })
        node.style.overflowX = 'visible'
        node.style.overflowY = 'visible'
      }
    }
    node = walker.nextNode()
  }
  return () => {
    for (const { el, ox, oy } of overrides) {
      el.style.overflowX = ox
      el.style.overflowY = oy
    }
  }
}

export async function downloadChartPng(node, filename) {
  if (!node) return
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--c-bg-elev')
    .trim()
  const restore = suppressScrollbars(node)
  let dataUrl
  try {
    dataUrl = await toPng(node, {
      backgroundColor: `rgb(${bg || '22 27 34'})`,
      pixelRatio: 2,
      cacheBust: true,
    })
  } finally {
    restore()
  }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function pngFilename(chartName, presetLabel) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const preset = presetLabel
    ? presetLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : null
  return preset
    ? `${chartName}-${preset}-${ts}.png`
    : `${chartName}-${ts}.png`
}
