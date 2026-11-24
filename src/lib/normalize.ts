export type RangeKey = 'live' | '1h' | '4h' | '1d' | '1w'

export type EquityPoint = {
  t: number | null
  label: string
  value: number
}

export type FeedKind = 'bought' | 'sold' | 'scan' | 'monitor'

export type FeedItem = {
  id: string
  kind: FeedKind
  title: string
  timeLabel: string | null
  at: number | null
  sizeSol: number | null
  pnlSol: number | null
  pnlPct: number | null
  stackPct: number | null
  detail: string | null
  miss: string | null
  verdicts: string | null
  entryPrice: number | null
  exitPrice: number | null
}

export type Miss = {
  token: string
  score: string | null
  reason: string | null
}

export type AgentId = 'scanner' | 'analyst' | 'risk' | 'news' | 'scout' | 'pattern'

export type LogLine = {
  time: string | null
  text: string
}

export type AgentView = {
  id: AgentId
  name: string
  pools: string | null
  verdictLabel: string | null
  misses: Miss[]
  score: number | null
  scoreLabel: string | null
  scoreToken: string | null
  scoreDetail: string | null
  line: string | null
  log: LogLine[]
}

export type BudgetRow = {
  bankrollSol: number | null
  sizeSol: number | null
  grossPct: number | null
  netPct: number | null
  netSol: number | null
  current: boolean
}

export type BookView = {
  live: boolean
  balanceSol: number | null
  startSol: number | null
  grossSol: number | null
  netSol: number | null
  netPct: number | null
  multiple: number | null
  wins: number | null
  losses: number | null
  winRatePct: number | null
  openCount: number | null
  daysLeft: number | null
  weekEnd: string | null
  equity: EquityPoint[]
  feed: FeedItem[]
  budget: BudgetRow[]
  agents: AgentView[]
  lastScanLabel: string | null
  wallet: string | null
  status: string | null
  chain: string | null
  plannedBudget: string | null
  leverageRules: string[]
  closedTrades: ClosedTradeView[]
  closedStats: ClosedStatsView
  openPositions: OpenPositionView[]
  openStats: OpenStatsView
  dailyPnl: DailyPnlDay[]
}

export type ExitCode = 'TP1' | 'TP2' | 'SL' | 'time' | 'exit'

export type ClosedTradeView = {
  id: string
  token: string
  netPct: number | null
  netSol: number | null
  exitLabel: string | null
  exitAt: number | null
  exitCode: ExitCode
  rulesVersion: string | null
  kind: 'full' | 'partial'
  sizeSol: number | null
}

export type ClosedStatsView = {
  count: number
  winRatePct: number | null
  netSol: number | null
  bestNetSol: number | null
  worstNetSol: number | null
  avgNetSol: number | null
}

export type OpenPositionView = {
  id: string
  token: string
  sizeSol: number | null
  pnlPct: number | null
  pnlSol: number | null
  entryLabel: string | null
  entryAt: number | null
  tp1Done: boolean
  rulesVersion: string | null
}

export type OpenStatsView = {
  count: number
  inPlaySol: number | null
  unrealizedSol: number | null
  unrealizedPct: number | null
  bestSol: number | null
  worstSol: number | null
}

export type DailyPnlTrade = {
  token: string
  netSol: number | null
  netPct: number | null
  exitLabel: string | null
  exitCode: ExitCode
  kind: 'full' | 'partial'
  rulesVersion: string | null
  sizeSol: number | null
}

export type DailyPnlDay = {
  date: string
  netSol: number
  netPct: number | null
  trades: number
  wins: number
  losses: number
  items: DailyPnlTrade[]
}

export type LearningView = {
  rulesVersion: string | null
  rulesDate: string | null
  rules: string[]
  lessons: string[]
  topTraders: string[]
  patternStatus: string | null
  patternModel: string[]
}

