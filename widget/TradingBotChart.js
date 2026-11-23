// Trading Bot — Scriptable 7-day equity chart widget
// Medium (or large) widget: 7-day P/L line like the app’s 1W chart.
// Styled like TradingBotWidget.js. Tinted-mode safe: no filled child stacks
// (fills become solid tint bars). Color is lost in tint, so header P/L uses
// ▲/▼ and +/−. The chart is a DrawContext image with a thick line; iOS may
// tint the image, but the shape stays visible. Re-copy into Scriptable after
// an update; the widget does not auto-refresh the script.
//
// Install (iPhone):
// 1. Install the free “Scriptable” app from the App Store.
// 2. Open https://styxg121.github.io/trading-bot-app/widget/TradingBotChart.js
//    in Safari, copy the whole script, then in Scriptable tap + and paste.
//    Name the script “Trading Bot Chart”.
// 3. Long-press the Home Screen → + → search “Scriptable” → add a Medium
//    widget (Large also works) and place it under the trades widget.
// 4. Long-press the widget → Edit Widget → Script: “Trading Bot Chart”.
//    Tapping the widget opens the phone app.

const APP_URL = "https://styxg121.github.io/trading-bot-app/"
const SNAPSHOT_URL = APP_URL + "data/snapshot.json"
const CACHE_NAME = "trading-bot-snapshot.json"
const REFRESH_MINUTES = 15
const TZ = "Europe/Vienna"
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const BG = "#050605"
const TEXT = "#f3f6f3"
const MUTED = "#8e9890"
const DIM = "#6f7872"
const GREEN = "#3dff7a"
const RED = "#ff5c6a"
const BORDER = "#8e9890"
const BORDER_ALPHA = 0.4

const CHART_SIZE = {
  small: { width: 300, height: 72, lineWidth: 3.5 },
  medium: { width: 320, height: 80, lineWidth: 4 },
  large: { width: 320, height: 220, lineWidth: 4.5 },
  extraLarge: { width: 480, height: 220, lineWidth: 4.5 },
}

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
  const start = Date.UTC(year, 2, lastSunday(year, 2), 1, 0, 0)
  const end = Date.UTC(year, 9, lastSunday(year, 9), 1, 0, 0)
  const utcGuess = Date.UTC(year, month, day, hour - 1, 0, 0)
  const inDst = utcGuess >= start && utcGuess < end
  return inDst ? "+02:00" : "+01:00"
}

function parseViennaLabel(label) {
  if (!label || typeof label !== "string") return null
  const match = label
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?(?:,)?(?:\s+(?:(start)|(\d{1,2}):(\d{2})))?$/i)
  if (!match) return null
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
  const month = months[match[2].slice(0, 3).toLowerCase()]
  if (month == null) return null
  const year = match[3] ? Number(match[3]) : 2026
  const isStart = !!match[4] || /start/i.test(label)
  const hasClock = match[5] != null && match[6] != null
  if (!hasClock && !isStart) return null
  const hour = hasClock ? Number(match[5]) : 0
  const minute = hasClock ? Number(match[6]) : 0
  const iso = year + "-" + pad(month + 1) + "-" + pad(Number(match[1])) + "T" + pad(hour) + ":" + pad(minute) + ":00" + viennaOffset(year, month, dayOr(match[1]), hour)
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

function dayOr(value) {
  return Number(value)
}

function parseTime(value) {
  if (value == null) return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
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
  const places = digits == null ? (Math.abs(value) >= 10 ? 2 : 3) : digits
  const body = Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: places })
  return (value < 0 ? "−" : "") + body
}

function formatSignedSol(value, digits) {
  if (value == null || !Number.isFinite(value)) return "—"
  if (value > 0) return "+" + formatSol(value, digits)
  return formatSol(value, digits)
}

function formatPct(value) {
  if (value == null || !Number.isFinite(value)) return "—"
  const body = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 1 })
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return sign + body + "%"
}

