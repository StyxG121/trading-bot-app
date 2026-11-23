// Trading Bot — Scriptable home screen widget
// Large (or medium) widget: 24h trades + open positions, dark, green/red P/L.
// Readable in iOS 18+ Tinted mode: trade rows use a thin border, not a filled
// background (fills become solid tint bars and hide the text). Re-copy this
// script into Scriptable after an update; the widget does not auto-refresh it.
//
// Install (iPhone):
// 1. Install the free “Scriptable” app from the App Store.
// 2. Open https://styxg121.github.io/trading-bot-app/widget/TradingBotWidget.js
//    in Safari, copy the whole script, then in Scriptable tap + and paste.
//    Name the script “Trading Bot”.
// 3. Long-press the Home Screen → + → search “Scriptable” → add a Large widget.
// 4. Long-press the widget → Edit Widget → Script: “Trading Bot”.
//    Tapping the widget opens the phone app.
//
// iOS widgets cannot scroll. Extra trades show as “+N more”.

const APP_URL = "https://styxg121.github.io/trading-bot-app/"
const SNAPSHOT_URL = APP_URL + "data/snapshot.json"
const CACHE_NAME = "trading-bot-snapshot.json"
const REFRESH_MINUTES = 15
const TZ = "Europe/Vienna"

const BG = "#050605"
const TEXT = "#f3f6f3"
const MUTED = "#8e9890"
const DIM = "#6f7872"
const GREEN = "#3dff7a"
const RED = "#ff5c6a"
const BORDER = "#8e9890"
const BORDER_ALPHA = 0.4

const MAX_ROWS = { small: 0, medium: 3, large: 7, extraLarge: 10 }

// --- pure helpers (also used by the node test) ---

function pad(value) {
  return String(value).padStart(2, "0")
}

function lastSunday(year, monthIndex) {
  const date = new Date(Date.UTC(year, monthIndex + 1, 0))
  date.setUTCDate(date.getUTCDate() - date.getUTCDay())
  return date.getUTCDate()
}

function viennaOffset(year, month, day, hour) {
  // EU DST: last Sunday of March 01:00 UTC to last Sunday of October 01:00 UTC.
  const start = Date.UTC(year, 2, lastSunday(year, 2), 1, 0, 0)
  const end = Date.UTC(year, 9, lastSunday(year, 9), 1, 0, 0)
  const utcGuess = Date.UTC(year, month, day, hour - 1, 0, 0)
  const inDst = utcGuess >= start && utcGuess < end
  return inDst ? "+02:00" : "+01:00"
}

function parseViennaLabel(label) {
  if (!label || typeof label !== "string") return null
  const match = label.trim().match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4}),\s+(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
  const month = months[match[2].slice(0, 3).toLowerCase()]
  if (month == null) return null
  const year = Number(match[3])
  const day = Number(match[1])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const iso = year + "-" + pad(month + 1) + "-" + pad(day) + "T" + pad(hour) + ":" + pad(minute) + ":00" + viennaOffset(year, month, day, hour)
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

function parseTime(value) {
  if (value == null) return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    // Vienna labels first: Date.parse treats "22 Nov 2026, 21:09" as UTC in some engines.
    const vienna = parseViennaLabel(value)
    if (vienna != null) return vienna
    const fromIso = Date.parse(value)
    if (Number.isFinite(fromIso)) return fromIso
  }
  return null
}

function formatViennaClock(ms) {
  const date = new Date(ms)
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date)
  } catch (err) {
    const shifted = new Date(ms + 60 * 60 * 1000)
    return pad(shifted.getUTCHours()) + ":" + pad(shifted.getUTCMinutes())
  }
}

function formatSol(value, digits) {
  if (value == null || !Number.isFinite(value)) return "—"
  const places = digits == null ? 3 : digits
  const body = Math.abs(value).toFixed(places)
  return (value < 0 ? "−" : "") + body
}

function formatSignedSol(value, digits) {
  if (value == null || !Number.isFinite(value)) return "—"
  const body = formatSol(value, digits)
  if (value > 0) return "+" + body
  return body
}

function formatPct(value) {
  if (value == null || !Number.isFinite(value)) return "—"
  const body = Math.abs(value).toFixed(1)
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return sign + body + "%"
}

function directionMark(value) {
  // Tinted mode drops text color, so ▲/▼ plus +/− keep direction readable.
  if (value == null || !Number.isFinite(value) || value === 0) return ""
  return value > 0 ? "▲ " : "▼ "
}