export type SnapshotView = {
  asOfLabel: string | null
  asOfMs: number | null
  zone: string | null
  modeNote: string | null
  paper: BookView
  real: BookView
  learning: LearningView
}

export const RANGE_MS: Record<RangeKey, number> = {
  live: 20 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

const AGENT_ORDER: { id: AgentId; name: string }[] = [
  { id: 'scanner', name: 'Scanner' },
  { id: 'analyst', name: 'Analyst' },
  { id: 'risk', name: 'Risk Manager' },
  { id: 'news', name: 'News' },
  { id: 'scout', name: 'Scout' },
  { id: 'pattern', name: 'Pattern Checker' },
]

type Clock = { year: number | null; offset: string }

type Trade = {
  token: string
  entryPrice: number | null
  exitPrice: number | null
  entryLabel: string | null
  exitLabel: string | null
  entryAt: number | null
  exitAt: number | null
  size: number | null
  score: string | null
  grossPct: number | null
  netPct: number | null
  netSol: number | null
  reason: string | null
  entryReason: string | null
  rulesVersion: string | null
  kind: 'full' | 'partial'
  exitCode: ExitCode
}

type Activity = {
  time: string | null
  at: number | null
  raw: string | null
  scanned: string | null
  verdicts: string | null
  entries: string | null
  miss: string | null
  kind: string | null
}

function obj(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '' && value.trim() !== '—') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function str(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const text = str(item)
    return text ? [text] : []
  })
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function parseClock(iso: string | null): { ms: number | null; clock: Clock } {
  if (!iso) return { ms: null, clock: { year: null, offset: '+01:00' } }
  const ms = Date.parse(iso)
  const year = iso.match(/^(\d{4})/)
  const offset = iso.match(/([+-]\d{2}:\d{2})$/)
  return {
    ms: Number.isFinite(ms) ? ms : null,
    clock: {
      year: year ? Number(year[1]) : null,
      offset: offset ? offset[1] : '+01:00',
    },
  }
}

export function parseViennaLabel(label: string | null, clock: Clock): number | null {
  if (!label) return null
  const match = label
    .trim()
    .match(/(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?(?:,)?(?:\s+(?:(start)|(\d{1,2}):(\d{2})))?/i)
  if (!match) return null
  const month = MONTHS[match[2].slice(0, 3).toLowerCase()]
  if (month == null) return null
  const year = match[3] ? Number(match[3]) : clock.year
  if (year == null) return null
  const hasClock = match[5] != null && match[6] != null
  const isStart = /start/i.test(label)
  if (!hasClock && !isStart) return null
  const hour = hasClock ? Number(match[5]) : 0
  const minute = hasClock ? Number(match[6]) : 0
  const iso = `${year}-${pad(month + 1)}-${pad(Number(match[1]))}T${pad(hour)}:${pad(minute)}:00${clock.offset}`
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

function shortLabel(label: string | null): string | null {
  if (!label) return null
  return label.replace(/(\d{1,2}\s+[A-Za-z]{3,9})\s+\d{4},/, '$1,')
}

function stackPct(size: number | null, start: number | null): number | null {
  if (size == null || start == null || start === 0) return null
  return (size / start) * 100
}

function sameMinute(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return false
  return Math.abs(a - b) < 60_000
}

function parseMisses(miss: string | null): Miss[] {
  if (!miss || miss === '—' || miss === '-') return []
  return miss
    .split(/,\s+(?=[A-Za-z0-9])/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+\((.+)\)\s*$/)
      if (!match) return { token: part, score: null, reason: null }
      return { token: match[1], score: match[2], reason: match[3] }
    })
}

function verdictLabel(verdicts: string | null, raw: string | null): string | null {
  if (!verdicts || verdicts === '—') return null
  const parts = verdicts.split('/').map((part) => part.trim())
  if (
    parts.length === 3 &&
    raw &&
    /PASS/i.test(raw) &&
    /WARN/i.test(raw) &&
    /FAIL/i.test(raw)
  ) {
    return `${parts[0]} pass · ${parts[1]} warn · ${parts[2]} fail`
  }
  return verdicts
}

