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
const SNAPSHOT_URL = APP_URL + "data/widget.json"
const CACHE_NAME = "trading-bot-widget.json"
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
  small: { width: 300, height: 70, lineWidth: 3.5 },
  medium: { width: 330, height: 110, lineWidth: 4 },
  large: { width: 330, height: 200, lineWidth: 4.5 },
  extraLarge: { width: 330, height: 200, lineWidth: 4.5 },
}
const MAX_CHART_POINTS = 60
const REQUEST_TIMEOUT_S = 12

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

function slimSnapshot(data) {
  if (!data || typeof data !== "object") return {}
  const paper = data.paper && typeof data.paper === "object" ? data.paper : {}
  const equity = Array.isArray(paper.equity) ? paper.equity : []
  const opens = Array.isArray(paper.open) ? paper.open : []
  const closes = Array.isArray(paper.closed_trades) ? paper.closed_trades : []
  const slimEq = []
  for (let i = 0; i < equity.length; i++) {
    const row = equity[i]
    if (!row || typeof row !== "object") continue
    slimEq.push({ label: row.label, value: row.value, t: row.t, kind: row.kind, token: row.token })
  }
  const slimOpen = []
  for (let i = 0; i < opens.length; i++) {
    const row = opens[i]
    if (!row || typeof row !== "object") continue
    slimOpen.push({
      token: row.token,
      entry_ts: row.entry_ts,
      entry_vienna: row.entry_vienna,
      size_sol_remaining: row.size_sol_remaining,
      size_sol_original: row.size_sol_original,
      size_sol: row.size_sol,
      last_gross_pct: row.last_gross_pct,
      last_price_usd: row.last_price_usd,
      last_price: row.last_price,
      entry_price_usd: row.entry_price_usd,
      entry_price: row.entry_price,
      rules_version: row.rules_version,
    })
  }
  const slimClose = []
  for (let i = 0; i < closes.length; i++) {
    const row = closes[i]
    if (!row || typeof row !== "object") continue
    slimClose.push({ token: row.token, exit_iso: row.exit_iso, exit_vienna: row.exit_vienna, net_sol: row.net_sol, net_pct: row.net_pct, exit_code: row.exit_code, kind: row.kind, rules_version: row.rules_version })
  }
  return {
    as_of_iso: data.as_of_iso,
    as_of_vienna: data.as_of_vienna,
    paper: {
      bankroll_sol: paper.bankroll_sol,
      start_bankroll_sol: paper.start_bankroll_sol,
      equity: slimEq,
      open: slimOpen,
      closed_trades: slimClose,
    },
  }
}

function downsample(points, limit) {
  const cap = limit == null ? MAX_CHART_POINTS : limit
  if (!points || points.length <= cap) return points ? points.slice() : []
  const n = points.length
  const chosen = new Array(n)
  let count = 0
  function pick(i) {
    if (i < 0 || i >= n || chosen[i]) return
    chosen[i] = true
    count++
  }
  pick(0)
  pick(n - 1)
  for (let i = 0; i < n && count < cap; i++) {
    if (points[i].kind === "close") pick(i)
  }
  if (count < cap) {
    const step = (n - 1) / (cap - 1)
    for (let k = 0; k < cap && count < cap; k++) pick(Math.round(k * step))
  }
  if (count > cap) {
    const out = [points[0]]
    const inner = cap - 2
    for (let k = 1; k <= inner; k++) out.push(points[Math.round((k * (n - 1)) / (inner + 1))])
    out.push(points[n - 1])
    return out
  }
  const out = []
  for (let i = 0; i < n; i++) if (chosen[i]) out.push(points[i])
  return out
}

function chartSizeFor(family) {
  return CHART_SIZE[family] || CHART_SIZE.medium
}

function placeholderModel(family, now, error) {
  return {
    ok: true,
    error: error || null,
    placeholder: true,
    family: family || "medium",
    bankroll: null,
    net7d: null,
    netPct: null,
    points: [],
    markers: [],
    min: null,
    max: null,
    up: true,
    empty: true,
    updatedAt: now || Date.now(),
    chartSize: chartSizeFor(family || "medium"),
  }
}

function buildModel(snapshot, now, family) {
  if (!snapshot || snapshot.placeholder) return placeholderModel(family, now, snapshot && snapshot.error)
  const paper = paperOf(snapshot)
  const asOf = parseTime(snapshot && (snapshot.as_of_iso || snapshot.as_of_vienna)) || now
  const raw = Array.isArray(paper.equity) ? paper.equity.map(readEquityPoint).filter(Boolean) : []
  let series = raw.length ? raw.slice() : fallbackSeries(paper, asOf)
  series.sort(function (a, b) { return (a.t || 0) - (b.t || 0) })
  series = ensureNowPoint(series, paper, asOf)
  const week = downsample(pointsInWeek(series, asOf), MAX_CHART_POINTS)
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

function polyline(coords) {
  if (!coords.length) return []
  const segs = [{ type: "move", x: coords[0].x, y: coords[0].y }]
  for (let i = 1; i < coords.length; i++) segs.push({ type: "line", x: coords[i].x, y: coords[i].y })
  return segs
}

function applySegs(path, segs) {
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    if (s.type === "move") path.moveToPoint(new Point(s.x, s.y))
    else path.addLineToPoint(new Point(s.x, s.y))
  }
}

function linePath(coords) {
  const path = new Path()
  applySegs(path, polyline(coords))
  return path
}

