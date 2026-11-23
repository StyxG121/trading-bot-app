import { useCallback, useEffect, useState } from 'react'
import { readMode, writeMode } from '../lib/storage.ts'

export type Tab = 'home' | 'agents' | 'activity' | 'learning'
export type Mode = 'paper' | 'real'

function parseTab(value: string | null): Tab {
  if (value === 'agents' || value === 'activity' || value === 'learning' || value === 'home') return value
  return 'home'
}

function parseMode(value: string | null): Mode {
  if (value === 'real' || value === 'paper') return value
  return readMode()
}

function readRoute(): { tab: Tab; mode: Mode } {
  const params = new URLSearchParams(window.location.search)
  return { tab: parseTab(params.get('tab')), mode: parseMode(params.get('mode')) }
}

export function useRoute() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const sync = () => setRoute(readRoute())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const navigate = useCallback((next: Partial<{ tab: Tab; mode: Mode }>, replace = false) => {
    const current = readRoute()
    const tab = next.tab ?? current.tab
    const mode = next.mode ?? current.mode
    writeMode(mode)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    params.set('mode', mode)
    const url = `${window.location.pathname}?${params.toString()}`
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    setRoute({ tab, mode })
  }, [])

  return { ...route, navigate }
}
