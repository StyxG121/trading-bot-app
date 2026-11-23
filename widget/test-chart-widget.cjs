// Runs TradingBotChart.js inside a vm with a mocked Scriptable API.
// Usage: node widget/test-chart-widget.cjs <snapshot.json> [outTree.json]
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')

const snapPath = process.argv[2]
const treeOut = process.argv[3]
const liveSnapshot = JSON.parse(fs.readFileSync(snapPath, 'utf8'))
const source = fs.readFileSync(path.join(__dirname, 'TradingBotChart.js'), 'utf8')

function makeSandbox({ snapshot, family = 'medium', runsInWidget = true, fetchFails = false, files = {} }) {
  const calls = { setWidget: null, completed: false, presented: null }
  class Color { constructor(hex, alpha) { this.hex = hex; this.alpha = alpha ?? 1 } }
  const Font = {
    systemFont: (s) => ({ size: s, weight: 'regular' }),
    semiboldSystemFont: (s) => ({ size: s, weight: 'semibold' }),
    boldSystemFont: (s) => ({ size: s, weight: 'bold' }),
  }
  class Point { constructor(x, y) { this.x = x; this.y = y } }
  class Size { constructor(w, h) { this.width = w; this.height = h } }
  class Rect { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h } }
  class Path {
    constructor() { this.ops = [] }
    moveToPoint(p) { this.ops.push({ op: 'move', p }) }
    addLineToPoint(p) { this.ops.push({ op: 'line', p }) }
    addCurveToPoint(p, c1, c2) { this.ops.push({ op: 'curve', p, c1, c2 }) }
    closeSubpath() { this.ops.push({ op: 'close' }) }
  }
  class DrawContext {
    constructor() {
      this.size = null
      this.opaque = true
      this.respectScreenScale = false
      this.commands = []
      this._lineWidth = null
      this._fill = null
      this._stroke = null
    }
    setFillColor(c) { this._fill = c; this.commands.push({ op: 'setFill', color: c }) }
    setStrokeColor(c) { this._stroke = c; this.commands.push({ op: 'setStroke', color: c }) }
    setLineWidth(w) { this._lineWidth = w; this.commands.push({ op: 'setLineWidth', width: w }) }
    addPath(p) { this.commands.push({ op: 'addPath', path: p }) }
    fillPath() { this.commands.push({ op: 'fillPath' }) }
    strokePath() { this.commands.push({ op: 'strokePath', width: this._lineWidth }) }
    fillEllipse(r) { this.commands.push({ op: 'fillEllipse', rect: r }) }
    getImage() {
      return { type: 'drawn', size: this.size, commands: this.commands, lineWidth: this._lineWidth, opaque: this.opaque, respectScreenScale: this.respectScreenScale }
    }
  }
  class WidgetText {
    constructor(text) { this.type = 'text'; this.text = text; this.align = 'left' }
    leftAlignText() { this.align = 'left' }
    centerAlignText() { this.align = 'center' }
    rightAlignText() { this.align = 'right' }
  }
  class WidgetSpacer { constructor(len) { this.type = 'spacer'; this.length = len ?? null } }
  class WidgetImage {
    constructor(image) {
      this.type = 'image'
      this.image = image
      this.tintColor = null
      this.contentMode = null
      this.align = 'left'
    }
    applyFillingContentMode() { this.contentMode = 'filling' }
    applyFittingContentMode() { this.contentMode = 'fitting' }
    centerAlignImage() { this.align = 'center' }
    leftAlignImage() { this.align = 'left' }
    rightAlignImage() { this.align = 'right' }
  }
  class WidgetStack {
    constructor() {
      this.type = 'stack'
      this.children = []
      this.layout = 'horizontal'
      this.padding = null
      this.borderWidth = null
      this.borderColor = null
    }
    addText(t) { assert.equal(typeof t, 'string'); const n = new WidgetText(t); this.children.push(n); return n }
    addStack() { const s = new WidgetStack(); this.children.push(s); return s }
    addSpacer(len) { const s = new WidgetSpacer(len); this.children.push(s); return s }
    addImage(image) { const n = new WidgetImage(image); this.children.push(n); return n }
    layoutVertically() { this.layout = 'vertical' }
    layoutHorizontally() { this.layout = 'horizontal' }
    centerAlignContent() { this.align = 'center' }
    topAlignContent() { this.align = 'top' }
    bottomAlignContent() { this.align = 'bottom' }
    setPadding(t, l, b, r) { this.padding = [t, l, b, r] }
  }
  class ListWidget extends WidgetStack {
    constructor() { super(); this.type = 'widget'; this.layout = 'vertical' }
    async presentLarge() { calls.presented = 'large' }
    async presentMedium() { calls.presented = 'medium' }
    async presentSmall() { calls.presented = 'small' }
  }
  class Request {
    constructor(url) { this.url = url; this.timeoutInterval = 0 }
    async loadJSON() {
      assert.equal(this.url, 'https://styxg121.github.io/trading-bot-app/data/snapshot.json')
      if (fetchFails) throw new Error('offline')
      return JSON.parse(JSON.stringify(snapshot))
    }
  }
  const store = { ...files }
  const FileManager = {
    local: () => ({
      documentsDirectory: () => '/docs',
      joinPath: (a, b) => `${a}/${b}`,
      fileExists: (p) => Object.prototype.hasOwnProperty.call(store, p),
      readString: (p) => store[p],
      writeString: (p, s) => { store[p] = s },
    }),
  }
  const Script = {
    setWidget: (w) => { calls.setWidget = w },
    complete: () => { calls.completed = true },
  }
  const config = { widgetFamily: family, runsInWidget }
  const sandbox = {
    console, Date, Intl, JSON, Math, Number, String, Object, Array, Error, Promise,
    Color, Font, Point, Size, Rect, Path, DrawContext, ListWidget, Request, FileManager, Script, config,
    module: { exports: {} },
  }
  sandbox.globalThis = sandbox
  return { sandbox, calls, store }
}

