import { useEffect, useState } from 'react'
import { fetchSolUsd } from '../lib/price.ts'

export function useSolPrice(): number | null {
  const [price, setPrice] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void fetchSolUsd().then((next) => {
        if (!cancelled) setPrice(next)
      })
    }
    load()
    const timer = window.setInterval(load, 60_000)
    const onFocus = () => load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return price
}
