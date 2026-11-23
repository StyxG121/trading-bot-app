import { useState } from 'react'
import { ActivityList } from '../components/ActivityList.tsx'
import type { BookView } from './types.ts'
import type { FeedItem } from '../lib/normalize.ts'

type Filter = 'all' | 'trades' | 'scans'

export function ActivityScreen({ book }: { book: BookView }) {
  const [filter, setFilter] = useState<Filter>('all')
  const items = book.feed.filter((item) => match(filter, item))
  return (
    <div className="pt-2">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-semibold">Activity</h2>
        {!book.live ? <p className="text-xs text-[#8e9890]">Not live yet</p> : null}
      </div>
      <div className="mt-3 flex gap-1 px-4" role="tablist" aria-label="Activity filter">
        {(['all', 'trades', 'scans'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            onClick={() => setFilter(item)}
            className={
              filter === item
                ? 'rounded-full bg-[#3dff7a] px-3 py-1 text-xs font-bold text-[#04140a] capitalize'
                : 'rounded-full px-3 py-1 text-xs font-semibold text-[#8e9890] capitalize'
            }
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-2">
        <ActivityList items={items} detailed />
      </div>
    </div>
  )
}

function match(filter: Filter, item: FeedItem): boolean {
  if (filter === 'all') return true
  if (filter === 'trades') return item.kind === 'bought' || item.kind === 'sold'
  return item.kind === 'scan' || item.kind === 'monitor'
}