function parseEntry(entries: string | null): { token: string; score: string } | null {
  if (!entries || entries === '0' || entries === '—') return null
  if (/^out\b/i.test(entries)) return null
  const match = entries.match(/^([A-Za-z][A-Za-z0-9]*)\s+(\d+(?:\.\d+)?)/)
  if (!match) return null
  return { token: match[1], score: match[2] }
}

function readTrade(value: unknown, clock: Clock): Trade | null {
  const row = obj(value)
  if (!row) return null
  const token = str(row.token) ?? str(row.symbol)
  if (!token) return null
  const entryLabel = str(row.entry_vienna) ?? str(row.entry_at)
  const exitLabel = str(row.exit_vienna) ?? str(row.exit_at)
  return {
    token,
    entryPrice: num(row.entry_price),
    exitPrice: num(row.exit_price),
    entryLabel,
    exitLabel,
    entryAt: parseViennaLabel(entryLabel, clock),
    exitAt: parseViennaLabel(exitLabel, clock),
    size: num(row.size_sol),
    score: str(row.score),
    grossPct: num(row.gross_pct),
    netPct: num(row.net_pct),
    netSol: num(row.net_sol),
    reason: str(row.reason),
    entryReason: str(row.entry_reason),
    rulesVersion: str(row.rules_version),
    kind: str(row.kind) === 'partial' ? 'partial' : 'full',
    exitCode: exitCodeFromReason(str(row.reason), str(row.kind), str(row.exit_code)),
  }
}

const EXIT_CODES: ExitCode[] = ['TP1', 'TP2', 'SL', 'time', 'exit']

export function exitCodeFromReason(reason: string | null, kind?: string | null, explicit?: string | null): ExitCode {
  if (explicit && EXIT_CODES.includes(explicit as ExitCode)) return explicit as ExitCode
  const textValue = (reason ?? '').toLowerCase()
  if (/\btp1\b/.test(textValue) || kind === 'partial') {
    if (/\btp2\b/.test(textValue) && !/\btp1\b/.test(textValue)) return 'TP2'
    return 'TP1'
  }
  if (/\btp2\b/.test(textValue)) return 'TP2'
  if (/\bsl\b/.test(textValue) || textValue.includes('stop-loss') || textValue.includes('stop loss')) return 'SL'
  if (/\b(48h|time[- ]stop)\b/.test(textValue)) return 'time'
  return 'exit'
}

export function emptyClosedStats(): ClosedStatsView {
  return { count: 0, winRatePct: null, netSol: null, bestNetSol: null, worstNetSol: null, avgNetSol: null }
}

export function statsFromClosedTrades(trades: ClosedTradeView[]): ClosedStatsView {
  const nets = trades.map((trade) => trade.netSol).filter((value): value is number => value != null && Number.isFinite(value))
  const wins = nets.filter((value) => value > 0).length
  const losses = nets.filter((value) => value < 0).length
  const rated = wins + losses
  return {
    count: trades.length,
    winRatePct: rated ? (wins / rated) * 100 : null,
    netSol: nets.length ? nets.reduce((sum, value) => sum + value, 0) : null,
    bestNetSol: nets.length ? Math.max(...nets) : null,
    worstNetSol: nets.length ? Math.min(...nets) : null,
    avgNetSol: nets.length ? nets.reduce((sum, value) => sum + value, 0) / nets.length : null,
  }
}

function readClosedStats(value: unknown, fallback: ClosedTradeView[]): ClosedStatsView {
  const row = obj(value)
  if (!row) return statsFromClosedTrades(fallback)
  return {
    count: num(row.count) ?? fallback.length,
    winRatePct: num(row.win_rate_pct),
    netSol: num(row.net_sol),
    bestNetSol: num(row.best_net_sol),
    worstNetSol: num(row.worst_net_sol),
    avgNetSol: num(row.avg_net_sol),
  }
}

