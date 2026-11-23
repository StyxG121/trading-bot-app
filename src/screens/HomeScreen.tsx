import { ActivityList } from '../components/ActivityList.tsx'
import { AgentScroller } from '../components/AgentCards.tsx'
import { EquityChart } from '../components/EquityChart.tsx'
import { TradeHistory } from '../components/TradeHistory.tsx'
import {
  formatMultiple,
  formatNum,
  formatPct,
  formatPlainPct,
  formatSignedSol,
  formatSol,
  formatUsd,
} from '../lib/format.ts'
import type { BookView, Mode } from './types.ts'

export function HomeScreen({
  book,
  mode,
  anchor,
  solUsd,
  showUsd,
  onSeeAll,
}: {
  book: BookView
  mode: Mode
  anchor: number | null
  solUsd: number | null
  showUsd: boolean
  onSeeAll: () => void
}) {
  if (!book.live) {
    return <Waiting book={book} mode={mode} anchor={anchor} />
  }

  const negative = book.netSol != null && book.netSol < 0
  const positive = book.netSol != null && book.netSol > 0
  const tone = negative ? 'text-[#ff5c6a]' : positive ? 'text-[#3dff7a]' : 'text-[#f3f6f3]'
  const usd = showUsd && solUsd != null && book.balanceSol != null ? formatUsd(book.balanceSol * solUsd) : null
  const usdNet = showUsd && solUsd != null && book.netSol != null ? formatUsd(book.netSol * solUsd) : null
  const multiple = formatMultiple(book.multiple)

  return (
    <div>
      <div className="px-4 pt-2">
        <p className={`text-[52px] leading-none font-semibold tracking-[-0.045em] tabular-nums whitespace-nowrap ${tone}`}>
          {formatSol(book.balanceSol)}
          <span className="ml-2 align-baseline text-[18px] font-medium tracking-normal">SOL</span>
        </p>
        {book.netSol != null ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className={`text-sm font-semibold tabular-nums ${tone}`}>
              {negative ? '▼' : '▲'} {formatSignedSol(book.netSol)} SOL
              {book.netPct != null ? <span className="font-medium"> · {formatPct(book.netPct)} net</span> : null}
            </p>
            {multiple ? (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${positive ? 'bg-[#3dff7a]/15 text-[#3dff7a]' : 'bg-white/8 text-[#f3f6f3]'}`}>
                {multiple}
              </span>
            ) : null}
          </div>
        ) : null}
        {usd ? (
          <p className="mt-1 text-sm text-[#8e9890] tabular-nums">
            ≈ {usd}
            {usdNet ? ` · ${usdNet}` : ''}
          </p>
        ) : null}
        {book.startSol != null ? (
          <p className="mt-1 text-[11px] text-[#6f7872]">Started at {formatSol(book.startSol)} SOL</p>
        ) : null}
      </div>

      <EquityChart
        points={book.equity}
        anchor={anchor}
        emptyLabel={book.equity.length === 0 ? 'No equity yet' : undefined}
      />

      <TradeHistory trades={book.closedTrades} stats={book.closedStats} />

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-4 text-xs text-[#9aa59b]">
        {book.wins != null ? <span className={book.wins > 0 ? 'text-[#3dff7a]' : ''}>{book.wins}W</span> : null}
        {book.losses != null ? <span className="text-[#ff8d96]">{book.losses}L</span> : null}
        {book.winRatePct != null ? <span>{formatPlainPct(book.winRatePct)} win rate</span> : null}
        {book.openCount != null ? <span>{book.openCount} open</span> : null}
        {book.daysLeft != null ? <span>{formatNum(book.daysLeft, 1)} days left</span> : null}
        {book.grossSol != null ? <span>Gross {formatSignedSol(book.grossSol)}</span> : null}
      </div>
      {book.weekEnd ? <p className="mt-1 px-4 text-[11px] text-[#6f7872]">Week ends {book.weekEnd}</p> : null}

      <AgentScroller agents={book.agents} waiting={false} lastScan={book.lastScanLabel} />

      <section className="mt-4">
        <div className="mb-1 flex items-baseline justify-between px-4">
          <h2 className="text-[15px] font-semibold">Activity</h2>
          <button type="button" onClick={onSeeAll} className="text-xs font-semibold text-[#3dff7a]">
            See all
          </button>
        </div>
        <ActivityList items={book.feed} limit={4} />
      </section>

      {book.budget.length > 0 ? <Budget book={book} /> : null}
    </div>
  )
}

function Waiting({ book, mode, anchor }: { book: BookView; mode: Mode; anchor: number | null }) {
  return (
    <div>
      <div className="px-4 pt-3">
        <h2 className="text-[40px] leading-none font-semibold tracking-tight">{mode === 'real' ? 'Not live yet' : 'No paper data yet'}</h2>
        <p className="mt-2 text-sm text-[#9aa59b]">{book.status ?? (mode === 'real' ? 'Real trading has no fills yet.' : 'This book has no bankroll, trades, or scan log.')}</p>
        {book.balanceSol != null ? (
          <p className="mt-4 text-3xl font-semibold tabular-nums">
            {formatSol(book.balanceSol)} <span className="text-lg font-medium text-[#9aa59b]">SOL</span>
          </p>
        ) : null}
        <dl className="mt-3 space-y-1.5 text-sm">
          {book.chain ? <Fact label="Chain" value={book.chain} /> : null}
          {book.plannedBudget ? <Fact label="Planned budget" value={book.plannedBudget} /> : null}
          {book.wallet ? <Fact label="Wallet" value={book.wallet} mono /> : null}
        </dl>
      </div>
      <EquityChart points={[]} anchor={anchor} emptyLabel={mode === 'real' ? 'Not live yet' : 'No equity yet'} />
      <AgentScroller agents={book.agents} waiting lastScan={null} />
      <section className="mt-4">
        <h2 className="px-4 text-[15px] font-semibold">Activity</h2>
        <ActivityList items={[]} />
      </section>
      {book.leverageRules.length > 0 ? (
        <section className="mt-2 px-4 pb-4">
          <h2 className="text-[15px] font-semibold">Leverage rules</h2>
          <ul className="mt-2 space-y-2">
            {book.leverageRules.map((rule) => (
              <li key={rule} className="text-sm leading-snug text-[#c5cdc6]">
                {rule}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[#8e9890]">{label}</dt>
      <dd className={`max-w-[68%] text-right ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</dd>
    </div>
  )
}

function Budget({ book }: { book: BookView }) {
  return (
    <section className="mt-4 pb-2">
      <h2 className="px-4 text-[15px] font-semibold">Budget P/L</h2>
      <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {book.budget.map((row) => (
          <article key={`${row.bankrollSol}-${row.sizeSol}`} className="w-[148px] shrink-0 rounded-2xl bg-[#141716] p-3 ring-1 ring-white/6">
            <p className="text-sm font-semibold tabular-nums">{formatSol(row.bankrollSol)} SOL</p>
            <p className="text-[11px] text-[#8e9890]">size {formatSol(row.sizeSol)}</p>
            <p className={`mt-2 text-sm font-semibold tabular-nums ${(row.netPct ?? 0) < 0 ? 'text-[#ff5c6a]' : 'text-[#3dff7a]'}`}>
              {formatPct(row.netPct)}
            </p>
            <p className="text-xs tabular-nums text-[#c5cdc6]">{formatSignedSol(row.netSol)} SOL</p>
            <p className="text-[11px] text-[#8e9890]">gross {formatPct(row.grossPct)}</p>
            {row.current ? <p className="mt-1 text-[10px] font-semibold tracking-wide text-[#3dff7a] uppercase">This book</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}
