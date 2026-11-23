import { formatPct, formatPlainPct, formatPrice, formatSignedSol, formatSol, shortVienna } from '../lib/format.ts'
import type { FeedItem } from '../lib/normalize.ts'

export function ActivityList({ items, limit, detailed = false }: { items: FeedItem[]; limit?: number; detailed?: boolean }) {
  const rows = limit != null ? items.slice(0, limit) : items
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-[#8e9890]">No activity yet</p>
  }
  return (
    <ul>
      {rows.map((item) => (
        <li key={item.id} className="border-b border-white/6 px-4 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-medium">{item.title}</p>
              <p className="text-xs text-[#8e9890]">{leftMeta(item)}</p>
            </div>
            <div className="shrink-0 text-right">{rightSide(item)}</div>
          </div>
          {detailed && item.detail ? <p className="mt-1 text-xs leading-snug text-[#c5cdc6]">{item.detail}</p> : null}
          {detailed && item.entryPrice != null && item.exitPrice != null ? (
            <p className="mt-1 text-[11px] text-[#8e9890]">
              entry {formatPrice(item.entryPrice)} → exit {formatPrice(item.exitPrice)}
            </p>
          ) : null}
          {detailed && item.miss ? <p className="mt-1 text-[11px] leading-snug text-[#ffb4ba]">{item.miss}</p> : null}
        </li>
      ))}
    </ul>
  )
}

function leftMeta(item: FeedItem): string {
  const time = shortVienna(item.timeLabel)
  const parts = [time, item.verdicts]
  if ((item.kind === 'bought' || item.kind === 'sold') && item.sizeSol != null) {
    parts.push(`${formatSol(item.sizeSol)} SOL`)
  }
  return parts.filter(Boolean).join(' · ')
}

function rightSide(item: FeedItem) {
  if (item.kind === 'sold' || (item.kind === 'bought' && item.pnlSol != null)) {
    const negative = (item.pnlSol ?? 0) < 0
    return (
      <>
        <p className={`text-sm font-semibold tabular-nums ${negative ? 'text-[#ff5c6a]' : 'text-[#3dff7a]'}`}>
          {formatSignedSol(item.pnlSol)}
        </p>
        <p className="text-[11px] text-[#8e9890]">{pctLine(item)}</p>
      </>
    )
  }
  if (item.kind === 'bought' && item.sizeSol != null) {
    return (
      <>
        <p className="text-sm font-semibold tabular-nums">{formatSol(item.sizeSol)} SOL</p>
        <p className="text-[11px] text-[#8e9890]">{item.stackPct != null ? `${formatPlainPct(item.stackPct)} of stack` : ''}</p>
      </>
    )
  }
  if (item.detail) return <p className="max-w-28 text-xs text-[#d5ddd6]">{item.detail}</p>
  return null
}

function pctLine(item: FeedItem): string {
  return [item.pnlPct != null ? formatPct(item.pnlPct) : null, item.stackPct != null ? `${formatPlainPct(item.stackPct)} of stack` : null]
    .filter(Boolean)
    .join(' · ')
}