function toClosedTrades(trades: Trade[]): ClosedTradeView[] {
  const items = trades.map((trade, index) => ({
    id: `${trade.token}-${trade.exitAt ?? trade.exitLabel ?? index}-${trade.kind}`,
    token: trade.token,
    netPct: trade.netPct,
    netSol: trade.netSol,
    exitLabel: trade.exitLabel,
    exitAt: trade.exitAt,
    exitCode: trade.exitCode,
    rulesVersion: trade.rulesVersion,
    kind: trade.kind,
    sizeSol: trade.size,
  }))
  items.sort((a, b) => (b.exitAt ?? 0) - (a.exitAt ?? 0))
  return items
}


export function emptyOpenStats(): OpenStatsView {
  return { count: 0, inPlaySol: null, unrealizedSol: null, unrealizedPct: null, bestSol: null, worstSol: null }
}

function flag(value: unknown): boolean {
  return value === true || value === 1 || value === 'true' || value === '1' || value === 'yes'
}

function parseAnyTime(value: string | null, clock: Clock): number | null {
  if (!value) return null
  if (/T|\d{4}-\d{2}-\d{2}/.test(value)) {
    const ms = Date.parse(value)
    if (Number.isFinite(ms)) return ms
  }
  return parseViennaLabel(value, clock)
}

export function openPnlFromRow(row: Record<string, unknown>): { size: number | null; pct: number | null; sol: number | null } {
  const size = num(row.size_sol_remaining) ?? num(row.size_sol_original) ?? num(row.size_sol)
  let pct = num(row.last_gross_pct)
  if (pct == null) {
    const last = num(row.last_price_usd) ?? num(row.last_price)
    const entry = num(row.entry_price_usd) ?? num(row.entry_price)
    if (last != null && entry != null && entry !== 0) pct = ((last - entry) / entry) * 100
  }
  const sol = size != null && pct != null ? (size * pct) / 100 : null
  return { size, pct, sol }
}

function readOpenPosition(value: unknown, clock: Clock, index: number): OpenPositionView | null {
  const row = obj(value)
  if (!row) return null
  const token = str(row.token) ?? str(row.symbol)
  if (!token) return null
  const pnl = openPnlFromRow(row)
  const entryLabel = str(row.entry_vienna)
  const entryAt =
    parseAnyTime(str(row.entry_ts) ?? str(row.entry_at) ?? str(row.opened_at), clock) ?? parseViennaLabel(entryLabel, clock)
  return {
    id: `open-${token}-${entryAt ?? index}`,
    token,
    sizeSol: pnl.size,
    pnlPct: pnl.pct,
    pnlSol: pnl.sol,
    entryLabel,
    entryAt,
    tp1Done: flag(row.tp1_done),
    rulesVersion: str(row.rules_version),
  }
}

export function toOpenPositions(rows: unknown[], clock: Clock): OpenPositionView[] {
  const items = rows.flatMap((item, index) => {
    const row = readOpenPosition(item, clock, index)
    return row ? [row] : []
  })
  items.sort((a, b) => (b.entryAt ?? 0) - (a.entryAt ?? 0))
  return items
}

export function statsFromOpenPositions(positions: OpenPositionView[]): OpenStatsView {
  const sizes = positions.map((row) => row.sizeSol).filter((value): value is number => value != null && Number.isFinite(value))
  const pnls = positions.map((row) => row.pnlSol).filter((value): value is number => value != null && Number.isFinite(value))
  const inPlaySol = sizes.length ? sizes.reduce((sum, value) => sum + value, 0) : null
  const unrealizedSol = pnls.length ? pnls.reduce((sum, value) => sum + value, 0) : null
  return {
    count: positions.length,
    inPlaySol,
    unrealizedSol,
    unrealizedPct: inPlaySol != null && inPlaySol !== 0 && unrealizedSol != null ? (unrealizedSol / inPlaySol) * 100 : null,
    bestSol: pnls.length ? Math.max(...pnls) : null,
    worstSol: pnls.length ? Math.min(...pnls) : null,
  }
}

