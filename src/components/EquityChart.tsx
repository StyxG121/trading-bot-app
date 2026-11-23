import { useId, useState } from 'react'
import { formatSignedSol, formatSol } from '../lib/format.ts'
import { defaultRange, pointsInRange, type EquityPoint, type RangeKey } from '../lib/normalize.ts'

const RANGES: { id: RangeKey; label: string }[] = [
  { id: 'live', label: 'LIVE' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
]

export function EquityChart({
  points,
  anchor,
  emptyLabel,
}: {
  points: EquityPoint[]
  anchor: number | null
  emptyLabel?: string
}) {
  const [range, setRange] = useState<RangeKey>(() => defaultRange(points, anchor))
  const visible = pointsInRange(points, range, anchor)
  const up = visible.length >= 2 ? visible[visible.length - 1].value >= visible[0].value : true
  const stroke = up ? '#3dff7a' : '#ff5c6a'
  const gradientId = useId().replace(/:/g, '')

  return (
    <section className="mt-3" aria-label="Equity">
      <div className="relative h-[132px] px-3">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-[#8e9890]">
            {emptyLabel ?? 'No points in this range'}
          </div>
        ) : (
          <ChartSvg points={visible} stroke={stroke} gradientId={gradientId} />
        )}
      </div>
      {visible.length > 0 && visible.length <= 4 ? (
        <div className="mt-1 flex justify-between gap-3 px-4 text-[10px] text-[#8e9890]">
          <span className="truncate">{visible[0]?.label}</span>
          {visible.length > 1 ? <span className="truncate text-right">{visible[visible.length - 1]?.label}</span> : null}
        </div>
      ) : null}
      <div className="mt-2 flex items-center gap-1 px-3" role="tablist" aria-label="Equity range">
        {RANGES.map((item) => {
          const active = item.id === range
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setRange(item.id)}
              className={
                active
                  ? 'rounded-full bg-[#3dff7a] px-3 py-1 text-xs font-bold text-[#04140a]'
                  : 'rounded-full px-2.5 py-1 text-xs font-semibold text-[#8e9890]'
              }
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ChartSvg({ points, stroke, gradientId }: { points: EquityPoint[]; stroke: string; gradientId: string }) {
  const width = 360
  const height = 132
  const timed = points.every((point) => point.t != null)
  const minT = timed ? Math.min(...points.map((point) => point.t ?? 0)) : 0
  const maxT = timed ? Math.max(...points.map((point) => point.t ?? 0)) : Math.max(points.length - 1, 1)
  const minV = Math.min(...points.map((point) => point.value))
  const maxV = Math.max(...points.map((point) => point.value))
  const span = maxV - minV || Math.max(Math.abs(maxV) * 0.02, 0.01)
  const y0 = minV - span * 0.22
  const y1 = maxV + span * 0.28

  const coords = points.map((point, index) => {
    const xRaw = timed ? ((point.t ?? minT) - minT) / (maxT - minT || 1) : index / Math.max(points.length - 1, 1)
    return {
      x: 16 + xRaw * (width - 36),
      y: 18 + (1 - (point.value - y0) / (y1 - y0)) * (height - 36),
      value: point.value,
    }
  })

  const line = smoothPath(coords)
  const area = `${line} L ${coords[coords.length - 1]?.x ?? 0} ${height} L ${coords[0]?.x ?? 0} ${height} Z`
  const last = coords[coords.length - 1]
  const first = coords[0]
  const delta = last && first ? last.value - first.value : null
  const callout = delta != null && points.length >= 2 ? formatSignedSol(delta) : null

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={aria(points)}>
      <line x1="16" x2={width - 16} y1={height - 18} y2={height - 18} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 4" />
      {points.length >= 2 ? (
        <>
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        </>
      ) : null}
      {coords.map((coord, index) => (
        <circle key={index} cx={coord.x} cy={coord.y} r={index === coords.length - 1 ? 4 : 2.5} fill={stroke} />
      ))}
      {callout && last ? (
        <g transform={`translate(${Math.min(last.x - 8, width - 92)}, ${Math.max(last.y - 28, 8)})`}>
          <rect width="84" height="20" rx="10" fill="#101411" stroke="rgba(255,255,255,0.08)" />
          <text x="42" y="14" textAnchor="middle" fontSize="11" fontWeight="650" fill={stroke}>
            {callout}
          </text>
        </g>
      ) : null}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function aria(points: EquityPoint[]): string {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return 'No equity points'
  if (points.length === 1) return `Equity ${formatSol(first.value)} SOL`
  return `Equity from ${formatSol(first.value)} to ${formatSol(last.value)} SOL`
}

function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return ''
  const first = coords[0]
  if (!first) return ''
  if (coords.length === 1) return `M ${first.x} ${first.y}`
  let path = `M ${first.x} ${first.y}`
  for (let index = 0; index < coords.length - 1; index += 1) {
    const p0 = coords[index - 1] ?? coords[index]
    const p1 = coords[index]
    const p2 = coords[index + 1]
    const p3 = coords[index + 2] ?? p2
    if (!p0 || !p1 || !p2 || !p3) continue
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return path
}
