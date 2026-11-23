import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeSnapshot, type SnapshotView } from '../lib/normalize.ts'
import { resolveDataUrl } from '../lib/storage.ts'

export type SnapshotState = {
  view: SnapshotView | null
  error: string | null
  loading: boolean
  fetchedAt: number | null
  url: string
  refresh: () => void
}

export function useSnapshot(): SnapshotState {
  const [view, setView] = useState<SnapshotView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [url, setUrl] = useState('')
  const runRef = useRef<(force: boolean) => void>(() => {})

  useEffect(() => {
    let cancelled = false
    let seq = 0
    let last = 0

    const run = (force: boolean) => {
      const now = Date.now()
      if (!force && now - last < 1500) return
      last = now
      const my = ++seq
      const next = resolveDataUrl()
      setUrl(next.url)
      setLoading(true)
      void (async () => {
        try {
          const response = await fetch(next.url, { cache: 'no-store' })
          if (!response.ok) throw new Error(`Snapshot returned ${response.status}`)
          const text = await response.text()
          let json: unknown
          try {
            json = JSON.parse(text) as unknown
          } catch {
            throw new Error('Snapshot was not valid JSON')
          }
          const parsed = normalizeSnapshot(json)
          if (cancelled || my !== seq) return
          setView(parsed)
          setError(null)
          setFetchedAt(Date.now())
        } catch (caught) {
          if (cancelled || my !== seq) return
          setError(caught instanceof Error ? caught.message : 'Could not load the snapshot')
        } finally {
          if (!cancelled && my === seq) setLoading(false)
        }
      })()
    }

    runRef.current = run
    run(true)
    const timer = window.setInterval(() => run(false), 60_000)
    const onFocus = () => run(false)
    const onVisible = () => {
      if (document.visibilityState === 'visible') run(false)
    }
    const onChange = () => run(true)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('tb-data-changed', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('tb-data-changed', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])

  const refresh = useCallback(() => runRef.current(true), [])
  return { view, error, loading, fetchedAt, url, refresh }
}