function readActivity(value: unknown, clock: Clock): Activity | null {
  const row = obj(value)
  if (!row) return null
  const time = str(row.time_vienna) ?? str(row.time)
  const raw = str(row.raw)
  const scanned = str(row.scanned)
  const entries = str(row.entries)
  if (!time && !raw && !scanned && !entries) return null
  return {
    time,
    at: parseViennaLabel(time, clock),
    raw,
    scanned,
    verdicts: str(row.verdicts),
    entries,
    miss: str(row.miss),
    kind: str(row.kind),
  }
}

function readBudget(value: unknown, start: number | null): BudgetRow | null {
  const row = obj(value)
  if (!row) return null
  const budget: BudgetRow = {
    bankrollSol: num(row.bankroll_sol),
    sizeSol: num(row.size_sol),
    grossPct: num(row.gross_pct),
    netPct: num(row.net_pct),
    netSol: num(row.net_sol),
    current: false,
  }
  if (
    budget.bankrollSol == null &&
    budget.sizeSol == null &&
    budget.grossPct == null &&
    budget.netPct == null &&
    budget.netSol == null
  ) {
    return null
  }
  budget.current = start != null && budget.bankrollSol === start
  return budget
}

function readEquity(value: unknown, clock: Clock): EquityPoint | null {
  const row = obj(value)
  if (!row) return null
  const valueNum = num(row.value) ?? num(row.equity_sol)
  if (valueNum == null) return null
  const label = str(row.label) ?? str(row.t) ?? ''
  const iso = str(row.t)
  const fromIso = iso && /T|\d{4}-\d{2}/.test(iso) ? Date.parse(iso) : Number.NaN
  return {
    label,
    value: valueNum,
    t: Number.isFinite(fromIso) ? fromIso : parseViennaLabel(label, clock),
  }
}

function emptyBook(): BookView {
  return {
    live: false,
    balanceSol: null,
    startSol: null,
    grossSol: null,
    netSol: null,
    netPct: null,
    multiple: null,
    wins: null,
    losses: null,
    winRatePct: null,
    openCount: null,
    daysLeft: null,
    weekEnd: null,
    equity: [],
    feed: [],
    budget: [],
    agents: AGENT_ORDER.map((agent) => ({
      id: agent.id,
      name: agent.name,
      pools: null,
      verdictLabel: null,
      misses: [],
      score: null,
      scoreLabel: null,
      scoreToken: null,
      scoreDetail: null,
      line: null,
      log: [],
    })),
    lastScanLabel: null,
    wallet: null,
    status: null,
    chain: null,
    plannedBudget: null,
    leverageRules: [],
    closedTrades: [],
    closedStats: emptyClosedStats(),
    openPositions: [],
    openStats: emptyOpenStats(),
    dailyPnl: [],
  }
}

