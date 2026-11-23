import { describe, expect, it } from 'vitest'
import snapshot from './fixtures/shipped-snapshot.json'
import { formatSol, formatViennaClock } from './format.ts'
import { defaultRange, exitCodeFromReason, normalizeSnapshot, pointsInRange } from './normalize.ts'

describe('shipped snapshot', () => {
  const view = normalizeSnapshot(snapshot)

  it('keeps the paper book numbers', () => {
    expect(view.asOfLabel).toBe('23 Nov 2026, 01:26')
    expect(view.modeNote).toBe('PAPER ONLY until an explicit go-live')
    expect(view.paper.balanceSol).toBeCloseTo(9.855991, 6)
    expect(view.paper.startSol).toBe(10)
    expect(view.paper.grossSol).toBeCloseTo(-0.133411, 6)
    expect(view.paper.netSol).toBeCloseTo(-0.144009, 6)
    expect(view.paper.netPct).toBeCloseTo(-1.44009, 4)
    expect(view.paper.wins).toBe(0)
    expect(view.paper.losses).toBe(1)
    expect(view.paper.winRatePct).toBe(0)
    expect(view.paper.openCount).toBe(0)
    expect(view.paper.daysLeft).toBeCloseTo(6.8, 1)
    expect(view.paper.weekEnd).toBe('Sun 29 Nov 2026, 20:00')
    expect(view.paper.equity).toHaveLength(2)
    expect(view.paper.equity[0]?.value).toBe(10)
    expect(view.paper.equity[1]?.value).toBeCloseTo(9.855991, 6)
    expect(view.paper.live).toBe(true)
  })

  it('does not invent equity outside the two marks', () => {
    expect(defaultRange(view.paper.equity, view.asOfMs)).toBe('1w')
    expect(pointsInRange(view.paper.equity, 'live', view.asOfMs)).toHaveLength(0)
    expect(pointsInRange(view.paper.equity, '1h', view.asOfMs)).toHaveLength(0)
    expect(pointsInRange(view.paper.equity, '4h', view.asOfMs)).toHaveLength(0)
    expect(pointsInRange(view.paper.equity, '1d', view.asOfMs)).toHaveLength(1)
    expect(pointsInRange(view.paper.equity, '1w', view.asOfMs)).toHaveLength(2)
  })

  it('maps the FIONA close and the scan log', () => {
    const sold = view.paper.feed.find((item) => item.kind === 'sold')
    const bought = view.paper.feed.find((item) => item.kind === 'bought')
    expect(sold?.title).toBe('Sold FIONA')
    expect(sold?.pnlSol).toBeCloseTo(-0.144, 6)
    expect(sold?.pnlPct).toBeCloseTo(-28.8, 2)
    expect(sold?.stackPct).toBeCloseTo(5, 4)
    expect(sold?.entryPrice).toBeCloseTo(0.001724, 6)
    expect(sold?.exitPrice).toBeCloseTo(0.001264, 6)
    expect(bought?.title).toBe('Bought FIONA')
    expect(bought?.sizeSol).toBeCloseTo(0.5, 4)
    expect(view.paper.feed.filter((item) => item.kind === 'monitor')).toHaveLength(0)
    expect(view.paper.feed.some((item) => item.title === 'Scanned 35')).toBe(true)

    const scanner = view.paper.agents.find((agent) => agent.id === 'scanner')
    expect(scanner?.pools).toBe('35')
    expect(scanner?.misses.map((miss) => miss.token)).toEqual(['SIDOOR', 'CLAUDIA', 'Rings'])
    expect(scanner?.misses[0]?.reason).toBe('liq 40.6k<50k')
    expect(scanner?.verdictLabel).toBe('2 pass · 15 warn · 18 fail')
    expect(scanner?.log).toHaveLength(5)

    const analyst = view.paper.agents.find((agent) => agent.id === 'analyst')
    expect(analyst?.scoreToken).toBe('FIONA')
    expect(analyst?.scoreLabel).toBe('77.4')
    expect(analyst?.score).toBeCloseTo(77.4, 2)
    expect(analyst?.scoreDetail).toContain('SL -25%')

    expect(view.paper.agents.find((agent) => agent.id === 'risk')?.line).toBe('0 open')
    expect(view.paper.agents.find((agent) => agent.id === 'news')?.line).toBeNull()
    expect(view.paper.agents.find((agent) => agent.id === 'scout')?.pools).toBeNull()
    expect(view.paper.lastScanLabel).toBe('22 Nov, 23:39')
  })

  it('keeps budget rows and learning text', () => {
    expect(view.paper.budget).toHaveLength(4)
    expect(view.paper.budget[0]?.netSol).toBeCloseTo(-0.0143, 4)
    expect(view.paper.budget[2]?.current).toBe(true)
    expect(view.paper.budget[3]?.netSol).toBeCloseTo(-0.7249, 4)
    expect(view.learning.rulesVersion).toBe('v3')
    expect(view.learning.rules).toHaveLength(5)
    expect(view.learning.lessons).toHaveLength(3)
    expect(view.learning.topTraders[1]).toContain('Mr. Frog')
  })

  it('leaves the real book waiting, with the wallet facts', () => {
    expect(view.real.live).toBe(false)
    expect(view.real.balanceSol).toBe(0)
    expect(view.real.status).toBe('Not live, waiting for go-live')
    expect(view.real.wallet).toBe('2q5aEdRPtgBSE1yjauJfz5KHL7Bea1sT1xGBLd2u4SA3')
    expect(view.real.chain).toBe('Solana (Phantom)')
    expect(view.real.plannedBudget).toBe('$400-500')
    expect(view.real.leverageRules).toHaveLength(6)
    expect(view.real.equity).toHaveLength(0)
    expect(view.real.feed).toHaveLength(0)
    expect(view.real.netSol).toBeNull()
  })
})

