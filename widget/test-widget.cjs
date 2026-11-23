// Runs TradingBotWidget.js inside a vm with a mocked Scriptable API.
// Usage: node widget/test-widget.cjs <snapshot.json> [outTree.json]
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')

const snapPath = process.argv[2]
const treeOut = process.argv[3]
const liveSnapshot = JSON.parse(fs.readFileSync(snapPath, 'utf8'))
const source = fs.readFileSync(path.join(__dirname, 'TradingBotWidget.js'), 'utf8')

function makeSandbox({ snapshot, family = 'large', runsInWidget = true, fetchFails = false, files = {} }) {
  const calls = { setWidget: null, completed: false, presented: null, order: [] }
  class Color { constructor(hex, alpha) { this.hex = hex; this.alpha = alpha ?? 1 } }
  class Size { constructor(w, h) { this.width = w; this.height = h } }
  const Font = {
    systemFont: (s) => ({ size: s, weight: 'regular' }),
    semiboldSystemFont: (s) => ({ size: s, weight: 'semibold' }),
    boldSystemFont: (s) => ({ size: s, weight: 'bold' }),
  }
  class WidgetText {
    constructor(text) { this.type = 'text'; this.text = text; this.align = 'left' }
    leftAlignText() { this.align = 'left' }
    centerAlignText() { this.align = 'center' }
    rightAlignText() { this.align = 'right' }
  }
  class WidgetSpacer { constructor(len) { this.type = 'spacer'; this.length = len ?? null } }
  class WidgetStack {
    constructor() { this.type = 'stack'; this.children = []; this.layout = 'horizontal'; this.padding = null; this.borderWidth = null; this.borderColor = null }
    addText(t) { assert.equal(typeof t, 'string'); const n = new WidgetText(t); this.children.push(n); return n }
    addStack() { const s = new WidgetStack(); this.children.push(s); return s }
    addSpacer(len) { const s = new WidgetSpacer(len); this.children.push(s); return s }
    layoutVertically() { this.layout = 'vertical' }
    layoutHorizontally() { this.layout = 'horizontal' }
    centerAlignContent() { this.align = 'center' }
    topAlignContent() { this.align = 'top' }
    bottomAlignContent() { this.align = 'bottom' }
    setPadding(t, l, b, r) { this.padding = [t, l, b, r] }
    addImage() { throw new Error('addImage not expected') }
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
    setWidget: (w) => { calls.order.push('setWidget'); calls.setWidget = w },
    complete: () => { calls.order.push('complete'); calls.completed = true },
  }
  const config = { widgetFamily: family, runsInWidget }
  const sandbox = {
    console, Date, Intl, JSON, Math, Number, String, Object, Array, Error, Promise,
    Color, Font, Size, ListWidget, Request, FileManager, Script, config,
    module: { exports: {} },
  }
  sandbox.globalThis = sandbox
  return { sandbox, calls, store }
}

async function runInScriptable(opts) {
  const ctx = makeSandbox(opts)
  vm.createContext(ctx.sandbox)
  const wrapped = "(async () => {\n" + source + "\n})()"
  const pending = vm.runInContext(wrapped, ctx.sandbox, { filename: opts.filename || 'widget.js' })
  if (pending && typeof pending.then === "function") await pending
  assert.ok(ctx.calls.completed, 'Script.complete() was not called')
  return ctx
}

function assertSetWidgetBeforeComplete(ctx, label) {
  const order = ctx.calls.order || []
  const setI = order.indexOf('setWidget')
  const doneI = order.indexOf('complete')
  assert.ok(ctx.calls.setWidget, label + ': setWidget not called, order=' + order)
  assert.ok(setI >= 0 && doneI >= 0 && setI < doneI, label + ': setWidget must run before complete, order=' + order)
}

function loadPure() {
  // Load without a Script global so it only exports helpers
  const sandbox = { console, Date, Intl, JSON, Math, Number, String, Object, Array, Error, Promise, module: { exports: {} } }
  vm.createContext(sandbox)
  const wrapped = "(async () => {\n" + source + "\n})()"
  vm.runInContext(wrapped, sandbox, { filename: 'TradingBotWidget.js' })
  return sandbox.module.exports
}

function texts(node, out = []) {
  if (node.type === 'text') out.push(node.text)
  for (const child of node.children || []) texts(child, out)
  return out
}