function buildFeed(
  trades: Trade[],
  activity: Activity[],
  opens: unknown[],
  start: number | null,
  clock: Clock,
): FeedItem[] {
  const feed: FeedItem[] = []
  trades.forEach((trade, index) => {
    const share = stackPct(trade.size, start)
    feed.push({
      id: `sold-${index}-${trade.exitLabel ?? ''}`,
      kind: 'sold',
      title: `Sold ${trade.token}`,
      timeLabel: trade.exitLabel,
      at: trade.exitAt,
      sizeSol: trade.size,
      pnlSol: trade.netSol,
      pnlPct: trade.netPct,
      stackPct: share,
      detail: trade.reason,
      miss: null,
      verdicts: null,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
    })
    if (trade.entryLabel || trade.entryPrice != null) {
      feed.push({
        id: `bought-${index}-${trade.entryLabel ?? ''}`,
        kind: 'bought',
        title: `Bought ${trade.token}`,
        timeLabel: trade.entryLabel,
        at: trade.entryAt,
        sizeSol: trade.size,
        pnlSol: null,
        pnlPct: null,
        stackPct: share,
        detail: trade.entryReason,
        miss: null,
        verdicts: null,
        entryPrice: trade.entryPrice,
        exitPrice: null,
      })
    }
  })

  opens.forEach((item, index) => {
    const row = obj(item)
    if (!row) return
    const token = str(row.token) ?? str(row.symbol) ?? str(row.name)
    if (!token) return
    const size = num(row.size_sol)
    const when = str(row.entry_vienna) ?? str(row.opened_at) ?? str(row.time_vienna)
    feed.push({
      id: `open-${index}-${token}`,
      kind: 'bought',
      title: `Bought ${token}`,
      timeLabel: when,
      at: parseViennaLabel(when, clock),
      sizeSol: size,
      pnlSol: num(row.net_sol) ?? num(row.pnl_sol),
      pnlPct: num(row.net_pct) ?? num(row.pnl_pct),
      stackPct: stackPct(size, start),
      detail: 'Open',
      miss: null,
      verdicts: null,
      entryPrice: num(row.entry_price),
      exitPrice: null,
    })
  })

  const soldAt = feed.filter((item) => item.kind === 'sold').map((item) => item.at)
  activity.forEach((row, index) => {
    if (row.kind === 'monitor' && soldAt.some((at) => sameMinute(at, row.at))) return
    const scan = row.kind !== 'monitor'
    const numericScan = row.scanned != null && /^\d/.test(row.scanned)
    feed.push({
      id: `log-${index}-${row.time ?? ''}`,
      kind: scan ? 'scan' : 'monitor',
      title: scan && numericScan ? `Scanned ${row.scanned}` : scan ? 'Scan' : 'Monitor',
      timeLabel: row.time,
      at: row.at,
      sizeSol: null,
      pnlSol: null,
      pnlPct: null,
      stackPct: null,
      detail: row.entries && row.entries !== '0' && row.entries !== '—' ? row.entries : null,
      miss: row.miss && row.miss !== '—' ? row.miss : null,
      verdicts: verdictLabel(row.verdicts, row.raw),
      entryPrice: null,
      exitPrice: null,
    })
  })

  const rank: Record<FeedKind, number> = { sold: 0, bought: 1, monitor: 2, scan: 3 }
  feed.sort((a, b) => {
    const left = a.at ?? Number.NEGATIVE_INFINITY
    const right = b.at ?? Number.NEGATIVE_INFINITY
    if (left !== right) return right - left
    return rank[a.kind] - rank[b.kind]
  })
  return feed
}

