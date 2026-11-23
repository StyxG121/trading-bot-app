import type { LearningView } from '../lib/normalize.ts'

export function LearningScreen({ learning }: { learning: LearningView }) {
  const empty = !learning.rulesVersion && learning.rules.length === 0 && learning.lessons.length === 0 && learning.topTraders.length === 0
  return (
    <div className="space-y-6 px-4 pt-2 pb-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#8e9890] uppercase">Rules</p>
        <p className="mt-1 text-3xl font-semibold">{learning.rulesVersion ?? '—'}</p>
        <p className="mt-1 text-xs text-[#8e9890]">
          {learning.rulesDate ? learning.rulesDate : 'No rules date'} · paper book
        </p>
      </div>
      {empty ? <p className="text-sm text-[#8e9890]">No lessons yet</p> : null}
      {learning.rules.length > 0 ? (
        <section>
          <h2 className="text-[15px] font-semibold">Key rules</h2>
          <ul className="mt-2 space-y-2">
            {learning.rules.map((rule) => (
              <li key={rule} className="rounded-2xl bg-[#141716] px-3 py-2.5 text-sm leading-snug text-[#d5ddd6]">
                {rule}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="text-[15px] font-semibold">Latest lessons</h2>
        {learning.lessons.length === 0 ? (
          <p className="mt-2 text-sm text-[#8e9890]">No lessons yet</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {learning.lessons.map((lesson) => (
              <li key={lesson} className="text-sm leading-snug text-[#d5ddd6]">
                {lesson}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-[15px] font-semibold">Top traders</h2>
        {learning.topTraders.length === 0 ? (
          <p className="mt-2 text-sm text-[#8e9890]">No top-trader stats yet</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {learning.topTraders.map((trader) => (
              <li key={trader} className="rounded-2xl bg-[#141716] px-3 py-2.5 text-sm leading-snug text-[#d5ddd6]">
                {trader}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
