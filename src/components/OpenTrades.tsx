import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { formatPct, formatSignedSol, formatSol, formatViennaClock, formatViennaStamp, shortVienna } from '../lib/format.ts'
import type { OpenPositionView, OpenStatsView } from '../lib/normalize.ts'

export function OpenTrades({
  positions,
  stats,
  asOfMs,
}: {
  positions: OpenPositionView[]
  stats: OpenStatsView
  asOfMs: number | null
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-full items-center justify-between rounded-full bg-white/6 px-3 text-xs font-semibold text-[#f3f6f3] ring-1 ring-white/6"
      >
        <span>Open trades</span>
        <ChevronDown size={14} className={`text-[#9aa59b] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div id={panelId} className="mt-2 overflow-hidden rounded-2xl bg-[#141716] ring-1 ring-white/6">
          <StatsHeader stats={stats} />
          <p className="border-b border-white/6 px-3 py-1.5 text-[10px] text-[#6f7872]">
            prices as of {asOfMs != null ? formatViennaClock(asOfMs) : '—'}
          </p>
          <div className="max-h-64 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#3dff7a40_transparent]">
            {positions.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[#8e9890]">No open trades</p>
            ) : (
              <ul>
                {positions.map((position) => (
                  <OpenRow key={position.id} position={position} />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatsHeader({ stats }: { stats: OpenStatsView }) {
  const items: [string, string][] = [
    ['Open', stats.count.toLocaleString('en-US')],
    ['In play', stats.inPlaySol == null ? '—' : `${formatSol(stats.inPlaySol)} SOL`],
    ['P/L', sol(stats.unrealizedSol)],
    ['P/L %', stats.unrealizedPct == null ? '—' : formatPct(stats.unrealizedPct)],
    ['Best', sol(stats.bestSol)],
    ['Worst', sol(stats.worstSol)],
  ]
  return (
    <dl className="grid grid-cols-3 gap-x-2 gap-y-2 px-3 py-2.5">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold tracking-wide text-[#8e9890] uppercase">{label}</dt>
          <dd className="mt-0.5 text-xs font-semibold tabular-nums text-[#f3f6f3]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function OpenRow({ position }: { position: OpenPositionView }) {
  const value = position.pnlSol ?? position.pnlPct
  const tone = value == null ? 'text-[#f3f6f3]' : value < 0 ? 'text-[#ff5c6a]' : 'text-[#3dff7a]'
  const mark = value == null || value === 0 ? '' : value > 0 ? '▲ ' : '▼ '
  const when = shortVienna(position.entryLabel) ?? (position.entryAt != null ? shortVienna(formatViennaStamp(position.entryAt)) : null) ?? '—'
  return (
    <li className="flex items-start justify-between gap-3 border-t border-white/5 px-3 py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{position.token}</p>
        <p className="mt-0.5 text-[11px] text-[#8e9890]">
          {when}
          {position.sizeSol != null ? (
            <>
              <span className="text-[#6f7872]"> · </span>
              <span>{formatSol(position.sizeSol)} SOL</span>
            </>
          ) : null}
          {position.tp1Done ? (
            <>
              <span className="text-[#6f7872]"> · </span>
              <span className="rounded-full bg-[#3dff7a]/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#3dff7a]">
                TP1 ✓
              </span>
            </>
          ) : null}
          {position.rulesVersion ? (
            <>
              <span className="text-[#6f7872]"> · </span>
              <span className="rounded-full bg-white/6 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#c5cdc6] uppercase">
                {position.rulesVersion}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <div className={`shrink-0 text-right tabular-nums ${tone}`}>
        <p className="text-sm font-semibold">
          {mark}
          {formatPct(position.pnlPct)}
        </p>
        <p className="text-[11px] font-medium">{formatSignedSol(position.pnlSol)} SOL</p>
      </div>
    </li>
  )
}

function sol(value: number | null): string {
  return value == null ? '—' : `${formatSignedSol(value)} SOL`
}
