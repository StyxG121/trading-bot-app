import { useEffect, useState } from 'react'
import { readShowUsd, saveDataUrl, writeShowUsd } from '../lib/storage.ts'
import { Button } from './ui/button.tsx'
import { Input } from './ui/input.tsx'
import { Sheet, SheetContent } from './ui/sheet.tsx'

type PromptEvent = Event & { prompt: () => Promise<void> }

export function SettingsSheet({
  open,
  onOpenChange,
  url,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
}) {
  const [draft, setDraft] = useState(url)
  const [seenUrl, setSeenUrl] = useState(url)
  if (url !== seenUrl) {
    setSeenUrl(url)
    setDraft(url)
  }
  const [showUsd, setShowUsd] = useState(readShowUsd)
  const [install, setInstall] = useState<PromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstall(event as PromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Settings">
        <label className="block text-xs font-medium text-[#8e9890]" htmlFor="data-url">
          Snapshot URL
        </label>
        <Input
          id="data-url"
          className="mt-1.5"
          value={draft}
          spellCheck={false}
          autoCapitalize="off"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="/data/snapshot.json"
        />
        <p className="mt-1 text-[11px] break-all text-[#6f7872]">Using {url}</p>
        <div className="mt-3 flex gap-2">
          <Button
            onClick={() => {
              saveDataUrl(draft)
              onOpenChange(false)
            }}
          >
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraft('')
              saveDataUrl('')
              onOpenChange(false)
            }}
          >
            Use bundled file
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Show USD</p>
            <p className="text-[11px] text-[#8e9890]">SOL stays primary. USD comes from CoinGecko, then Jupiter.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showUsd}
            onClick={() => {
              const next = !showUsd
              setShowUsd(next)
              writeShowUsd(next)
              window.dispatchEvent(new Event('tb-usd-changed'))
            }}
            className={`relative h-7 w-12 rounded-full ${showUsd ? 'bg-[#3dff7a]' : 'bg-white/15'}`}
          >
            <span className={`absolute top-0.5 size-6 rounded-full bg-[#050605] transition-transform ${showUsd ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold">Add to Home Screen</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#c5cdc6]">
            iPhone: tap Share, then Add to Home Screen. The app opens full screen, without Safari’s toolbar.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#c5cdc6]">
            Android: use the browser menu and choose Install app or Add to Home screen. It opens in standalone mode.
          </p>
          {install ? (
            <Button
              className="mt-3"
              onClick={() => {
                void install.prompt()
                setInstall(null)
              }}
            >
              Install
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
