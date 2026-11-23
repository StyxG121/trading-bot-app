import { ArrowLeftRight, GraduationCap, House, Radar } from 'lucide-react'
import type { Tab } from '../hooks/useRoute.ts'

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'agents', label: 'Agents', icon: Radar },
  { id: 'activity', label: 'Activity', icon: ArrowLeftRight },
  { id: 'learning', label: 'Learning', icon: GraduationCap },
]

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-white/8 bg-[#050605]/95 backdrop-blur">
      <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((item) => {
          const active = tab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-[#3dff7a]' : 'text-[#8e9890]'}`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