function directionMark(value) {
  if (value == null || !Number.isFinite(value) || value === 0) return ""
  return value > 0 ? "▲ " : "▼ "
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

function openUnrealized(paper) {
  const opens = Array.isArray(paper.open) ? paper.open : []
  let total = 0
  let any = false
  for (let i = 0; i < opens.length; i++) {
    const position = opens[i] || {}
    const size = num(position.size_sol_remaining) ?? num(position.size_sol_original) ?? num(position.size_sol)
    let pct = num(position.last_gross_pct)
    if (pct == null) {
      const last = num(position.last_price_usd) ?? num(position.last_price)
      const entry = num(position.entry_price_usd) ?? num(position.entry_price)
      if (last != null && entry != null && entry !== 0) pct = ((last - entry) / entry) * 100
    }
    if (size != null && pct != null) {
      total += (size * pct) / 100
      any = true
    }
  }
  return any ? total : 0
}

function readEquityPoint(row, index) {
  if (!row || typeof row !== "object") return null
  const value = num(row.value) ?? num(row.equity_sol)
  if (value == null) return null
  const label = row.label != null ? String(row.label) : ""
  const t = parseTime(row.t) ?? parseTime(label)
  return {
    t: t,
    label: label,
    value: value,
    kind: row.kind ? String(row.kind) : (t == null ? "point" : /start/i.test(label) ? "start" : /now/i.test(label) ? "now" : "point"),
    token: row.token ? String(row.token) : null,
    index: index,
  }
}

function fallbackSeries(paper, now) {
  const start = num(paper.start_bankroll_sol) ?? 10
  const bankroll = num(paper.bankroll_sol)
  const points = [{ t: Date.parse("2026-11-22T00:00:00+01:00"), label: "22 Nov start", value: start, kind: "start", token: null, index: 0 }]
  const closes = Array.isArray(paper.closed_trades) ? paper.closed_trades.slice() : []
  closes.sort(function (a, b) {
    return (parseTime(a && (a.exit_iso || a.exit_vienna)) || 0) - (parseTime(b && (b.exit_iso || b.exit_vienna)) || 0)
  })
  let running = start
  for (let i = 0; i < closes.length; i++) {
    const row = closes[i] || {}
    const net = num(row.net_sol)
    if (net != null) running += net
    const t = parseTime(row.exit_iso || row.exit_vienna)
    points.push({
      t: t,
      label: row.exit_vienna ? String(row.exit_vienna) : "close",
      value: running,
      kind: "close",
      token: row.token ? String(row.token) : null,
      index: points.length,
    })
  }
  if (bankroll != null && points.length) {
    const lastClose = points.filter(function (p) { return p.kind === "close" }).pop()
    if (lastClose) lastClose.value = bankroll
  }
  const mtm = (bankroll != null ? bankroll : running) + openUnrealized(paper)
  points.push({ t: now, label: "now", value: mtm, kind: "now", token: null, index: points.length })
  return points
}

function pointsInWeek(points, now) {
  const start = now - WEEK_MS
  const inWindow = points.filter(function (p) { return p.t == null || (p.t <= now && p.t >= start) })
  const before = points.filter(function (p) { return p.t != null && p.t < start })
  if (before.length && (inWindow.length === 0 || (inWindow[0].t != null && inWindow[0].t > start))) {
    const last = before[before.length - 1]
    inWindow.unshift({ t: start, label: "7d ago", value: last.value, kind: "carry", token: null, index: last.index })
  }
  inWindow.sort(function (a, b) { return (a.t || 0) - (b.t || 0) })
  return inWindow
}

function ensureNowPoint(points, paper, now) {
  const last = points[points.length - 1]
  const hasNow = last && last.kind === "now"
  const bankroll = num(paper.bankroll_sol)
  const mtm = (bankroll != null ? bankroll : (last ? last.value : null))
  if (mtm == null) return points
  const value = mtm + openUnrealized(paper)
  if (hasNow) {
    last.t = now
    last.value = value
    last.label = "now"
    return points
  }
  // Old snapshots end on realized bankroll only — append mark-to-market.
  if (last && last.t != null && now - last.t < 1000 && Math.abs(last.value - value) < 1e-9) return points
  return points.concat([{ t: now, label: "now", value: value, kind: "now", token: null, index: points.length }])
}

function chartSizeFor(family) {
  return CHART_SIZE[family] || CHART_SIZE.medium
}

function buildModel(snapshot, now, family) {
  const paper = paperOf(snapshot)
  const asOf = parseTime(snapshot && (snapshot.as_of_iso || snapshot.as_of_vienna)) || now
  const raw = Array.isArray(paper.equity) ? paper.equity.map(readEquityPoint).filter(Boolean) : []
  let series = raw.length ? raw.slice() : fallbackSeries(paper, asOf)
  series.sort(function (a, b) { return (a.t || 0) - (b.t || 0) })
  series = ensureNowPoint(series, paper, asOf)
  const week = pointsInWeek(series, asOf)
  const first = week[0]
  const last = week[week.length - 1]
  const net7d = first && last ? last.value - first.value : null
  const netPct = first && last && first.value ? (net7d / first.value) * 100 : null
  const values = week.map(function (p) { return p.value })
  const min = values.length ? Math.min.apply(null, values) : null
  const max = values.length ? Math.max.apply(null, values) : null
  const bankroll = last ? last.value : num(paper.bankroll_sol)
  const markers = week.filter(function (p) { return p.kind === "close" })
  return {
    ok: true,
    error: null,
    family: family || "medium",
    bankroll: bankroll,
    net7d: net7d,
    netPct: netPct,
    points: week,
    markers: markers,
    min: min,
    max: max,
    up: net7d == null || net7d >= 0,
    empty: week.length === 0,
    updatedAt: asOf,
    chartSize: chartSizeFor(family || "medium"),
  }
}

function layoutChart(points, width, height) {
  if (!points || !points.length) return null
  const padL = 10
  const padR = 12
  const padT = 10
  const padB = 10
  const timed = points.every(function (p) { return p.t != null })
  const minT = timed ? Math.min.apply(null, points.map(function (p) { return p.t })) : 0
  const maxT = timed ? Math.max.apply(null, points.map(function (p) { return p.t })) : Math.max(points.length - 1, 1)
  const minV = Math.min.apply(null, points.map(function (p) { return p.value }))
  const maxV = Math.max.apply(null, points.map(function (p) { return p.value }))
  const span = maxV - minV || Math.max(Math.abs(maxV) * 0.02, 0.01)
  const y0 = minV - span * 0.22
  const y1 = maxV + span * 0.28
  const coords = points.map(function (point, index) {
    const xRaw = timed ? ((point.t - minT) / (maxT - minT || 1)) : index / Math.max(points.length - 1, 1)
    return {
      x: padL + xRaw * (width - padL - padR),
      y: padT + (1 - (point.value - y0) / (y1 - y0)) * (height - padT - padB),
      value: point.value,
      kind: point.kind,
      last: index === points.length - 1,
      marker: point.kind === "close",
    }
  })
  return { coords: coords, minV: minV, maxV: maxV, width: width, height: height }
}

function smoothPath(coords) {
  if (!coords.length) return []
  if (coords.length === 1) return [{ type: "move", x: coords[0].x, y: coords[0].y }]
  const segs = [{ type: "move", x: coords[0].x, y: coords[0].y }]
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[i + 2] || p2
    segs.push({
      type: "curve",
      c1x: p1.x + (p2.x - p0.x) / 6,
      c1y: p1.y + (p2.y - p0.y) / 6,
      c2x: p2.x - (p3.x - p1.x) / 6,
      c2y: p2.y - (p3.y - p1.y) / 6,
      x: p2.x,
      y: p2.y,
    })
  }
  return segs
}