describe('missing fields', () => {
  it('does not throw or invent numbers', () => {
    const view = normalizeSnapshot({})
    expect(view.paper.live).toBe(false)
    expect(view.paper.balanceSol).toBeNull()
    expect(view.paper.netSol).toBeNull()
    expect(view.paper.equity).toEqual([])
    expect(view.paper.feed).toEqual([])
    expect(view.paper.wins).toBeNull()
    expect(view.real.balanceSol).toBeNull()
    expect(view.learning.rules).toEqual([])
  })

  it('keeps a real zero', () => {
    const view = normalizeSnapshot({ paper: { wins: 0, losses: 0, open: [], activity: null, equity: [null] } })
    expect(view.paper.wins).toBe(0)
    expect(view.paper.losses).toBe(0)
    expect(view.paper.equity).toEqual([])
    expect(view.paper.live).toBe(true)
  })

  it('survives garbage rows', () => {
    const view = normalizeSnapshot({
      paper: {
        equity: [{ label: 'nope' }, { label: '22 Nov 2026, 21:09', value: 1 }],
        closed_trades: [null, { token: 'X', net_sol: 'not-a-number' }],
        activity: 'nope',
        budget_pnl: [{}, { bankroll_sol: 1, net_sol: -0.01 }],
      },
    })
    expect(view.paper.equity).toHaveLength(1)
    expect(view.paper.feed.some((item) => item.title === 'Sold X')).toBe(true)
    expect(view.paper.feed.find((item) => item.title === 'Sold X')?.pnlSol).toBeNull()
    expect(view.paper.budget).toHaveLength(1)
  })
})

describe('vienna clock', () => {
  it('formats 00:30Z as 01:30 in Vienna', () => {
    expect(formatViennaClock(Date.parse('2026-11-23T00:30:00.000Z'))).toBe('01:30')
  })

  it('prints the bankroll without rounding it away', () => {
    expect(formatSol(9.855991)).toBe('9.855991')
    expect(formatSol(-0.144009)).toBe('−0.144009')
  })
})

describe('trade history', () => {
  it('reads the shipped FIONA close as an SL row', () => {
    const view = normalizeSnapshot(snapshot)
    expect(view.paper.closedTrades).toHaveLength(1)
    const row = view.paper.closedTrades[0]
    expect(row?.token).toBe('FIONA')
    expect(row?.exitCode).toBe('SL')
    expect(row?.netSol).toBeCloseTo(-0.144, 3)
    expect(row?.netPct).toBeCloseTo(-28.8, 2)
    expect(row?.exitLabel).toBe('22 Nov 2026, 21:09')
    expect(view.paper.closedStats.count).toBe(1)
    expect(view.paper.closedStats.winRatePct).toBe(0)
    expect(view.paper.closedStats.netSol).toBeCloseTo(-0.144, 3)
    expect(view.paper.closedStats.bestNetSol).toBeCloseTo(-0.144, 3)
    expect(view.paper.closedStats.worstNetSol).toBeCloseTo(-0.144, 3)
  })

  it('lists newest first and keeps a TP1 partial as its own row', () => {
    const view = normalizeSnapshot({
      as_of_iso: '2026-11-23T13:00:00+01:00',
      paper: {
        start_bankroll_sol: 10,
        bankroll_sol: 10.1,
        closed_trades: [
          {
            token: 'OLD',
            exit_vienna: '22 Nov 2026, 12:00',
            net_pct: 10,
            net_sol: 0.05,
            reason: 'TP2 +100%',
            rules_version: 'v3',
            kind: 'full',
          },
          {
            token: 'NEW',
            exit_vienna: '23 Nov 2026, 10:00',
            net_pct: 40,
            net_sol: 0.06,
            reason: 'TP1 +40% sells 50%',
            rules_version: 'v4',
            exit_code: 'TP1',
            kind: 'partial',
          },
        ],
      },
    })
    expect(view.paper.closedTrades.map((row) => row.token)).toEqual(['NEW', 'OLD'])
    expect(view.paper.closedTrades[0]?.exitCode).toBe('TP1')
    expect(view.paper.closedTrades[0]?.kind).toBe('partial')
    expect(view.paper.closedTrades[1]?.exitCode).toBe('TP2')
    expect(view.paper.closedStats.count).toBe(2)
    expect(view.paper.closedStats.winRatePct).toBe(100)
    expect(view.paper.closedStats.netSol).toBeCloseTo(0.11, 6)
    expect(view.paper.closedStats.bestNetSol).toBeCloseTo(0.06, 6)
    expect(view.paper.closedStats.worstNetSol).toBeCloseTo(0.05, 6)
  })

  it('has an empty history when nothing has closed', () => {
    const view = normalizeSnapshot({ paper: { bankroll_sol: 10, start_bankroll_sol: 10 } })
    expect(view.paper.closedTrades).toEqual([])
    expect(view.paper.closedStats.count).toBe(0)
    expect(view.paper.closedStats.netSol).toBeNull()
  })

  it('parses short exit reasons', () => {
    expect(exitCodeFromReason('SL -25% hit (price -26.68%)')).toBe('SL')
    expect(exitCodeFromReason('TP1 +40% sells 50%')).toBe('TP1')
    expect(exitCodeFromReason('TP2 +100%')).toBe('TP2')
    expect(exitCodeFromReason('48h time stop')).toBe('time')
    expect(exitCodeFromReason('trimmed remainder', 'partial')).toBe('TP1')
  })
})

