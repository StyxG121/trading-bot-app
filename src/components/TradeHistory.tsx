import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { formatPct, formatSignedSol, shortVienna } from '../lib/format.ts'
import type { ClosedStatsView, ClosedTradeView, ExitCode } from '../lib/normalize.ts'

export function TradeHistory({ trades, stats }: { trades: ClosedTradeView[]; stats: ClosedStatsView }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="mt-2 px-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-full items-center justify-between rounded-full bg-white/6 px-3 text-xs font-semibold text-[#f3f6f3] ring-1 ring-white/6"
      >
        <span>Trade history</span>
        <ChevronDown size={14} className={`text-[#9aa59b] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div id={panelId} className="mt-2 overflow-hidden rounded-2xl bg-[#141716] ring-1 ring-white/6">
          <StatsHeader stats={stats} />
          <div className="max-h-64 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#3dff7a40_transparent]">
            {trades.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[#8e9890]">No closed trades yet</p>
            ) : (
              <ul>
                {trades.map((trade) => (
                  <HistoryRow key={trade.id} trade={trade} />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatsHeader({ stats }: { stats: ClosedStatsView }) {
  const items: [string, string][] = [
    ['Closed', stats.count.toLocaleString('en-US')],
    ['Win rate', stats.winRatePct == null ? '—' : `${formatPlain(stats.winRatePct)}%`],
    ['Net', sol(stats.netSol)],
    ['Best', sol(stats.bestNetSol)],
    ['Worst', sol(stats.worstNetSol)],
    ['Avg', sol(stats.avgNetSol)],
  ]
  return (
    <dl className="grid grid-cols-3 gap-x-2 gap-y-2 border-b border-white/6 px-3 py-2.5">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold tracking-wide text-[#8e9890] uppercase">{label}</dt>
          <dd className="mt-0.5 text-xs font-semibold tabular-nums text-[#f3f6f3]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function HistoryRow({ trade }: { trade: ClosedTradeView }) {
  const tone = trade.netSol == null && trade.netPct == null ? 'text-[#f3f6f3]' : (trade.netSol ?? trade.netPct ?? 0) < 0 ? 'text-[#ff5c6a]' : 'text-[#3dff7a]'
  const when = shortVienna(trade.exitLabel) ?? trade.exitLabel ?? '—'
  return (
    <li className="flex items-start justify-between gap-3 border-t border-white/5 px-3 py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{trade.token}</p>
        <p className="mt-0.5 text-[11px] text-[#8e9890]">
          {when}
          <span className="text-[#6f7872]"> · </span>
          <span>{exitLabel(trade.exitCode)}</span>
          {trade.kind === 'partial' ? <span className="text-[#6f7872]"> · half</span> : null}
          {trade.rulesVersion ? (
            <>
              <span className="text-[#6f7872]"> · </span>
              <span className="rounded-full bg-white/6 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#c5cdc6] uppercase">
                {trade.rulesVersion}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <div className={`shrink-0 text-right tabular-nums ${tone}`}>
        <p className="text-sm font-semibold">{formatPct(trade.netPct)}</p>
        <p className="text-[11px] font-medium">{formatSignedSol(trade.netSol)} SOL</p>
      </div>
    </li>
  )
}

function exitLabel(code: ExitCode): string {
  if (code === 'time') return 'time'
  return code
}

function sol(value: number | null): string {
  return value == null ? '—' : `${formatSignedSol(value)} SOL`
}

function formatPlain(value: number): string {
  return Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 1 })
}