function applySegs(path, segs) {
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    if (s.type === "move") path.moveToPoint(new Point(s.x, s.y))
    else path.addCurveToPoint(new Point(s.x, s.y), new Point(s.c1x, s.c1y), new Point(s.c2x, s.c2y))
  }
}

function linePath(coords) {
  const path = new Path()
  applySegs(path, smoothPath(coords))
  return path
}

function areaPath(coords, height) {
  const path = new Path()
  const segs = smoothPath(coords)
  applySegs(path, segs)
  const last = coords[coords.length - 1]
  const first = coords[0]
  path.addLineToPoint(new Point(last.x, height))
  path.addLineToPoint(new Point(first.x, height))
  path.closeSubpath()
  return path
}

function tone(value) {
  if (value == null || !Number.isFinite(value) || value === 0) return TEXT
  return value > 0 ? GREEN : RED
}

// --- Scriptable I/O (mocked in the node test) ---

function cachePath() {
  const fm = FileManager.local()
  return fm.joinPath(fm.documentsDirectory(), CACHE_NAME)
}

async function loadSnapshot() {
  const fm = FileManager.local()
  const path = cachePath()
  try {
    const req = new Request(SNAPSHOT_URL)
    req.timeoutInterval = 12
    const data = await req.loadJSON()
    if (data && typeof data === "object") {
      try { fm.writeString(path, JSON.stringify(data)) } catch (err) {}
      return data
    }
  } catch (err) {}
  if (fm.fileExists(path)) {
    try {
      const cached = JSON.parse(fm.readString(path))
      if (cached && typeof cached === "object") return cached
    } catch (err) {}
  }
  throw new Error("offline")
}