function formatPnl(sol, pct) {
  const value = sol != null && Number.isFinite(sol) ? sol : pct
  const mark = directionMark(value)
  if (sol != null && Number.isFinite(sol)) return mark + formatSignedSol(sol) + "  " + formatPct(pct)
  return mark + formatPct(pct)
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

function num(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" && value.trim() !== "" && value !== "—") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function paperOf(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return {}
  return snapshot.paper && typeof snapshot.paper === "object" ? snapshot.paper : {}
}

function openPnl(position) {
  const size = num(position.size_sol_remaining) ?? num(position.size_sol_original) ?? num(position.size_sol)
  let pct = num(position.last_gross_pct)
  if (pct == null) {
    const last = num(position.last_price_usd) ?? num(position.last_price)
    const entry = num(position.entry_price_usd) ?? num(position.entry_price)
    if (last != null && entry != null && entry !== 0) pct = ((last - entry) / entry) * 100
  }
  const sol = size != null && pct != null ? (size * pct) / 100 : null
  return { pct: pct, sol: sol, size: size }
}

function closedRows(paper) {
  const list = Array.isArray(paper.closed_trades) ? paper.closed_trades : []
  return list.map(function (row, index) {
    const token = row && row.token != null ? String(row.token) : ""
    const exitAt = parseTime(row && (row.exit_iso || row.exit_vienna || row.exit_at))
    return {
      id: "c-" + token + "-" + (exitAt || index),
      token: token || "—",
      status: "closed",
      at: exitAt,
      timeLabel: row && row.exit_vienna ? String(row.exit_vienna) : null,
      exitCode: row && row.exit_code ? String(row.exit_code) : "exit",
      rulesVersion: row && row.rules_version ? String(row.rules_version) : null,
      kind: row && row.kind === "partial" ? "partial" : "full",
      pct: num(row && row.net_pct),
      sol: num(row && row.net_sol),
    }
  }).filter(function (row) { return row.token && row.token !== "—" })
}

function openRows(paper) {
  const list = Array.isArray(paper.open) ? paper.open : []
  return list.map(function (row, index) {
    const token = row && row.token != null ? String(row.token) : ""
    const pnl = openPnl(row || {})
    const at = parseTime(row && (row.entry_ts || row.entry_vienna || row.entry_at))
    return {
      id: "o-" + token + "-" + (at || index),
      token: token || "—",
      status: "open",
      at: at,
      timeLabel: null,
      exitCode: "open",
      rulesVersion: row && row.rules_version ? String(row.rules_version) : null,
      kind: "open",
      pct: pnl.pct,
      sol: pnl.sol,
    }
  }).filter(function (row) { return row.token && row.token !== "—" })
}

function inLast24h(at, nowMs) {
  if (at == null) return false
  return at <= nowMs && at >= nowMs - 24 * 60 * 60 * 1000
}

function sortNewest(a, b) {
  return (b.at || 0) - (a.at || 0)
}

function packVisible(trades, limit) {
  const sorted = trades.slice().sort(sortNewest)
  if (sorted.length <= limit) return { visible: sorted, hidden: 0 }
  const visible = sorted.slice(0, limit)
  const overflow = sorted.slice(limit)
  // Don't drop a 24h close behind a long open list: swap it in for the oldest visible open.
  for (let i = 0; i < overflow.length; i++) {
    const row = overflow[i]
    if (row.status !== "closed") continue
    let replace = -1
    for (let j = visible.length - 1; j >= 0; j--) {
      if (visible[j].status === "open") { replace = j; break }
    }
    if (replace < 0) break
    overflow[i] = visible[replace]
    visible[replace] = row
  }
  visible.sort(sortNewest)
  return { visible: visible, hidden: overflow.length }
}

function maxRowsFor(family) {
  if (family && Object.prototype.hasOwnProperty.call(MAX_ROWS, family)) return MAX_ROWS[family]
  return MAX_ROWS.large
}

function snapshotUpdatedMs(snapshot) {
  return parseTime(snapshot && (snapshot.as_of_iso || snapshot.as_of_vienna))
}

function buildModel(snapshot, nowMs, family) {
  const now = isFiniteNumber(nowMs) ? nowMs : Date.now()
  const size = family || "large"
  const paper = paperOf(snapshot)
  const bankroll = num(paper.bankroll_sol)
  const start = num(paper.start_bankroll_sol)
  const allClosed = closedRows(paper)
  const opens = openRows(paper)
  const closed24h = allClosed.filter(function (row) { return inLast24h(row.at, now) })
  // All live positions, plus closes from the last 24 hours, newest first.
  const trades = opens.concat(closed24h).sort(sortNewest)
  const realized = closed24h.reduce(function (sum, row) { return sum + (row.sol || 0) }, 0)
  const unrealized = opens.reduce(function (sum, row) { return sum + (row.sol || 0) }, 0)
  const net24h = (closed24h.length || opens.length) ? realized + unrealized : null
  const closedWins = closed24h.filter(function (row) { return (row.sol == null ? row.pct : row.sol) > 0 }).length
  const closedLosses = closed24h.filter(function (row) { return (row.sol == null ? row.pct : row.sol) < 0 }).length
  const rated = closedWins + closedLosses
  const winRate = rated ? (closedWins / rated) * 100 : null
  const denom = start || bankroll
  const netPct = net24h != null && denom ? (net24h / denom) * 100 : null
  const packed = packVisible(trades, maxRowsFor(size))
  const visible = packed.visible
  const hidden = packed.hidden
  const updatedAt = snapshotUpdatedMs(snapshot) || now
  return {
    ok: !!(snapshot && (paper.bankroll_sol != null || trades.length || paper.closed_trades)),
    family: size,
    bankroll: bankroll,
    net24h: net24h,
    netPct: netPct,
    tradeCount: trades.length,
    closedCount: closed24h.length,
    openCount: opens.length,
    winRate: winRate,
    trades: visible,
    hidden: hidden,
    empty: trades.length === 0,
    updatedAt: updatedAt,
    error: null,
  }
}

function tone(value) {
  if (value == null || !Number.isFinite(value) || value === 0) return TEXT
  return value > 0 ? GREEN : RED
}

function subline(trade) {
  const clock = trade.at != null ? formatViennaClock(trade.at) : null
  if (trade.status === "open") return (clock ? clock + " · " : "") + "open"
  const bits = []
  if (clock) bits.push(clock)
  if (trade.exitCode && trade.exitCode !== "exit") bits.push(trade.exitCode)
  if (trade.kind === "partial") bits.push("half")
  if (trade.rulesVersion) bits.push(trade.rulesVersion)
  return bits.join(" · ") || "closed"
}

// --- Scriptable I/O (mocked in the node test) ---

function cachePath() {
  const fm = FileManager.local()
  return fm.joinPath(fm.documentsDirectory(), CACHE_NAME)
}

function writeCache(snapshot) {
  try {
    FileManager.local().writeString(cachePath(), JSON.stringify(snapshot))
  } catch (err) {}
}

function readCache() {
  try {
    const fm = FileManager.local()
    const path = cachePath()
    if (!fm.fileExists(path)) return null
    return JSON.parse(fm.readString(path))
  } catch (err) {
    return null
  }
}

async function fetchSnapshot() {
  const request = new Request(SNAPSHOT_URL)
  request.timeoutInterval = 6
  const json = await request.loadJSON()
  if (!json || typeof json !== "object") throw new Error("Bad snapshot")
  writeCache(json)
  return json
}

async function loadSnapshot() {
  try {
    return await fetchSnapshot()
  } catch (err) {
    const cached = readCache()
    if (cached) return cached
    throw err
  }
}

function color(hex, alpha) {
  if (alpha == null) return new Color(hex)
  return new Color(hex, alpha)
}

function addLabel(parent, text, size, weight, hex, options) {
  const line = parent.addText(String(text))
  if (weight === "bold") line.font = Font.boldSystemFont(size)
  else if (weight === "semibold") line.font = Font.semiboldSystemFont(size)
  else line.font = Font.systemFont(size)
  line.textColor = color(hex)
  line.lineLimit = 1
  line.minimumScaleFactor = (options && options.minScale) != null ? options.minScale : 0.7
  if (options && options.right) line.rightAlignText()
  if (options && options.center) line.centerAlignText()
  return line
}

// One text node in a fixed-width box so Scriptable cannot draw a wrapped
// overflow copy on top of the scaled line (the iOS 18 overprint bug).
function addFittedText(parent, text, width, height, size, weight, hex, options) {
  const box = parent.addStack()
  box.layoutHorizontally()
  box.size = new Size(width, height)
  if (options && options.right) {
    box.addSpacer()
  }
  const line = addLabel(box, text, size, weight, hex, { minScale: 0.7, right: options && options.right })
  return line
}

function renderWidget(model) {
  const widget = new ListWidget()
  widget.backgroundColor = color(BG)
  widget.url = APP_URL
  widget.setPadding(12, 14, 10, 14)
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000)
  widget.spacing = 6

  if (model.error && !model.ok) {
    addLabel(widget, "Trading Bot", 12, "semibold", TEXT)
    addLabel(widget, String(model.error), 11, "regular", RED)
    addLabel(widget, "updated " + formatViennaClock(Date.now()), 9, "regular", DIM)
    return widget
  }

  const header = widget.addStack()
  header.layoutVertically()
  header.spacing = 2

  const bankrollRow = header.addStack()
  bankrollRow.layoutHorizontally()
  bankrollRow.bottomAlignContent()
  addFittedText(bankrollRow, formatSol(model.bankroll, 3) + " SOL", 200, 24, 20, "bold", TEXT)
  bankrollRow.addSpacer()

  const netValue = model.net24h != null ? model.net24h : model.netPct
  const netColor = tone(netValue)
  const netRow = header.addStack()
  netRow.layoutHorizontally()
  const netText = directionMark(netValue) + formatSignedSol(model.net24h, 3) + " SOL  " + formatPct(model.netPct)
  addFittedText(netRow, netText, 310, 18, 13, "semibold", netColor)

  const meta = []
  meta.push((model.tradeCount || 0) + (model.tradeCount === 1 ? " trade" : " trades") + " 24h")
  if (model.winRate != null) meta.push(formatPct(model.winRate).replace("+", "") + " win")
  meta.push((model.openCount || 0) + " open")
  addLabel(header, meta.join("  ·  "), 10, "regular", MUTED, { minScale: 0.8 })

  if (model.empty) {
    widget.addSpacer(8)
    const empty = widget.addStack()
    empty.layoutVertically()
    empty.cornerRadius = 10
    empty.borderWidth = 1
    empty.borderColor = color(BORDER, BORDER_ALPHA)
    empty.setPadding(12, 12, 12, 12)
    addLabel(empty, "No trades in the last 24h", 12, "regular", MUTED, { center: true })
    widget.addSpacer()
  } else {
    widget.addSpacer(4)
    const list = widget.addStack()
    list.layoutVertically()
    list.spacing = 4

    for (let i = 0; i < model.trades.length; i++) {
      addTradeCard(list, model.trades[i])
    }
    if (model.hidden > 0) {
      addLabel(list, "+" + model.hidden + " more", 10, "semibold", MUTED)
    }
    widget.addSpacer()
  }

  addLabel(widget, "updated " + formatViennaClock(model.updatedAt), 9, "regular", DIM)
  return widget
}

