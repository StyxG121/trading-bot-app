import { RefreshCw, Settings } from 'lucide-react'
import { Component, useEffect, useState, type ReactNode } from 'react'
import { BottomNav } from './components/BottomNav.tsx'
import { SettingsSheet } from './components/SettingsSheet.tsx'
import { Button } from './components/ui/button.tsx'
import { useRoute } from './hooks/useRoute.ts'
import { useSnapshot } from './hooks/useSnapshot.ts'
import { useSolPrice } from './hooks/useSolPrice.ts'
import { formatViennaClock } from './lib/format.ts'
import { readShowUsd } from './lib/storage.ts'
import { ActivityScreen } from './screens/ActivityScreen.tsx'
import { AgentsScreen } from './screens/AgentsScreen.tsx'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { LearningScreen } from './screens/LearningScreen.tsx'

export default function App() {
  return (
    <Boundary>
      <Shell />
    </Boundary>
  )
}

function Shell() {
  const { tab, mode, navigate } = useRoute()
  const snap = useSnapshot()
  const solUsd = useSolPrice()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showUsd, setShowUsd] = useState(readShowUsd)
  const book = mode === 'real' ? snap.view?.real : snap.view?.paper

  useEffect(() => {
    const sync = () => setShowUsd(readShowUsd())
    window.addEventListener('tb-usd-changed', sync)
    return () => window.removeEventListener('tb-usd-changed', sync)
  }, [])

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-[#050605] pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-[#050605]/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <Mark />
          <p className="text-[15px] font-semibold tracking-tight">Trading Bot</p>
          <div className="ml-auto flex items-center gap-1">
            <div className="flex rounded-full bg-white/6 p-0.5 text-xs font-semibold">
              {(['paper', 'real'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={mode === item}
                  onClick={() => navigate({ mode: item })}
                  className={`rounded-full px-2.5 py-1 capitalize ${mode === item ? 'bg-[#3dff7a] text-[#04140a]' : 'text-[#9aa59b]'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              <Settings />
            </Button>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-[#8e9890]">
          <p>
            Updated {snap.view?.asOfLabel ?? (snap.fetchedAt ? formatViennaClock(snap.fetchedAt) : snap.loading ? '…' : '—')} Vienna
            {snap.fetchedAt ? <span> · synced {formatViennaClock(snap.fetchedAt)}</span> : null}
          </p>
          <button type="button" className="ml-auto text-[#c5cdc6]" aria-label="Refresh snapshot" onClick={snap.refresh}>
            <RefreshCw size={14} className={snap.loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {snap.view?.modeNote ? (
        <p className="mx-4 mt-1 rounded-full bg-[#221c10] px-3 py-1 text-center text-[11px] font-semibold tracking-wide text-[#e7c27a]">
          {snap.view.modeNote}
        </p>
      ) : null}
      {snap.error ? (
        <p role="alert" className="mx-4 mt-2 rounded-xl bg-[#2a1416] px-3 py-2 text-xs text-[#ffb4ba]">
          {snap.error}
          {snap.view ? ' Showing the last good snapshot.' : ''}
        </p>
      ) : null}

      {!snap.view && snap.loading ? <p className="px-4 py-8 text-sm text-[#8e9890]">Loading snapshot…</p> : null}
      {!snap.view && snap.error ? (
        <div className="px-4 py-8">
          <Button onClick={snap.refresh}>Retry</Button>
        </div>
      ) : null}

      {snap.view && book && tab === 'home' ? (
        <HomeScreen
          book={book}
          mode={mode}
          anchor={snap.view.asOfMs}
          solUsd={solUsd}
          showUsd={showUsd}
          onSeeAll={() => navigate({ tab: 'activity' })}
        />
      ) : null}
      {book && tab === 'agents' ? <AgentsScreen book={book} /> : null}
      {book && tab === 'activity' ? <ActivityScreen book={book} /> : null}
      {snap.view && tab === 'learning' ? <LearningScreen learning={snap.view.learning} /> : null}

      <BottomNav tab={tab} onChange={(next) => navigate({ tab: next })} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} url={snap.url} />
    </div>
  )
}

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <rect width="22" height="22" rx="6" fill="#102216" />
      <path d="M4 14.5 8.2 11l3 2.2L18 6" fill="none" stroke="#3dff7a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="6" r="1.4" fill="#3dff7a" />
    </svg>
  )
}

class Boundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : 'The dashboard failed to render.' }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-[480px] p-4 text-sm">
          <p className="font-semibold">Trading Bot hit a render error.</p>
          <p className="mt-2 text-[#ffb4ba]">{this.state.error}</p>
        </div>
      )
    }
    return this.props.children
  }
}
