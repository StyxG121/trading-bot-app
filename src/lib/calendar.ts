import type { DailyPnlDay } from './normalize.ts'

export type CalendarView = 'month' | 'year'

export type CalendarCell = {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  pnl: DailyPnlDay | null
}

export type MonthSummary = {
  netSol: number | null
  netPct: number | null
  winDays: number
  lossDays: number
  tradeDays: number
}

export type YearMonthCell = {
  month: number
  label: string
  summary: MonthSummary
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function weekdayLabels(): readonly string[] {
  return WEEKDAYS
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseDateKey(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

/** YYYY-MM-DD in Europe/Vienna for a given instant. */
export function viennaDateKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

export function daysByDate(days: DailyPnlDay[]): Map<string, DailyPnlDay> {
  const map = new Map<string, DailyPnlDay>()
  for (const day of days) {
    if (day?.date) map.set(day.date, day)
  }
  return map
}

export function summarizeDays(days: DailyPnlDay[]): MonthSummary {
  if (days.length === 0) return { netSol: null, netPct: null, winDays: 0, lossDays: 0, tradeDays: 0 }
  const netSol = days.reduce((sum, day) => sum + (day.netSol ?? 0), 0)
  const pctParts = days.filter((day) => day.netPct != null)
  const netPct = pctParts.length ? pctParts.reduce((sum, day) => sum + (day.netPct ?? 0), 0) : null
  return {
    netSol,
    netPct,
    winDays: days.filter((day) => (day.netSol ?? 0) > 0).length,
    lossDays: days.filter((day) => (day.netSol ?? 0) < 0).length,
    tradeDays: days.length,
  }
}

export function daysInMonth(days: DailyPnlDay[], year: number, month: number): DailyPnlDay[] {
  const prefix = monthKey(year, month)
  return days.filter((day) => day.date.startsWith(prefix))
}

/** Monday-start month grid, including leading/trailing days from adjacent months. */
export function buildMonthGrid(year: number, month: number, days: DailyPnlDay[], todayKey: string): CalendarCell[] {
  const map = daysByDate(days)
  const first = new Date(Date.UTC(year, month - 1, 1))
  const startOffset = (first.getUTCDay() + 6) % 7 // Monday = 0
  const start = new Date(Date.UTC(year, month - 1, 1 - startOffset))
  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const dt = new Date(start.getTime() + i * 86400000)
    const y = dt.getUTCFullYear()
    const m = dt.getUTCMonth() + 1
    const d = dt.getUTCDate()
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      date,
      day: d,
      inMonth: y === year && m === month,
      isToday: date === todayKey,
      pnl: map.get(date) ?? null,
    })
  }
  // Drop a trailing empty week if the month ended in week 5.
  const lastInMonth = cells.reduce((idx, cell, i) => (cell.inMonth ? i : idx), 0)
  const weeks = Math.ceil((lastInMonth + 1) / 7)
  return cells.slice(0, Math.max(weeks, 5) * 7)
}

export function buildYearMonths(year: number, days: DailyPnlDay[]): YearMonthCell[] {
  return MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    summary: summarizeDays(daysInMonth(days, year, index + 1)),
  }))
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const abs = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(abs / 12)
  const nextMonth = (abs % 12) + 1
  return { year: nextYear, month: nextMonth }
}
