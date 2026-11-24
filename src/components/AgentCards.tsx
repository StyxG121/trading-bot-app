import { Binoculars, Gauge, Newspaper, Radar, Shield, Waypoints } from 'lucide-react'
import type { AgentView } from '../lib/normalize.ts'

const ICONS = {
  scanner: Radar,
  analyst: Gauge,
  risk: Shield,
  news: Newspaper,
  scout: Binoculars,
  pattern: Waypoints,
}

export function AgentScroller({
  agents,
  waiting,
  lastScan,
}: {
  agents: AgentView[]
  waiting: boolean
  lastScan: string | null
}) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-baseline justify-between px-4">
        <h2 className="text-[15px] font-semibold">Agents</h2>
        <p className="text-xs text-[#8e9890]">{waiting ? 'Not live yet' : lastScan ? `Last scan ${lastScan}` : 'No scan yet'}</p>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] snap-x [&::-webkit-scrollbar]:hidden">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} waiting={waiting} />
        ))}
      </div>
    </section>
  )
}

export function AgentCard({ agent, waiting, wide = false }: { agent: AgentView; waiting: boolean; wide?: boolean }) {
  const Icon = ICONS[agent.id]
  return (
    <article
      className={`flex shrink-0 snap-start flex-col rounded-[18px] bg-[#141716] p-3 ring-1 ring-white/6 ${wide ? 'w-full' : 'w-[178px]'}`}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-[#3dff7a]/10 text-[#3dff7a]">
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-tight">{agent.name}</h3>
          {agent.pools ? <p className="text-[11px] text-[#8e9890]">{agent.pools} pools</p> : null}
        </div>
      </div>
      {agent.id === 'scanner' && agent.pools ? <ScannerBody agent={agent} /> : null}
      {agent.id === 'analyst' && agent.scoreLabel ? <AnalystBody agent={agent} /> : null}
      {agent.id !== 'scanner' && agent.id !== 'analyst' ? <p className="mt-3 text-sm text-[#c5cdc6]">{fallback(agent, waiting)}</p> : null}
      {agent.id === 'scanner' && !agent.pools ? <p className="mt-3 text-sm text-[#c5cdc6]">{fallback(agent, waiting)}</p> : null}
      {agent.id === 'analyst' && !agent.scoreLabel ? <p className="mt-3 text-sm text-[#c5cdc6]">{fallback(agent, waiting)}</p> : null}
      {wide && agent.log.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-white/8 pt-3">
          {agent.log.map((line, index) => (
            <li key={`${line.time ?? 't'}-${index}`} className="text-[11px] leading-snug text-[#b7c0b8]">
              {line.time ? <span className="text-[#8e9890]">{line.time} · </span> : null}
              {line.text}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function ScannerBody({ agent }: { agent: AgentView }) {
  return (
    <div className="mt-3">
      {agent.verdictLabel ? <p className="text-[11px] text-[#c5cdc6]">{agent.verdictLabel}</p> : null}
      <ul className="mt-1.5 space-y-1">
        {agent.misses.slice(0, 3).map((miss) => (
          <li key={`${miss.token}-${miss.reason ?? ''}`} className="text-[11px] leading-snug text-[#ffb4ba]">
            <span className="font-semibold">{miss.token}</span>
            {miss.score ? <span className="ml-1 tabular-nums">{miss.score}</span> : null}
            {miss.reason ? <span className="ml-1 text-[#ffc9cd]">{miss.reason}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AnalystBody({ agent }: { agent: AgentView }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <ScoreRing score={agent.score} label={agent.scoreLabel} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{agent.scoreToken}</p>
        <p className="line-clamp-3 text-[11px] leading-snug text-[#c5cdc6]">{agent.scoreDetail ?? 'Last score'}</p>
      </div>
    </div>
  )
}

function ScoreRing({ score, label }: { score: number | null; label: string | null }) {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const clamped = score == null ? 0 : Math.max(0, Math.min(100, score))
  const dash = (clamped / 100) * circumference
  const color = clamped < 40 ? '#ff5c6a' : clamped < 70 ? '#f5c542' : '#3dff7a'
  return (
    <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden className="shrink-0">
      <circle cx="29" cy="29" r={radius} stroke="#2a312c" strokeWidth="4.5" fill="none" />
      <circle
        cx="29"
        cy="29"
        r={radius}
        stroke={color}
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform="rotate(-90 29 29)"
      />
      <text x="29" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill="#f3f6f3">
        {label ?? '—'}
      </text>
    </svg>
  )
}

function fallback(agent: AgentView, waiting: boolean): string {
  if (agent.line) return agent.line
  return waiting ? 'Not live yet' : 'No data'
}