function areaPath(coords, height) {
  const path = new Path()
  applySegs(path, polyline(coords))
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

function cacheFileManager() {
  // Shared between the Scriptable app and home screen widgets.
  return FileManager.local()
}

function cachePath() {
  const fm = cacheFileManager()
  return fm.joinPath(fm.documentsDirectory(), CACHE_NAME)
}

function errorMessage(err) {
  if (err == null) return "Could not load"
  const msg = err && err.message ? String(err.message) : String(err)
  return msg.length > 80 ? msg.slice(0, 77) + "…" : msg
}

function readCache() {
  try {
    const fm = cacheFileManager()
    const path = cachePath()
    if (!fm.fileExists(path)) return null
    const cached = JSON.parse(fm.readString(path))
    return cached && typeof cached === "object" ? slimSnapshot(cached) : null
  } catch (err) {
    return null
  }
}

function writeCache(snapshot) {
  try {
    cacheFileManager().writeString(cachePath(), JSON.stringify(snapshot))
  } catch (err) {}
}

async function fetchSnapshot() {
  const req = new Request(SNAPSHOT_URL)
  req.timeoutInterval = REQUEST_TIMEOUT_S
  const body = await req.loadString()
  let data
  try {
    data = JSON.parse(body)
  } catch (err) {
    throw new Error("Bad widget.json")
  }
  if (!data || typeof data !== "object") throw new Error("Bad widget.json")
  const slim = slimSnapshot(data)
  writeCache(slim)
  return slim
}

async function loadSnapshot() {
  // Home-screen widgets have about 30s, but LTE can be slow. 12s leaves
  // time to fall back to the local cache (seeded by an in-app run).
  try {
    return await fetchSnapshot()
  } catch (err) {
    const cached = readCache()
    if (cached) return cached
    return { placeholder: true, error: errorMessage(err) }
  }
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
  if (!model || model.placeholder || !model.points || model.points.length < 2) return null
  const size = model.chartSize
  const geo = layoutChart(model.points, size.width, size.height)
  if (!geo) return null
  const ctx = new DrawContext()
  ctx.size = new Size(size.width, size.height)
  ctx.opaque = false
  ctx.respectScreenScale = false
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
    if (!c.last && !c.marker) continue
    const r = c.last ? 5 : 4
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

  if (model.placeholder || (model.error && !model.ok)) {
    addLabel(widget, "Trading Bot", 12, "semibold", TEXT)
    addLabel(widget, String(model.error || "Updating…"), 11, "regular", model.error ? RED : MUTED)
    addLabel(widget, "updated " + formatViennaClock(model.updatedAt || Date.now()), 9, "regular", DIM)
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
    const emptyLabel = "No 7d equity yet"
    addLabel(empty, emptyLabel, 12, "regular", MUTED, { center: true })
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

function errorWidget(message, family) {
  const widget = new ListWidget()
  widget.backgroundColor = color(BG)
  widget.url = APP_URL
  widget.setPadding(10, 14, 8, 14)
  addLabel(widget, "Trading Bot", 12, "semibold", TEXT)
  addLabel(widget, String(message || "Updating…"), 11, "regular", message ? RED : MUTED)
  addLabel(widget, "updated " + formatViennaClock(Date.now()), 9, "regular", DIM)
  return widget
}

async function runScriptable() {
  const family = typeof config !== "undefined" && config.widgetFamily ? config.widgetFamily : "medium"
  const inWidget = typeof config === "undefined" || config.runsInWidget !== false
  let widget = null
  try {
    let snapshot
    try {
      snapshot = await loadSnapshot()
    } catch (err) {
      snapshot = { placeholder: true, error: errorMessage(err) }
    }
    try {
      widget = renderWidget(buildModel(snapshot, Date.now(), family))
    } catch (err) {
      widget = errorWidget(errorMessage(err), family)
    }
    if (!widget) widget = errorWidget("Updating…", family)
    // Always set the widget first so iOS never sees an empty run, then present in-app.
    Script.setWidget(widget)
    if (!inWidget) {
      if (family === "large") await widget.presentLarge()
      else if (family === "small") await widget.presentSmall()
      else await widget.presentMedium()
    }
  } catch (err) {
    try {
      widget = errorWidget(errorMessage(err), family)
      Script.setWidget(widget)
    } catch (err2) {}
  } finally {
    Script.complete()
  }
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
  polyline: polyline,
  downsample: downsample,
  slimSnapshot: slimSnapshot,
  placeholderModel: placeholderModel,
  MAX_CHART_POINTS: MAX_CHART_POINTS,
  REQUEST_TIMEOUT_S: REQUEST_TIMEOUT_S,
  pointsInWeek: pointsInWeek,
  fallbackSeries: fallbackSeries,
  ensureNowPoint: ensureNowPoint,
  drawChartImage: drawChartImage,
  renderWidget: renderWidget,
  loadSnapshot: loadSnapshot,
  fetchSnapshot: fetchSnapshot,
  writeCache: writeCache,
  errorMessage: errorMessage,
  runScriptable: runScriptable,
  errorWidget: errorWidget,
  tone: tone,
}

try {
  if (typeof module !== "undefined" && module && module.exports) {
    module.exports = TradingBotChart
  }
} catch (err) {}

if (typeof Script !== "undefined") {
  // Top-level await: Scriptable ends the script when the main body returns,
  // so a fire-and-forget runScriptable() would call complete without setWidget.
  await runScriptable()
}
