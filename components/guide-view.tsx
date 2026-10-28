import { SECTIONS, type PartialGuide } from "./sections";

export function GuideView({ guide, streaming }: { guide: PartialGuide; streaming: boolean }) {
  return (
    <article className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{guide.app?.name ?? "Untitled"}</h2>
        {guide.app?.website && (
          <a
            href={guide.app.website}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-zinc-500 hover:underline"
          >
            {guide.app.website}
          </a>
        )}
      </header>
      {SECTIONS.filter((s) => s.ready(guide)).map((s) => (
        <section key={s.key} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{s.title}</h3>
          {s.render(guide)}
        </section>
      ))}
      {streaming && <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />}
    </article>
  );
}