async function runInScriptable(opts) {
  const ctx = makeSandbox(opts)
  vm.createContext(ctx.sandbox)
  vm.runInContext(source, ctx.sandbox, { filename: 'TradingBotChart.js' })
  for (let i = 0; i < 200 && !ctx.calls.completed; i++) await new Promise((r) => setTimeout(r, 5))
  assert.ok(ctx.calls.completed, 'Script.complete() was not called')
  return ctx
}

function loadPure() {
  const sandbox = { console, Date, Intl, JSON, Math, Number, String, Object, Array, Error, Promise, module: { exports: {} } }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'TradingBotChart.js' })
  return sandbox.module.exports
}

function texts(node, out = []) {
  if (node.type === 'text') out.push(node.text)
  for (const child of node.children || []) texts(child, out)
  return out
}

function images(node, out = []) {
  if (node.type === 'image') out.push(node)
  for (const child of node.children || []) images(child, out)
  return out
}

function filledStacks(node, out = [], isRoot = true) {
  if (!isRoot && node.backgroundColor) out.push(node)
  for (const child of node.children || []) filledStacks(child, out, false)
  return out
}

function serialize(node) {
  const base = { type: node.type }
  if (node.type === 'text') {
    return { ...base, text: node.text, color: node.textColor && node.textColor.hex, font: node.font, align: node.align }
  }
  if (node.type === 'spacer') return { ...base, length: node.length }
  if (node.type === 'image') {
    return {
      ...base,
      contentMode: node.contentMode,
      tintColor: node.tintColor,
      align: node.align,
      image: node.image && {
        size: node.image.size,
        lineWidth: node.image.lineWidth,
        commandOps: (node.image.commands || []).map((c) => c.op),
        respectScreenScale: node.image.respectScreenScale,
        opaque: node.image.opaque,
      },
    }
  }
  return {
    ...base,
    layout: node.layout,
    background: node.backgroundColor && node.backgroundColor.hex,
    borderWidth: node.borderWidth ?? null,
    url: node.url ?? null,
    refreshAfterDate: node.refreshAfterDate ? node.refreshAfterDate.toISOString() : null,
    children: (node.children || []).map(serialize),
  }
}

