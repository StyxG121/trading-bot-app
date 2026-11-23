const DATA_URL = 'trading-bot:data-url'
const SHOW_USD = 'trading-bot:show-usd'
const MODE = 'trading-bot:mode'

export function defaultDataUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}data/snapshot.json`
}

export function resolveDataUrl(): { url: string; source: 'query' | 'storage' | 'default' } {
  const query = new URLSearchParams(window.location.search).get('data')?.trim()
  if (query) return { url: query, source: 'query' }
  const stored = localStorage.getItem(DATA_URL)?.trim()
  if (stored) return { url: stored, source: 'storage' }
  return { url: defaultDataUrl(), source: 'default' }
}

export function saveDataUrl(next: string) {
  const trimmed = next.trim()
  if (!trimmed || trimmed === defaultDataUrl()) localStorage.removeItem(DATA_URL)
  else localStorage.setItem(DATA_URL, trimmed)
  const params = new URLSearchParams(window.location.search)
  params.delete('data')
  const query = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  window.dispatchEvent(new Event('tb-data-changed'))
}

export function readShowUsd(): boolean {
  return localStorage.getItem(SHOW_USD) !== '0'
}

export function writeShowUsd(show: boolean) {
  localStorage.setItem(SHOW_USD, show ? '1' : '0')
}

export function readMode(): 'paper' | 'real' {
  return localStorage.getItem(MODE) === 'real' ? 'real' : 'paper'
}

export function writeMode(mode: 'paper' | 'real') {
  localStorage.setItem(MODE, mode)
}
