import { threads } from '../data/seed'

export function MessagesPage() {
  return (
    <div className="shell py-8">
      <p className="text-xs uppercase tracking-[0.18em] text-mist">Inbox</p>
      <h1 className="mt-2 font-display text-4xl text-paper">Deal threads</h1>
      <p className="mt-2 max-w-xl text-muted">
        Buyer ↔ agent ↔ lawyer stay on one thread with the fee sheet attached — fewer off-platform
        “settlement” surprises.
      </p>

      <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel/50">
        {threads.map((t) => (
          <li key={t.id} className="flex cursor-pointer items-start justify-between gap-4 px-4 py-4 hover:bg-ink-soft/60">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-paper">{t.title}</p>
                {t.unread > 0 && (
                  <span className="rounded-md bg-laterite px-1.5 py-0.5 text-[10px] font-bold text-ink">
                    {t.unread}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{t.preview}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-mist">{t.roleLabel}</p>
            </div>
            <time className="shrink-0 text-xs text-muted">
              {new Date(t.updatedAt).toLocaleDateString('en-NG', {
                month: 'short',
                day: 'numeric',
              })}
            </time>
          </li>
        ))}
      </ul>
    </div>
  )
}