function color(hex, alpha) {
  if (alpha == null) return new Color(hex)
  return new Color(hex, alpha)
}

function addLabel(parent, text, size, weight, hex, options) {
  const line = parent.addText(text)
  if (weight === "bold") line.font = Font.boldSystemFont(size)
  else if (weight === "semibold") line.font = Font.semiboldSystemFont(size)
  else line.font = Font.systemFont(size)
  line.textColor = color(hex)
  line.lineLimit = 1
  if (options && options.right) line.rightAlignText()
  if (options && options.center) line.centerAlignText()
  if (options && options.minScale) line.minimumScaleFactor = options.minScale
  return line
}

function drawChartImage(model) {
  const size = model.chartSize
  const geo = layoutChart(model.points, size.width, size.height)
  if (!geo) return null
  const ctx = new DrawContext()
  ctx.size = new Size(size.width, size.height)
  ctx.opaque = false
  ctx.respectScreenScale = true
  const stroke = model.up ? GREEN : RED
  if (geo.coords.length >= 2) {
    ctx.setFillColor(color(stroke, 0.22))
    ctx.addPath(areaPath(geo.coords, size.height))
    ctx.fillPath()
    ctx.setStrokeColor(color(stroke))
    ctx.setLineWidth(size.lineWidth)
    ctx.addPath(linePath(geo.coords))
    ctx.strokePath()
  }
  for (let i = 0; i < geo.coords.length; i++) {
    const c = geo.coords[i]
    const r = c.last ? 5 : c.marker ? 4 : 3
    ctx.setFillColor(color(stroke))
    ctx.fillEllipse(new Rect(c.x - r, c.y - r, r * 2, r * 2))
  }
  return ctx.getImage()
}

