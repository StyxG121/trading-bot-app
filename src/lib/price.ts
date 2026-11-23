const SOL_MINT = 'So11111111111111111111111111111111111111112'

function asUsd(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

async function fromCoinGecko(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { cache: 'no-store' },
    )
    if (!response.ok) return null
    const json: unknown = await response.json()
    const row = obj(json)?.solana
    return asUsd(obj(row)?.usd)
  } catch {
    return null
  }
}

async function fromJupiter(): Promise<number | null> {
  try {
    const response = await fetch(`https://lite-api.jup.ag/price/v3?ids=${SOL_MINT}`, { cache: 'no-store' })
    if (!response.ok) return null
    const json: unknown = await response.json()
    return asUsd(obj(obj(json)?.[SOL_MINT])?.usdPrice)
  } catch {
    return null
  }
}

function obj(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export async function fetchSolUsd(): Promise<number | null> {
  const gecko = await fromCoinGecko()
  if (gecko != null) return gecko
  return fromJupiter()
}