function addTradeCard(parent, trade) {
  // No filled backgroundColor: iOS 18+ Tinted mode turns fills into solid bars.
  const card = parent.addStack()
  card.layoutHorizontally()
  card.centerAlignContent()
  card.cornerRadius = 10
  card.borderWidth = 1
  card.borderColor = color(BORDER, BORDER_ALPHA)
  card.setPadding(5, 8, 5, 8)
  card.spacing = 6

  const value = trade.sol != null ? trade.sol : trade.pct
  // Text glyph, not a filled stack: a fill would become a solid tint bar.
  const bar = card.addText("▎")
  bar.font = Font.boldSystemFont(14)
  bar.textColor = color(tone(value))
  bar.lineLimit = 1

  const body = card.addStack()
  body.layoutVertically()
  body.spacing = 1
  body.size = new Size(292, 34)

  const top = body.addStack()
  top.layoutHorizontally()
  top.centerAlignContent()
  addFittedText(top, trade.token, 130, 16, 11, "semibold", TEXT)
  top.addSpacer()
  addFittedText(top, formatPnl(trade.sol, trade.pct), 150, 16, 11, "bold", tone(value), { right: true })

  addLabel(body, subline(trade), 10, "regular", MUTED, { minScale: 0.7 })
}

async function runScriptable() {
  const family = typeof config !== "undefined" && config.widgetFamily ? config.widgetFamily : "large"
  try {
    let model
    try {
      const snapshot = await loadSnapshot()
      model = buildModel(snapshot, Date.now(), family)
    } catch (err) {
      model = buildModel({}, Date.now(), family)
      model.error = "Could not load snapshot"
      model.ok = false
    }
    const widget = renderWidget(model)
    if (typeof config !== "undefined" && config.runsInWidget) {
      Script.setWidget(widget)
    } else if (family === "medium") {
      await widget.presentMedium()
    } else if (family === "small") {
      await widget.presentSmall()
    } else {
      await widget.presentLarge()
    }
  } finally {
    Script.complete()
  }
}

const TradingBotWidget = {
  APP_URL: APP_URL,
  SNAPSHOT_URL: SNAPSHOT_URL,
  REFRESH_MINUTES: REFRESH_MINUTES,
  MAX_ROWS: MAX_ROWS,
  parseViennaLabel: parseViennaLabel,
  parseTime: parseTime,
  formatViennaClock: formatViennaClock,
  formatSol: formatSol,
  formatSignedSol: formatSignedSol,
  formatPct: formatPct,
  directionMark: directionMark,
  formatPnl: formatPnl,
  openPnl: openPnl,
  buildModel: buildModel,
  subline: subline,
  tone: tone,
  renderWidget: renderWidget,
  loadSnapshot: loadSnapshot,
}

try {
  if (typeof module !== "undefined" && module && module.exports) {
    module.exports = TradingBotWidget
  }
} catch (err) {}

if (typeof Script !== "undefined") {
  runScriptable()
}
