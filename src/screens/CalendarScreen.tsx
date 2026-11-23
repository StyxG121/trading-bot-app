import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatPct, formatSignedSol, formatViennaClock, shortVienna } from '../lib/format.ts'
import {
  buildMonthGrid,
  buildYearMonths,
  monthKey,
  shiftMonth,
  summarizeDays,
  daysInMonth,
  viennaDateKey,
  type CalendarView,
} from '../lib/calendar.ts'
import type { DailyPnlDay, DailyPnlTrade } from '../lib/normalize.ts'

export function CalendarScreen({ days, asOfMs }: { days: DailyPnlDay[]; asOfMs: number | null }) {
  const todayKey = viennaDateKey(Date.now())
  const todayParts = todayKey.split('-').map(Number)
  const [year, setYear] = useState(todayParts[0] || 2026)
  const [month, setMonth] = useState(todayParts[1] || 11)
  const [view, setView] = useState<CalendarView>('month')
  const [selected, setSelected] = useState<string | null>(todayKey)

  const monthDays = useMemo(() => daysInMonth(days, year, month), [days, year, month])
  const summary = useMemo(() => summarizeDays(monthDays), [monthDays])
  const grid = useMemo(() => buildMonthGrid(year, month, days, todayKey), [year, month, days, todayKey])
  const yearMonths = useMemo(() => buildYearMonths(year, days), [year, days])
  const selectedDay = selected ? days.find((day) => day.date === selected) : null

  function go(delta: number) {
    if (view === 'year') setYear((value) => value + delta)
    else {
      const next = shiftMonth(year, month, delta)
      setYear(next.year)
      setMonth(next.month)
    }
  }

  return (
    <div className="px-4 pt-2 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#8e9890] uppercase">P&L Calendar</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{view === 'year' ? year : monthKey(year, month)}</p>
          {asOfMs != null ? <p className="mt-1 text-[11px] text-[#6f7872]">prices as of {formatViennaClock(asOfMs)}</p> : null}
        </div>
        <div className="flex rounded-full bg-white/6 p-0.5 text-xs font-semibold">
          {(['month', 'year'] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={view === item}
              onClick={() => setView(item)}
              className={`rounded-full px-2.5 py-1 capitalize ${view === item ? 'bg-[#3dff7a] text-[#04140a]' : 'text-[#9aa59b]'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button type="button" aria-label={view === 'year' ? 'Previous year' : 'Previous month'} onClick={() => go(-1)} className="rounded-full p-1.5 text-[#c5cdc6] hover:bg-white/6">
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold tabular-nums text-[#f3f6f3]">{view === 'year' ? year : monthKey(year, month)}</p>
        <button type="button" aria-label={view === 'year' ? 'Next year' : 'Next month'} onClick={() => go(1)} className="rounded-full p-1.5 text-[#c5cdc6] hover:bg-white/6">
          <ChevronRight size={18} />
        </button>
      </div>

      {view === 'month' ? (
        <>
          <Summary summary={summary} />
          <MonthGrid grid={grid} selected={selected} onSelect={setSelected} />
          {selected ? <DayTrades day={selectedDay ?? null} date={selected} /> : null}
        </>
      ) : (
        <>
          <Summary summary={summarizeDays(days.filter((day) => day.date.startsWith(String(year))))} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {yearMonths.map((cell) => {
              const tone = toneOf(cell.summary.netSol)
              const has = cell.summary.tradeDays > 0
              return (
                <button
                  key={cell.month}
                  type="button"
                  onClick={() => {
                    setMonth(cell.month)
                    setView('month')
                  }}
                  className={`rounded-2xl px-2.5 py-3 text-left ring-1 ${has ? tone.ring : 'bg-[#141716] ring-white/6'}`}
                >
                  <p className="text-xs font-semibold text-[#c5cdc6]">{cell.label}</p>
                  <p className={`mt-1 text-sm font-semibold tabular-nums ${has ? tone.text : 'text-[#6f7872]'}`}>
                    {has ? formatSignedSol(cell.summary.netSol) : '—'}
                  </p>
                  {has ? <p className={`text-[10px] tabular-nums ${tone.text}`}>{formatPct(cell.summary.netPct)}</p> : null}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function Summary({ summary }: { summary: { netSol: number | null; netPct: number | null; winDays: number; lossDays: number; tradeDays: number } }) {
  const tone = toneOf(summary.netSol)
  return (
    <div className="mt-3 rounded-2xl bg-[#141716] px-3 py-2.5 ring-1 ring-white/6">
      <p className={`text-lg font-semibold tabular-nums ${tone.text}`}>
        {summary.netSol == null ? '—' : `${formatSignedSol(summary.netSol)} SOL`}
        {summary.netPct != null ? <span className="ml-2 text-sm font-medium">{formatPct(summary.netPct)}</span> : null}
      </p>
      <p className="mt-0.5 text-[11px] text-[#8e9890]">
        <span className="text-[#3dff7a]">{summary.winDays} win {summary.winDays === 1 ? 'day' : 'days'}</span>
        <span className="text-[#6f7872]"> · </span>
        <span className="text-[#ff5c6a]">{summary.lossDays} loss {summary.lossDays === 1 ? 'day' : 'days'}</span>
        {summary.tradeDays === 0 ? <span> · no closes this period</span> : null}
      </p>
    </div>
  )
}

function MonthGrid({
  grid,
  selected,
  onSelect,
}: {
  grid: ReturnType<typeof buildMonthGrid>
  selected: string | null
  onSelect: (date: string) => void
}) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className="mt-3">
      <div className="grid grid-cols-7 gap-1">
        {labels.map((label) => (
          <p key={label} className="pb-1 text-center text-[10px] font-semibold tracking-wide text-[#8e9890] uppercase">
            {label}
          </p>
        ))}
        {grid.map((cell) => {
          const has = cell.pnl != null
          const tone = toneOf(cell.pnl?.netSol ?? null)
          const selectedDay = selected === cell.date
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelect(cell.date)}
              className={`min-h-[72px] rounded-xl px-1 py-1.5 text-left transition-colors ${
                has ? tone.fill : 'bg-[#141716]/80'
              } ${cell.inMonth ? '' : 'opacity-40'} ${
                cell.isToday ? 'ring-2 ring-[#3dff7a]' : selectedDay ? 'ring-1 ring-white/40' : 'ring-1 ring-white/6'
              }`}
            >
              <p className={`text-[10px] font-semibold ${cell.isToday ? 'text-[#3dff7a]' : 'text-[#c5cdc6]'}`}>
                {cell.isToday ? 'Today' : cell.day}
              </p>
              {has ? (
                <p className={`mt-1 text-[11px] font-semibold tabular-nums leading-tight ${tone.text}`}>
                  {formatSignedSol(cell.pnl && compactSol(cell.pnl.netSol))}
                </p>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DayTrades({ day, date }: { day: DailyPnlDay | null; date: string }) {
  const label = formatDayLabel(date)
  if (!day || day.items.length === 0) {
    return <p className="mt-4 text-center text-sm text-[#8e9890]">No closed trades on {label}</p>
  }
  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-[#141716] ring-1 ring-white/6">
      <p className="border-b border-white/6 px-3 py-2 text-[11px] font-semibold tracking-wide text-[#8e9890] uppercase">
        {label} · {day.trades} {day.trades === 1 ? 'close' : 'closes'}
      </p>
      <ul>
        {day.items.map((trade, index) => (
          <TradeRow key={`${trade.token}-${trade.exitLabel ?? index}-${trade.kind}`} trade={trade} />
        ))}
      </ul>
    </div>
  )
}

function TradeRow({ trade }: { trade: DailyPnlTrade }) {
  const value = trade.netSol ?? trade.netPct
  const tone = value == null ? 'text-[#f3f6f3]' : value < 0 ? 'text-[#ff5c6a]' : 'text-[#3dff7a]'
  const when = shortVienna(trade.exitLabel) ?? trade.exitLabel ?? '—'
  return (
    <li className="flex items-start justify-between gap-3 border-t border-white/5 px-3 py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{trade.token}</p>
        <p className="mt-0.5 text-[11px] text-[#8e9890]">
          {when}
          <span className="text-[#6f7872]"> · </span>
          <span>{trade.exitCode}</span>
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

function toneOf(value: number | null): { text: string; fill: string; ring: string } {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return { text: 'text-[#f3f6f3]', fill: 'bg-[#141716]', ring: 'bg-[#141716] ring-white/6' }
  }
  if (value > 0) return { text: 'text-[#3dff7a]', fill: 'bg-[#3dff7a]/18', ring: 'bg-[#3dff7a]/15 ring-[#3dff7a]/30' }
  return { text: 'text-[#ff5c6a]', fill: 'bg-[#ff5c6a]/20', ring: 'bg-[#ff5c6a]/15 ring-[#ff5c6a]/30' }
}

function compactSol(value: number): number {
  return Math.round(value * 1000) / 1000
}

function formatDayLabel(date: string): string {
  const parts = date.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return date
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12))
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(dt)
}