function buildAgents(
  activity: Activity[],
  trades: Trade[],
  openCount: number | null,
  patternLine: string | null = null,
): { agents: AgentView[]; lastScanLabel: string | null } {
  const sorted = [...activity].sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
  const latestScan = sorted.find((row) => row.kind === 'scan' || row.kind == null)
  const pools = latestScan?.scanned && /^\d/.test(latestScan.scanned) ? latestScan.scanned : null
  const misses = parseMisses(latestScan?.miss ?? null)

  let scoreToken: string | null = null
  let scoreLabel: string | null = null
  let scoreAt: number | null = null
  for (const row of sorted) {
    const parsed = parseEntry(row.entries)
    if (parsed) {
      scoreToken = parsed.token
      scoreLabel = parsed.score
      scoreAt = row.at
      break
    }
  }
  if (!scoreLabel) {
    const scored = [...trades].sort((a, b) => (b.exitAt ?? b.entryAt ?? 0) - (a.exitAt ?? a.entryAt ?? 0)).find((trade) => trade.score)
    if (scored?.score) {
      scoreToken = scored.token
      scoreLabel = scored.score
      scoreAt = scored.entryAt
    }
  }
  const matched = trades.find((trade) => trade.token.toUpperCase() === scoreToken?.toUpperCase())
  let scoreDetail: string | null = null
  if (matched) {
    const closed = matched.exitAt != null && (scoreAt == null || scoreAt <= matched.exitAt)
    scoreDetail = closed ? matched.reason : matched.entryReason
  }

  const log: LogLine[] = sorted.flatMap((row) => (row.raw ? [{ time: shortLabel(row.time), text: row.raw }] : []))

  const agents: AgentView[] = AGENT_ORDER.map((agent) => {
    const base: AgentView = {
      id: agent.id,
      name: agent.name,
      pools: null,
      verdictLabel: null,
      misses: [],
      score: null,
      scoreLabel: null,
      scoreToken: null,
      scoreDetail: null,
      line: null,
      log: [],
    }
    if (agent.id === 'scanner') {
      return {
        ...base,
        pools,
        verdictLabel: verdictLabel(latestScan?.verdicts ?? null, latestScan?.raw ?? null),
        misses,
        log,
      }
    }
    if (agent.id === 'analyst') {
      return {
        ...base,
        score: num(scoreLabel),
        scoreLabel,
        scoreToken,
        scoreDetail,
      }
    }
    if (agent.id === 'risk') {
      return { ...base, line: openCount != null ? `${openCount} open` : null }
    }
    if (agent.id === 'pattern') {
      return { ...base, line: patternLine }
    }
    return base
  })

  return { agents, lastScanLabel: shortLabel(latestScan?.time ?? null) }
}


function readDailyPnl(value: unknown): DailyPnlDay[] {
  return list(value).flatMap((item) => {
    const row = obj(item)
    if (!row) return []
    const date = str(row.date)
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
    const netSol = num(row.net_sol) ?? 0
    const items = list(row.items).flatMap((entry) => {
      const trade = obj(entry)
      if (!trade) return []
      const token = str(trade.token)
      if (!token) return []
      const code = str(trade.exit_code)
      return [
        {
          token,
          netSol: num(trade.net_sol),
          netPct: num(trade.net_pct),
          exitLabel: str(trade.exit_vienna),
          exitCode: code && ['TP1', 'TP2', 'SL', 'time', 'exit'].includes(code) ? (code as ExitCode) : 'exit',
          kind: (str(trade.kind) === 'partial' ? 'partial' : 'full') as DailyPnlTrade['kind'],
          rulesVersion: str(trade.rules_version),
          sizeSol: num(trade.size_sol),
        },
      ]
    })
    return [
      {
        date,
        netSol,
        netPct: num(row.net_pct),
        trades: num(row.trades) ?? items.length,
        wins: num(row.wins) ?? items.filter((item) => (item.netSol ?? 0) > 0).length,
        losses: num(row.losses) ?? items.filter((item) => (item.netSol ?? 0) < 0).length,
        items,
      },
    ]
  })
}