function cards(node, out = []) {
  if (node.type === 'stack' && node.borderWidth && node.cornerRadius) out.push(node)
  for (const child of node.children || []) cards(child, out)
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
    return { ...base, text: node.text, color: node.textColor && node.textColor.hex, font: node.font, align: node.align, lineLimit: node.lineLimit }
  }
  if (node.type === 'spacer') return { ...base, length: node.length }
  return {
    ...base,
    layout: node.layout,
    background: node.backgroundColor && node.backgroundColor.hex,
    borderWidth: node.borderWidth ?? null,
    borderColor: node.borderColor && { hex: node.borderColor.hex, alpha: node.borderColor.alpha },
    cornerRadius: node.cornerRadius ?? null,
    padding: node.padding,
    size: node.size ? { width: node.size.width, height: node.size.height } : null,
    spacing: node.spacing ?? null,
    align: node.align ?? null,
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
  assert.equal(W.directionMark(-1), '▼ ')
  assert.equal(W.directionMark(0), '')
  assert.ok(W.formatPnl(0.001, 0.3).startsWith('▲ +'))
  assert.equal(W.formatPnl(-0.144, -28.8), '▼ −0.144  −28.8%')
  assert.equal(W.formatPct(-1.55), '−1.6%')
  assert.equal(W.formatSol(9.855991, 3), '9.856')
  ok('direction marks and formatPnl stay readable without color')

  // Vienna label parsing (CET in November)
  assert.equal(new Date(W.parseViennaLabel('22 Nov 2026, 21:09')).toISOString(), '2026-11-22T20:09:00.000Z')
  assert.equal(W.formatViennaClock(Date.parse('2026-11-23T12:35:00Z')), '13:35')
  ok('Vienna time parse/format')

  // Open P/L from last_gross_pct
  const op = W.openPnl({ size_sol_remaining: 0.3, last_gross_pct: 10 })
  assert.ok(Math.abs(op.sol - 0.03) < 1e-9)
  const op2 = W.openPnl({ size_sol_original: 0.2, entry_price_usd: 1, last_price_usd: 0.9 })
  assert.ok(Math.abs(op2.pct + 10) < 1e-9)
  ok('open P/L from gross pct or prices')

  // Live snapshot model, large
  const asOf = Date.parse(liveSnapshot.as_of_iso)
  const now = Number.isFinite(asOf) ? asOf : Date.now()
  const live = W.buildModel(liveSnapshot, now, 'large')
  const opens = (liveSnapshot.paper.open || []).length
  assert.equal(live.openCount, opens)
  assert.ok(live.trades.length <= 6)
  assert.equal(live.trades.length + live.hidden, live.tradeCount)
  // newest first
  for (let i = 1; i < live.trades.length; i++) assert.ok((live.trades[i - 1].at || 0) >= (live.trades[i].at || 0))
  // FIONA SL closed 22 Nov 21:09 is older than 24h at as_of 23 Nov 13:35? (16.4h) -> included
  console.log('  live model:', JSON.stringify({ bankroll: live.bankroll, net24h: live.net24h, netPct: live.netPct, tradeCount: live.tradeCount, open: live.openCount, closed24h: live.closedCount, winRate: live.winRate, visible: live.trades.map((t) => `${t.token}:${t.status}:${t.pct}`), hidden: live.hidden }))
  ok('live snapshot model (large)')

  const medium = W.buildModel(liveSnapshot, now, 'medium')
  assert.ok(medium.trades.length <= 3)
  assert.equal(medium.trades.length + medium.hidden, medium.tradeCount)
  ok('medium shows fewer rows')

  // 24h window: a close 30h ago is excluded
  const old = W.buildModel({
    as_of_iso: '2026-11-23T13:00:00+01:00',
    paper: { bankroll_sol: 10, start_bankroll_sol: 10, closed_trades: [{ token: 'OLD', exit_vienna: '22 Nov 2026, 07:00', net_sol: 1, net_pct: 10 }], open: [] },
  }, Date.parse('2026-11-23T12:00:00Z'), 'large')
  assert.equal(old.tradeCount, 0)
  assert.equal(old.empty, true)
  ok('24h window excludes older closes; empty state')

  const emptyRun = await runInScriptable({
    snapshot: { as_of_iso: '2026-11-23T13:00:00+01:00', paper: { bankroll_sol: 10, start_bankroll_sol: 10, closed_trades: [], open: [] } },
    family: 'large',
    runsInWidget: true,
  })
  const emptyWidget = emptyRun.calls.setWidget
  assert.ok(texts(emptyWidget).some((s) => s.includes('No trades in the last 24h')))
  assert.equal(filledStacks(emptyWidget).length, 0, 'empty state must not use a filled background')
  const emptyBox = cards(emptyWidget).find((c) => texts(c).some((s) => s.includes('No trades')))
  assert.ok(emptyBox && emptyBox.borderWidth === 1, 'empty state uses a border, not a fill')
  ok('empty state is readable in tinted mode')

  // Win rate from closed 24h only
  const wr = W.buildModel({
    paper: {
      bankroll_sol: 10, start_bankroll_sol: 10,
      closed_trades: [
        { token: 'A', exit_vienna: '23 Nov 2026, 12:00', net_sol: 0.1, net_pct: 10, exit_code: 'TP1', kind: 'partial', rules_version: 'v4' },
        { token: 'B', exit_vienna: '23 Nov 2026, 11:00', net_sol: -0.05, net_pct: -5, exit_code: 'SL', rules_version: 'v4' },
      ],
      open: [{ token: 'C', entry_ts: '2026-11-23T10:00:00Z', size_sol_remaining: 0.3, last_gross_pct: 5 }],
    },
  }, Date.parse('2026-11-23T12:30:00Z'), 'large')
  assert.equal(wr.winRate, 50)
  assert.equal(wr.openCount, 1)
  assert.ok(Math.abs(wr.net24h - (0.1 - 0.05 + 0.015)) < 1e-9)
  assert.equal(wr.trades[0].token, 'A')
  assert.equal(W.subline(wr.trades[0]), '12:00 · TP1 · half · v4')
  assert.equal(W.subline(wr.trades.find((t) => t.token === 'C')), '11:00 · open')
  ok('stats, ordering, sublines')

  // Overflow: 12 trades on large -> 6 + "+6 more"
  const many = { paper: { bankroll_sol: 10, start_bankroll_sol: 10, open: [], closed_trades: [] } }
  for (let i = 0; i < 12; i++) many.paper.closed_trades.push({ token: 'T' + i, exit_vienna: `23 Nov 2026, ${String(1 + i).padStart(2, '0')}:00`, net_sol: i % 2 ? 0.01 : -0.01, net_pct: i % 2 ? 1 : -1 })
  const mm = W.buildModel(many, Date.parse('2026-11-23T13:00:00Z'), 'large')
  assert.equal(mm.trades.length, 6)
  assert.equal(mm.hidden, 6)
  ok('overflow shows +N more')
  assert.ok(W.estimateHeight(mm) <= 340, '6-row overflow layout is ' + W.estimateHeight(mm))

  // A 24h close must stay visible when 7 newer opens would push it off a large widget
  const crowded = {
    as_of_iso: '2026-11-23T13:00:00+01:00',
    paper: {
      bankroll_sol: 10, start_bankroll_sol: 10,
      closed_trades: [{ token: 'GONE', exit_vienna: '22 Nov 2026, 21:00', net_sol: -0.14, net_pct: -28, exit_code: 'SL' }],
      open: Array.from({ length: 7 }, (_, i) => ({
        token: 'O' + i,
        entry_ts: `2026-11-23T1${i}:00:00Z`,
        size_sol_remaining: 0.3,
        last_gross_pct: 1,
      })),
    },
  }
  const cr = W.buildModel(crowded, Date.parse('2026-11-23T12:00:00Z'), 'large')
  assert.ok(cr.trades.some((t) => t.token === 'GONE' && t.status === 'closed'), '24h close was dropped: ' + cr.trades.map((t) => t.token))
  assert.equal(cr.hidden, 2)
  ok('keeps a 24h close visible when opens would overflow it')

  // Full run as a widget with live data
  const run = await runInScriptable({ snapshot: liveSnapshot, family: 'large', runsInWidget: true })
  const widget = run.calls.setWidget
  assert.ok(widget, 'Script.setWidget not called')
  assert.equal(widget.url, 'https://styxg121.github.io/trading-bot-app/')
  const refreshMin = (widget.refreshAfterDate.getTime() - Date.now()) / 60000
  assert.ok(refreshMin > 14 && refreshMin <= 15.1, 'refreshAfterDate ~15 min, got ' + refreshMin)
  const t = texts(widget)
  assert.ok(t.some((s) => s.includes('SOL')), 'bankroll text')
  assert.ok(t.some((s) => s.startsWith('updated ')), 'updated footer')
  const tradeCards = cards(widget).filter((c) => c.cornerRadius === 10 && c.borderWidth === 1 && c.children.length >= 2)
  assert.ok(tradeCards.length >= 1, 'trade cards rendered')
  assert.ok(tradeCards.every((c) => c.borderColor && c.borderColor.hex && (c.borderColor.alpha ?? 1) < 1), 'cards use a low-alpha border')
  assert.equal(filledStacks(widget).length, 0, 'no filled stack backgrounds (breaks iOS tinted mode)')
  assert.equal(widget.backgroundColor && widget.backgroundColor.hex, '#050605')
  assert.ok(t.some((s) => s.includes('▲') || s.includes('▼')), 'P/L uses ▲/▼ when color is lost')
  assert.ok(tradeCards.every((c) => texts(c).some((s) => s === '▎')), 'each card has a text left bar, not a fill')
  // One text node per P/L / header net line, in a fixed-width box — no overprint.
  const pnlLines = t.filter((s) => /[▲▼]/.test(s) && s.includes('%'))
  assert.ok(pnlLines.length >= 1, 'expected P/L lines, got ' + t)
  pnlLines.forEach((s) => {
    const matches = s.match(/[▲▼]/g) || []
    assert.equal(matches.length, 1, 'overprinted P/L: ' + s)
    assert.ok(!/\d+\.\d{4}/.test(s), 'P/L should use 3 SOL decimals: ' + s)
  })
  function boxes(node, out = []) {
    if (node.type === 'stack' && node.size) out.push(node)
    for (const child of node.children || []) boxes(child, out)
    return out
  }
  const sized = boxes(widget)
  assert.ok(sized.some((b) => b.size && b.size.width === 150 && texts(b).some((s) => s.includes('%'))), 'P/L uses a fixed-width box')
  assert.ok(sized.some((b) => b.size && b.size.width === 130), 'token uses a fixed-width box')
  assert.ok(sized.some((b) => b.size && b.size.width === 300 && texts(b).some((s) => s.includes('SOL') && s.includes('%'))), 'header net uses one fitted line')
  assert.ok(run.store['/docs/trading-bot-snapshot.json'], 'cache written')
  assertSetWidgetBeforeComplete(run, 'live success')
  const nameBox = sized.find((b) => b.size && b.size.width === 130)
  assert.ok(nameBox, 'token box')
  assert.equal(nameBox.children[0] && nameBox.children[0].type, 'text')
  assert.equal(nameBox.children[0].align, 'left')
  assert.ok(nameBox.children.some((c) => c.type === 'spacer'), 'spacer after the name left-aligns it')
  const pnlBox = sized.find((b) => b.size && b.size.width === 150 && texts(b).some((s) => s.includes('%')))
  assert.ok(pnlBox && pnlBox.children[0] && pnlBox.children[0].type === 'spacer', 'P/L stays right-aligned')
  assert.ok(live.trades.length <= 6)
  const height = W.estimateHeight(live)
  assert.ok(height <= 340, 'large layout must fit in 340pt, got ' + height)
  ok('runs as a large widget with live data, caches snapshot, sets url/refresh')

  // Offline uses cache
  const cachedRun = await runInScriptable({ snapshot: liveSnapshot, family: 'medium', runsInWidget: true, fetchFails: true, files: { '/docs/trading-bot-snapshot.json': JSON.stringify(liveSnapshot) } })
  assert.ok(texts(cachedRun.calls.setWidget).some((s) => s.includes('SOL')))
  ok('offline falls back to cached snapshot')

  // Offline + no cache -> error widget, no throw
  const errRun = await runInScriptable({ snapshot: liveSnapshot, family: 'large', runsInWidget: true, fetchFails: true })
  assert.ok(texts(errRun.calls.setWidget).some((s) => s.includes('Could not load')))
  ok('offline without cache shows an error widget')

  // Run in app (preview path)
  const appRun = await runInScriptable({ snapshot: liveSnapshot, family: 'large', runsInWidget: false })
  assert.equal(appRun.calls.presented, 'large')
  ok('in-app run previews large')

  if (treeOut) {
    fs.writeFileSync(treeOut, JSON.stringify({ family: 'large', tree: serialize(widget) }, null, 2))
    console.log('wrote tree', treeOut)
  }
  console.log(`\n${results.length} checks passed`)
})().catch((err) => {
  console.error('FAIL', err && err.stack ? err.stack : err)
  process.exit(1)
})
