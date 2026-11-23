import puppeteer from 'puppeteer-core'

const base = process.env.APP_URL ?? 'http://127.0.0.1:47291'
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
})

const page = await browser.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

async function text() {
  return page.evaluate(() => document.body.innerText)
}

async function clickNamed(name) {
  const clicked = await page.evaluate((label) => {
    const button = [...document.querySelectorAll('button')].find((el) => el.textContent?.trim().toLowerCase() === label.toLowerCase())
    if (!button) return false
    button.click()
    return true
  }, name)
  if (!clicked) throw new Error(`No button named ${name}`)
}

await page.goto(`${base}/?mode=paper&tab=home`, { waitUntil: 'networkidle0', timeout: 30000 })
await page.waitForFunction(() => document.body.innerText.includes('9.855991'))
await page.evaluate(() => document.fonts.ready)
await new Promise((resolve) => setTimeout(resolve, 400))

const home = await text()
for (const needle of ['9.855991', 'FIONA', 'SIDOOR', '35 pools', '0W', '1L', '6.8 days left', 'Sold FIONA', 'Budget P/L']) {
  if (!home.includes(needle)) throw new Error(`Home paper missing ${needle}`)
}
if (home.includes('2q5aEd')) throw new Error('Paper home leaked the real wallet')

await page.screenshot({ path: '/opt/cursor/artifacts/home-paper.png' })

await page.click('button[role="tab"][aria-selected="false"]')
const liveButton = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((button) => button.textContent === 'LIVE'))
await liveButton.click()
await page.waitForFunction(() => document.body.innerText.includes('No points in this range'))

const week = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((button) => button.textContent === '1W'))
await week.click()
await page.waitForFunction(() => document.body.innerText.includes('22 Nov start'))

await page.click('button[aria-pressed="false"]')
await page.waitForFunction(() => document.body.innerText.includes('Not live yet'))
const real = await text()
for (const needle of ['Not live yet', 'Not live, waiting for go-live', '2q5aEdRPtgBSE1yjauJfz5KHL7Bea1sT1xGBLd2u4SA3', '$400-500', 'Solana (Phantom)', '0', 'SOL']) {
  if (!real.includes(needle)) throw new Error(`Real home missing ${needle}`)
}
if (real.includes('9.855991')) throw new Error('Real home showed the paper bankroll')
await page.screenshot({ path: '/opt/cursor/artifacts/home-real.png' })

await clickNamed('paper')
await page.waitForFunction(() => document.body.innerText.includes('9.855991'))

await clickNamed('Agents')
await page.waitForFunction(() => document.body.innerText.includes('Risk Manager') && document.body.innerText.includes('77.4'))
const agentsText = await text()
for (const needle of ['Scanner', 'Analyst', 'Risk Manager', 'News', 'Scout', 'FIONA', '77.4', 'mint not revoked']) {
  if (needle === 'mint not revoked') {
    if (agentsText.includes(needle)) throw new Error('Invented reject reason on Agents')
    continue
  }
  if (!agentsText.includes(needle)) throw new Error(`Agents missing ${needle}`)
}
await page.screenshot({ path: '/opt/cursor/artifacts/agents.png' })

await clickNamed('Activity')
await page.waitForFunction(() => document.body.innerText.includes('Bought FIONA') && document.body.innerText.includes('Scanned 35'))
const activityText = await text()
if (!activityText.includes('−28.8%') && !activityText.includes('-28.8%')) throw new Error('Activity missing FIONA net percent')
if (!activityText.includes('5% of stack')) throw new Error('Activity missing stack percent')
await page.screenshot({ path: '/opt/cursor/artifacts/activity.png' })

await clickNamed('Learning')
await page.waitForFunction(() => document.body.innerText.includes('v3') && document.body.innerText.includes('Mr. Frog'))

await page.click('button[aria-label="Settings"]')
await page.waitForFunction(() => document.body.innerText.includes('Add to Home Screen'))
await page.keyboard.press('Escape')

const ready = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready
  return { scope: reg.scope, script: reg.active?.scriptURL ?? null, state: reg.active?.state ?? null }
})
if (!ready.script?.endsWith('/sw.js')) throw new Error(`Service worker not active: ${JSON.stringify(ready)}`)
await page.reload({ waitUntil: 'networkidle0' })
const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller))
if (!controlled) throw new Error('Service worker is not controlling the page')

const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]')
  const response = await fetch(link.href)
  return response.json()
})
if (manifest.display !== 'standalone') throw new Error('Manifest is not standalone')
if (manifest.name !== 'Trading Bot') throw new Error('Manifest name mismatch')
const sizes = new Set((manifest.icons ?? []).map((icon) => icon.sizes))
if (!sizes.has('192x192') || !sizes.has('512x512')) throw new Error(`Manifest icons ${[...sizes].join(',')}`)

if (errors.length) throw new Error(`Console errors:\n${errors.join('\n')}`)
console.log('verified', { ready, controlled, manifest: manifest.display })
await browser.close()
