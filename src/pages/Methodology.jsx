// Combined methodology page — renders both `methodology.md` (DAU) and
// `methodology-subscription.md` (subscription) sequentially under a
// single page-level H1, with a sticky-sidebar TOC for both sections.
//
// Heading levels in the source markdown are shifted down by one when
// rendered (h1→h2, h2→h3, etc.) so the page has exactly one H1
// ("Methodology") and each source file becomes a top-level H2 section.
// Anchor IDs are computed via github-slugger to match rehype-slug, so
// in-page links and `/methodology#some-anchor` URLs keep working.

import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import GithubSlugger from 'github-slugger'

const headingShift = {
  h1: ({ node, ...props }) => <h2 {...props} />,
  h2: ({ node, ...props }) => <h3 {...props} />,
  h3: ({ node, ...props }) => <h4 {...props} />,
  h4: ({ node, ...props }) => <h5 {...props} />,
  h5: ({ node, ...props }) => <h6 {...props} />,
}

// Extract h1/h2/h3 headings from raw markdown — the rendered tags are one
// level down (h2/h3/h4) but TOC hierarchy mirrors the source structure.
// Slugs are computed identically to rehype-slug (same library underneath).
function extractToc(md) {
  const slugger = new GithubSlugger()
  const out = []
  for (const line of md.split('\n')) {
    const m = line.match(/^(#{1,3}) (.+?)\s*$/)
    if (!m) continue
    out.push({
      level: m[1].length,
      text: m[2],
      id: slugger.slug(m[2]),
    })
  }
  return out
}

// Anchor link that scrolls without nuking the HashRouter route.
// Plain `<a href="#id">` would replace the URL hash, so `#/methodology`
// becomes `#id` and the router lands on a non-existent route. We
// preventDefault, scroll manually, and patch the URL with replaceState so
// deep-link copy/paste still produces something useful.
function TocLink({ id, text, className }) {
  const onClick = (e) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (typeof window !== 'undefined') {
      // HashRouter sticks the route in the first hash segment. We append a
      // second `#anchor` after the route so the URL reads
      // `#/methodology#some-anchor` — that pattern is what location.hash
      // already expects (see the scroll-on-mount effect).
      const route = window.location.hash.split('#').slice(0, 2).join('#') || '#/methodology'
      window.history.replaceState(null, '', `${route}#${id}`)
    }
  }
  return (
    <a href={`#${id}`} onClick={onClick} className={className}>
      {text}
    </a>
  )
}

function TocList({ items }) {
  if (!items?.length) return null
  const [head, ...rest] = items
  return (
    <li>
      <TocLink
        id={head.id}
        text={head.text}
        className="block py-0.5 font-medium text-fg hover:text-accent-fg"
      />
      {rest.length > 0 && (
        <ul className="mt-1 space-y-0.5 border-l border-line pl-3">
          {rest.map((h) => (
            <li key={h.id}>
              <TocLink
                id={h.id}
                text={h.text}
                className={`block py-0.5 hover:text-accent-fg ${
                  h.level === 2 ? 'text-fg-muted' : 'pl-3 text-fg-faint'
                }`}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default function Methodology() {
  const [v1, setV1] = useState('')
  const [v2, setV2] = useState('')
  const [error, setError] = useState(null)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}methodology.md`).then((r) => {
        if (!r.ok) throw new Error(`methodology.md HTTP ${r.status}`)
        return r.text()
      }),
      fetch(`${import.meta.env.BASE_URL}methodology-subscription.md`).then(
        (r) => {
          if (!r.ok)
            throw new Error(`methodology-subscription.md HTTP ${r.status}`)
          return r.text()
        },
      ),
    ])
      .then(([a, b]) => {
        if (cancelled) return
        setV1(a)
        setV2(b)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toc = useMemo(() => {
    if (!v1 || !v2) return null
    return { v1: extractToc(v1), v2: extractToc(v2) }
  }, [v1, v2])

  // After both files render, scroll to the in-page anchor (if any).
  useEffect(() => {
    if (!v1 || !v2 || !location.hash) return
    const id = decodeURIComponent(location.hash.slice(1))
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [v1, v2, location.hash])

  if (error) {
    return (
      <div className="rounded border border-red-900/50 bg-red-950/40 p-4 text-red-300">
        Failed to load methodology: {error}
      </div>
    )
  }
  if (!v1 || !v2) {
    return <div className="text-fg-faint">Loading…</div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px,minmax(0,1fr)] lg:gap-10">
      <aside className="scroll-thin text-sm lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-faint">
          On this page
        </div>
        <ul className="space-y-3">
          {toc && <TocList items={toc.v1} />}
          {toc && <TocList items={toc.v2} />}
        </ul>
      </aside>
      <article className="prose prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-accent-fg">
        <h1>Методология</h1>
        <p className="lead">
          Калькулятор LTV использует одну модель — power-law fit ретеншена
          с настраиваемым period (<strong>day</strong> /{' '}
          <strong>week</strong> / <strong>month</strong>) и опциональным
          n-step funnel. Под капотом две группы пресетов с разными
          источниками: первый раздел — DAU-стилевые (игры, iGaming,
          sportsbook, ecommerce, fintech), второй — subscription apps
          (consumer subscriptions: utilities, fitness, language learning,
          AI companions, etc.).
        </p>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug]}
          components={headingShift}
        >
          {v1}
        </ReactMarkdown>
        <hr className="my-12 border-line" />
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug]}
          components={headingShift}
        >
          {v2}
        </ReactMarkdown>
      </article>
    </div>
  )
}