function renderWidget(model) {
  const widget = new ListWidget()
  widget.backgroundColor = color(BG)
  widget.url = APP_URL
  const large = model.family === "large" || model.family === "extraLarge"
  widget.setPadding(large ? 12 : 10, 14, 8, 14)
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000)
  widget.spacing = large ? 5 : 4

  if (model.error && !model.ok) {
    addLabel(widget, "Trading Bot", 12, "semibold", TEXT)
    addLabel(widget, String(model.error), 11, "regular", RED)
    addLabel(widget, "updated " + formatViennaClock(Date.now()), 9, "regular", DIM)
    return widget
  }

  const header = widget.addStack()
  header.layoutVertically()
  header.spacing = 1

  const netRow = header.addStack()
  netRow.layoutHorizontally()
  netRow.bottomAlignContent()
  addLabel(netRow, "7d", 10, "semibold", MUTED)
  netRow.addSpacer(6)
  const netText = directionMark(model.net7d) + formatSignedSol(model.net7d) + " SOL  " + formatPct(model.netPct)
  addLabel(netRow, netText, large ? 16 : 14, "bold", tone(model.net7d), { minScale: 0.7 })
  netRow.addSpacer()

  addLabel(header, formatSol(model.bankroll) + " SOL", 11, "semibold", TEXT, { minScale: 0.8 })

  if (model.empty || !model.points.length) {
    widget.addSpacer(6)
    const empty = widget.addStack()
    empty.layoutVertically()
    empty.cornerRadius = 10
    empty.borderWidth = 1
    empty.borderColor = color(BORDER, BORDER_ALPHA)
    empty.setPadding(12, 12, 12, 12)
    addLabel(empty, "No 7d equity yet", 12, "regular", MUTED, { center: true })
    widget.addSpacer()
    addLabel(widget, "updated " + formatViennaClock(model.updatedAt), 9, "regular", DIM)
  } else {
    if (model.max != null) {
      const maxRow = widget.addStack()
      maxRow.layoutHorizontally()
      maxRow.addSpacer()
      addLabel(maxRow, formatSol(model.max) + " SOL", 9, "regular", MUTED, { minScale: 0.8 })
    }
    const image = drawChartImage(model)
    if (image) {
      const view = widget.addImage(image)
      view.applyFillingContentMode()
      view.centerAlignImage()
      // Leave tintColor unset so default/dark keeps green/red; iOS tinted
      // mode will recolor the image but a thick line + area stay visible.
    }
    const axis = widget.addStack()
    axis.layoutHorizontally()
    axis.bottomAlignContent()
    addLabel(axis, "7d ago", 9, "regular", MUTED)
    axis.addSpacer()
    addLabel(axis, "now", 9, "regular", MUTED)
    const foot = widget.addStack()
    foot.layoutHorizontally()
    foot.bottomAlignContent()
    if (model.min != null) addLabel(foot, formatSol(model.min) + " SOL", 9, "regular", MUTED, { minScale: 0.8 })
    foot.addSpacer()
    addLabel(foot, "updated " + formatViennaClock(model.updatedAt), 9, "regular", DIM)
  }

  return widget
}

async function runScriptable() {
  const family = typeof config !== "undefined" && config.widgetFamily ? config.widgetFamily : "medium"
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
  } else if (family === "large") {
    await widget.presentLarge()
  } else if (family === "small") {
    await widget.presentSmall()
  } else {
    await widget.presentMedium()
  }
  Script.complete()
}

const TradingBotChart = {
  APP_URL: APP_URL,
  SNAPSHOT_URL: SNAPSHOT_URL,
  REFRESH_MINUTES: REFRESH_MINUTES,
  WEEK_MS: WEEK_MS,
  CHART_SIZE: CHART_SIZE,
  parseViennaLabel: parseViennaLabel,
  parseTime: parseTime,
  formatViennaClock: formatViennaClock,
  formatSol: formatSol,
  formatSignedSol: formatSignedSol,
  formatPct: formatPct,
  directionMark: directionMark,
  openUnrealized: openUnrealized,
  buildModel: buildModel,
  layoutChart: layoutChart,
  smoothPath: smoothPath,
  pointsInWeek: pointsInWeek,
  fallbackSeries: fallbackSeries,
  ensureNowPoint: ensureNowPoint,
  drawChartImage: drawChartImage,
  renderWidget: renderWidget,
  loadSnapshot: loadSnapshot,
  tone: tone,
}

try {
  if (typeof module !== "undefined" && module && module.exports) {
    module.exports = TradingBotChart
  }
} catch (err) {}

if (typeof Script !== "undefined") {
  runScriptable()
}