function buildBook(raw: Record<string, unknown> | null, clock: Clock): BookView {
  if (!raw) return emptyBook()
  const start = num(raw.start_bankroll_sol)
  const balance = num(raw.bankroll_sol) ?? num(raw.balance_sol)
  const gross = num(raw.gross_pnl_sol)
  const net = num(raw.net_pnl_sol)
  const wins = num(raw.wins)
  const losses = num(raw.losses)
  const trades = list(raw.closed_trades).flatMap((item) => {
    const trade = readTrade(item, clock)
    return trade ? [trade] : []
  })
  const activity = list(raw.activity).flatMap((item) => {
    const row = readActivity(item, clock)
    return row ? [row] : []
  })
  const opens = list(raw.open)
  const equity = list(raw.equity).flatMap((item) => {
    const point = readEquity(item, clock)
    return point ? [point] : []
  })
  equity.sort((a, b) => (a.t ?? 0) - (b.t ?? 0))
  const budget = list(raw.budget_pnl).flatMap((item) => {
    const row = readBudget(item, start)
    return row ? [row] : []
  })
  const openCount = num(raw.open_count)
  const trading = equity.length > 0 || trades.length > 0 || activity.length > 0 || opens.some((item) => obj(item))
  const anyNumber = [balance, start, gross, net, wins, losses, num(raw.days_left)].some((value) => value != null)
  const { agents, lastScanLabel } = buildAgents(activity, trades, openCount, str(raw.pattern_checker_line) ?? str(raw.pattern_model_status))
  const closedTrades = toClosedTrades(trades)
  const closedStats = readClosedStats(raw.closed_stats, closedTrades)
  const openPositions = toOpenPositions(opens, clock)
  const openStats = statsFromOpenPositions(openPositions)
  const dailyPnl = readDailyPnl(raw.daily_pnl)

  return {
    live: trading || anyNumber || budget.length > 0,
    balanceSol: balance,
    startSol: start,
    grossSol: gross,
    netSol: net,
    netPct: net != null && start != null && start !== 0 ? (net / start) * 100 : null,
    multiple: balance != null && start != null && start !== 0 ? balance / start : null,
    wins,
    losses,
    winRatePct: num(raw.win_rate_pct),
    openCount,
    daysLeft: num(raw.days_left),
    weekEnd: str(raw.week_end),
    equity,
    feed: buildFeed(trades, activity, opens, start, clock),
    budget,
    agents,
    lastScanLabel,
    wallet: str(raw.wallet),
    status: str(raw.status),
    chain: str(raw.chain),
    plannedBudget: str(raw.planned_budget_usd) ?? str(raw.planned_budget),
    leverageRules: strings(raw.leverage_rules),
    closedTrades,
    closedStats,
    openPositions,
    openStats,
    dailyPnl,
  }
}

export function pointsInRange(points: EquityPoint[], range: RangeKey, anchor: number | null): EquityPoint[] {
  if (anchor == null) return points
  const windowMs = RANGE_MS[range]
  return points.filter((point) => {
    if (point.t == null) return range === '1w'
    return point.t <= anchor && point.t >= anchor - windowMs
  })
}

export function defaultRange(points: EquityPoint[], anchor: number | null): RangeKey {
  const order: RangeKey[] = ['live', '1h', '4h', '1d', '1w']
  for (const range of order) {
    if (pointsInRange(points, range, anchor).length >= 2) return range
  }
  for (const range of order) {
    if (pointsInRange(points, range, anchor).length >= 1) return range
  }
  return '1w'
}

export function normalizeSnapshot(input: unknown): SnapshotView {
  const root = obj(input) ?? {}
  const asOf = parseClock(str(root.as_of_iso))
  const paperRaw = obj(root.paper)
  const realRaw = obj(root.real)
  const paper = buildBook(paperRaw, asOf.clock)
  const realBook = buildBook(realRaw, asOf.clock)
  const realTrading =
    realBook.equity.length > 0 ||
    realBook.feed.some((item) => item.kind === 'bought' || item.kind === 'sold') ||
    realBook.feed.some((item) => item.kind === 'scan' || item.kind === 'monitor')
  const real = { ...realBook, live: realTrading }

  return {
    asOfLabel: str(root.as_of_vienna),
    asOfMs: asOf.ms,
    zone: str(root.zone),
    modeNote: str(root.mode),
    paper,
    real,
    learning: {
      rulesVersion: str(paperRaw?.rules_version),
      rulesDate: str(paperRaw?.rules_date),
      rules: strings(paperRaw?.key_rules),
      lessons: strings(paperRaw?.lessons),
      topTraders: strings(paperRaw?.toptraders),
      patternStatus: str(paperRaw?.pattern_model_status),
      patternModel: strings(paperRaw?.pattern_model),
    },
  }
}

export function emptyLabelFor(book: BookView, mode: 'paper' | 'real'): string {
  if (mode === 'real') return 'Not live yet'
  return book.live ? '' : 'No paper data yet'
}
