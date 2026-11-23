import { describe, expect, it } from 'vitest'
import {
  buildMonthGrid,
  buildYearMonths,
  daysInMonth,
  monthKey,
  shiftMonth,
  summarizeDays,
  viennaDateKey,
} from './calendar.ts'
import type { DailyPnlDay } from './normalize.ts'
import { normalizeSnapshot } from './normalize.ts'

const sample: DailyPnlDay[] = [
  { date: '2026-11-22', netSol: -0.144, netPct: -1.44, trades: 1, wins: 0, losses: 1, items: [] },
  { date: '2026-11-23', netSol: -0.2496, netPct: -2.496, trades: 7, wins: 2, losses: 5, items: [] },
]

describe('calendar grid', () => {
  it('builds a Monday-start November 2026 grid that includes Sunday the 1st and today', () => {
    const grid = buildMonthGrid(2026, 11, sample, '2026-11-23')
    expect(grid[0]?.date).toBe('2026-10-26')
    expect(grid[0]?.inMonth).toBe(false)
    expect(grid[6]?.date).toBe('2026-11-01')
    expect(grid[6]?.inMonth).toBe(true)
    const today = grid.find((cell) => cell.date === '2026-11-23')
    expect(today?.isToday).toBe(true)
    expect(today?.pnl?.netSol).toBeCloseTo(-0.2496, 4)
    expect(grid.filter((cell) => cell.inMonth).at(-1)?.date).toBe('2026-11-30')
  })

  it('summarizes win and loss days and can shift months', () => {
    const summary = summarizeDays(daysInMonth(sample, 2026, 11))
    expect(summary.tradeDays).toBe(2)
    expect(summary.winDays).toBe(0)
    expect(summary.lossDays).toBe(2)
    expect(summary.netSol).toBeCloseTo(-0.3936, 4)
    expect(summary.netPct).toBeCloseTo(-3.936, 4)
    expect(monthKey(2026, 11)).toBe('2026-11')
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2026, month: 12 })
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })

  it('rolls year cells from the same daily series', () => {
    const year = buildYearMonths(2026, sample)
    expect(year).toHaveLength(12)
    expect(year[10]?.label).toBe('Nov')
    expect(year[10]?.summary.netSol).toBeCloseTo(-0.3936, 4)
    expect(year[0]?.summary.tradeDays).toBe(0)
  })

  it('formats Vienna dates without shifting the calendar day', () => {
    // 22 Nov 2026, 21:09 Vienna is 20:09Z
    expect(viennaDateKey(Date.parse('2026-11-22T20:09:15+00:00'))).toBe('2026-11-22')
    expect(viennaDateKey(Date.parse('2026-11-22T23:30:00+00:00'))).toBe('2026-11-23')
  })
})

describe('daily pnl snapshot', () => {
  it('reads daily_pnl including a partial close', () => {
    const view = normalizeSnapshot({
      paper: {
        start_bankroll_sol: 10,
        bankroll_sol: 9.6,
        daily_pnl: [
          {
            date: '2026-11-22',
            net_sol: -0.144,
            net_pct: -1.44,
            trades: 1,
            wins: 0,
            losses: 1,
            items: [{ token: 'FIONA', net_sol: -0.144, net_pct: -28.8, exit_code: 'SL', kind: 'full', exit_vienna: '22 Nov 2026, 21:09', rules_version: 'v3' }],
          },
          {
            date: '2026-11-23',
            net_sol: -0.2496,
            net_pct: -2.496,
            trades: 2,
            wins: 1,
            losses: 1,
            items: [
              { token: 'HOGE', net_sol: -0.0869, net_pct: -29.38, exit_code: 'SL', kind: 'full', exit_vienna: '23 Nov 2026, 18:26', rules_version: 'v4' },
              { token: 'FIONA', net_sol: 0.0575, net_pct: 38.9, exit_code: 'TP1', kind: 'partial', exit_vienna: '23 Nov 2026, 19:39', rules_version: 'v4' },
            ],
          },
          { date: 'nope', net_sol: 1 },
        ],
      },
    })
    expect(view.paper.dailyPnl).toHaveLength(2)
    expect(view.paper.dailyPnl[0]?.date).toBe('2026-11-22')
    expect(view.paper.dailyPnl[1]?.items[1]?.kind).toBe('partial')
    expect(view.paper.dailyPnl[1]?.items[1]?.exitCode).toBe('TP1')
    expect(view.paper.dailyPnl[1]?.netSol).toBeCloseTo(-0.2496, 4)
  })

  it('is empty when the snapshot has no daily_pnl', () => {
    const view = normalizeSnapshot({ paper: { bankroll_sol: 10 } })
    expect(view.paper.dailyPnl).toEqual([])
  })
})
