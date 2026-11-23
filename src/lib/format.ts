export function formatNum(value: number | null, digits = 6): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const body = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: digits })
  return `${value < 0 ? '−' : ''}${body}`
}

export function formatSol(value: number | null): string {
  return formatNum(value, 6)
}

export function formatSignedSol(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  if (value > 0) return `+${formatSol(value)}`
  return formatSol(value)
}

export function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const body = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${body}%`
}

export function formatPlainPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const body = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
  return `${value < 0 ? '−' : ''}${body}%`
}

export function formatMultiple(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const body = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return `${body}×`
}

export function formatUsd(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const abs = Math.abs(value)
  const digits = abs >= 100 || abs === 0 ? 0 : 2
  const body = abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  const text = `$${body}`
  return value < 0 ? `−${text}` : text
}

export function formatPrice(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  return formatNum(value, 8)
}

/** Drop the year from labels the snapshot already wrote in Vienna time. */
export function shortVienna(label: string | null): string | null {
  if (!label) return null
  return label.replace(/(\d{1,2}\s+[A-Za-z]{3,9})\s+\d{4},/, '$1,')
}

export function formatViennaClock(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms))
}

export function formatViennaStamp(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms))
}
