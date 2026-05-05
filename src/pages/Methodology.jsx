import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'

export default function Methodology() {
  const [content, setContent] = useState('')
  const [error, setError] = useState(null)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}methodology.md`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((text) => {
        if (!cancelled) setContent(text)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Once markdown is rendered, scroll to the in-page anchor (if any).
  // HashRouter gives us location.hash for the *secondary* hash —
  // i.e. "/#/methodology#3-mobile-games--hyper-casual" → location.hash = "#3-mobile-games--hyper-casual".
  useEffect(() => {
    if (!content || !location.hash) return
    const id = decodeURIComponent(location.hash.slice(1))
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [content, location.hash])

  if (error) {
    return (
      <div className="rounded border border-red-900/50 bg-red-950/40 p-4 text-red-300">
        Failed to load methodology: {error}
      </div>
    )
  }
  if (!content) {
    return <div className="text-fg-faint">Loading…</div>
  }

  return (
    <article className="prose prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-accent-fg">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {content}
      </ReactMarkdown>
    </article>
  )
}
