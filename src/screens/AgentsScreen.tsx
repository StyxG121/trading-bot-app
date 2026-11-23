import { AgentCard } from '../components/AgentCards.tsx'
import type { BookView } from './types.ts'

export function AgentsScreen({ book }: { book: BookView }) {
  return (
    <div className="space-y-3 px-4 pt-2 pb-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Agents</h2>
        <p className="text-xs text-[#8e9890]">
          {book.live ? (book.lastScanLabel ? `Last scan ${book.lastScanLabel}` : 'No scan yet') : 'Not live yet'}
        </p>
      </div>
      {book.agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} waiting={!book.live} wide />
      ))}
    </div>
  )
}