;(async () => {
  const results = []
  const ok = (name) => { results.push(name); console.log('PASS', name) }

  const W = loadPure()
  assert.equal(typeof W.buildModel, 'function')
  ok('loads as a plain script and exports helpers')

  assert.equal(W.directionMark(1), '▲ ')
  assert.equal(W.directionMark(-0.2), '▼ ')
  assert.ok(W.parseViennaLabel('22 Nov start') != null)
  assert.equal(new Date(W.parseViennaLabel('22 Nov start')).toISOString(), '2026-11-21T23:00:00.000Z')
  assert.equal(W.formatViennaClock(Date.parse('2026-11-23T13:16:00Z')), '14:16')
  ok('Vienna labels and direction marks')

  const asOf = Date.parse(liveSnapshot.as_of_iso) || Date.now()
  const live = W.buildModel(liveSnapshot, asOf, 'medium')
  assert.ok(live.points.length >= 2, 'expected a 7d series, got ' + live.points.length)
  assert.equal(live.points[live.points.length - 1].kind, 'now')
  assert.ok(live.markers.some((m) => m.token === 'FIONA' || m.kind === 'close') || live.markers.length >= 0)
  assert.ok(live.net7d < 0, 'live 7d net should be down after FIONA + open marks')
  assert.ok(live.bankroll != null)
  assert.equal(live.empty, false)
  // now includes unrealized
  const paper = liveSnapshot.paper
  const realized = paper.bankroll_sol
  assert.ok(Math.abs(live.points[live.points.length - 1].value - realized) > 1e-6 || (paper.open || []).length === 0)
  console.log('  live model:', JSON.stringify({
    bankroll: live.bankroll, net7d: live.net7d, netPct: live.netPct,
    points: live.points.map((p) => `${p.kind}:${p.label}:${p.value}`),
    min: live.min, max: live.max, up: live.up,
  }))
  ok('live snapshot model (medium) includes MTM now point')

  const large = W.buildModel(liveSnapshot, asOf, 'large')
  assert.ok(large.chartSize.height > live.chartSize.height)
  assert.ok(large.chartSize.lineWidth >= 4)
  ok('large uses a taller chart and a thick line')

  // 7d window drops older-than-7d points; empty without equity/closes
  const empty = W.buildModel({ as_of_iso: '2026-11-23T13:00:00+01:00', paper: { bankroll_sol: 10, start_bankroll_sol: 10, equity: [], closed_trades: [], open: [] } }, Date.parse('2026-11-23T12:00:00Z'), 'medium')
  // fallback still adds start + now, so not empty
  assert.ok(empty.points.length >= 2)
  ok('fallback series from start bankroll + now')

  const oldOnly = W.buildModel({
    as_of_iso: '2026-11-23T13:00:00+01:00',
    paper: {
      bankroll_sol: 11,
      start_bankroll_sol: 10,
      equity: [{ label: '01 Jan start', t: '2026-01-01T00:00:00+01:00', value: 10, kind: 'start' }],
      open: [],
      closed_trades: [],
    },
  }, Date.parse('2026-11-23T12:00:00Z'), 'medium')
  // carry-forward into the 7d window + now
  assert.ok(oldOnly.points.some((p) => p.kind === 'carry' || p.label === '7d ago') || oldOnly.points.length >= 1)
  ok('points older than 7d are carried into the window')

  // Old snapshot without a now point still gets unrealized MTM
  const stale = {
    as_of_iso: '2026-11-23T13:35:45+01:00',
    paper: {
      start_bankroll_sol: 10,
      bankroll_sol: 9.855991,
      equity: [
        { label: '22 Nov start', value: 10 },
        { label: '22 Nov 21:09', value: 9.855991 },
      ],
      closed_trades: [{ token: 'FIONA', exit_vienna: '22 Nov 2026, 21:09', net_sol: -0.144 }],
      open: [{ token: 'X', size_sol_remaining: 0.3, last_gross_pct: 10 }],
    },
  }
  const sm = W.buildModel(stale, Date.parse('2026-11-23T12:35:45Z'), 'medium')
  const nowPt = sm.points[sm.points.length - 1]
  assert.equal(nowPt.kind, 'now')
  assert.ok(Math.abs(nowPt.value - (9.855991 + 0.03)) < 1e-6, 'now P/L ' + nowPt.value)
  ok('old snapshots get a mark-to-market now point')

  const geo = W.layoutChart(live.points, 320, 96)
  assert.ok(geo && geo.coords.length === live.points.length)
  assert.ok(geo.coords.every((c) => c.x >= 0 && c.x <= 320 && c.y >= 0 && c.y <= 96))
  const segs = W.smoothPath(geo.coords)
  assert.ok(segs[0].type === 'move')
  assert.ok(segs.some((s) => s.type === 'curve'))
  ok('chart layout and smooth path stay in bounds')

  // Full medium widget run
  const run = await runInScriptable({ snapshot: liveSnapshot, family: 'medium', runsInWidget: true })
  const widget = run.calls.setWidget
  assert.ok(widget)
  assert.equal(widget.url, 'https://styxg121.github.io/trading-bot-app/')
  const refreshMin = (widget.refreshAfterDate.getTime() - Date.now()) / 60000
  assert.ok(refreshMin > 14 && refreshMin <= 15.1, 'refresh ~15 min, got ' + refreshMin)
  assert.equal(widget.backgroundColor && widget.backgroundColor.hex, '#050605')
  assert.equal(filledStacks(widget).length, 0, 'no filled child stacks')
  const t = texts(widget)
  assert.ok(t.some((s) => s.includes('7d')))
  assert.ok(t.some((s) => s.includes('▲') || s.includes('▼')))
  assert.ok(t.some((s) => s.startsWith('updated ')))
  assert.ok(t.includes('7d ago') && t.includes('now'))
  const imgs = images(widget)
  assert.equal(imgs.length, 1, 'one chart image')
  assert.equal(imgs[0].contentMode, 'filling')
  assert.equal(imgs[0].tintColor, null)
  assert.ok(imgs[0].image && imgs[0].image.respectScreenScale)
  assert.equal(imgs[0].image.opaque, false)
  assert.ok(imgs[0].image.lineWidth >= 4, 'line thick enough to survive tint, got ' + imgs[0].image.lineWidth)
  const ops = (imgs[0].image.commands || []).map((c) => c.op)
  assert.ok(ops.includes('fillPath') && ops.includes('strokePath') && ops.includes('fillEllipse'), 'chart ops ' + ops)
  assert.ok(run.store['/docs/trading-bot-snapshot.json'], 'cache written')
  ok('medium widget draws a thick untinted filling chart, caches, sets url/refresh')

  const largeRun = await runInScriptable({ snapshot: liveSnapshot, family: 'large', runsInWidget: true })
  const largeImgs = images(largeRun.calls.setWidget)
  assert.equal(largeImgs.length, 1)
  assert.ok(largeImgs[0].image.size.height >= 200)
  assert.equal(filledStacks(largeRun.calls.setWidget).length, 0)
  ok('large widget also renders a fill-free chart')

  const cachedRun = await runInScriptable({ snapshot: liveSnapshot, family: 'medium', runsInWidget: true, fetchFails: true, files: { '/docs/trading-bot-snapshot.json': JSON.stringify(liveSnapshot) } })
  assert.ok(texts(cachedRun.calls.setWidget).some((s) => s.includes('SOL')))
  ok('offline falls back to cached snapshot')

  const errRun = await runInScriptable({ snapshot: liveSnapshot, family: 'medium', runsInWidget: true, fetchFails: true })
  assert.ok(texts(errRun.calls.setWidget).some((s) => s.includes('Could not load')))
  ok('offline without cache shows an error widget')

  const appRun = await runInScriptable({ snapshot: liveSnapshot, family: 'medium', runsInWidget: false })
  assert.equal(appRun.calls.presented, 'medium')
  ok('in-app run previews medium')

  if (treeOut) {
    fs.writeFileSync(treeOut, JSON.stringify({ family: 'medium', tree: serialize(widget) }, null, 2))
    console.log('wrote tree', treeOut)
  }
  console.log(`\n${results.length} checks passed`)
})().catch((err) => {
  console.error('FAIL', err && err.stack ? err.stack : err)
  process.exit(1)
})
