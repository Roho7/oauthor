import type { ReactNode } from "react";
import type { DeepPartial } from "ai";
import { ArrowUpRight } from "lucide-react";
import type { Guide } from "@/lib/guide";
import { cn } from "@/lib/utils";

export type PartialGuide = DeepPartial<Guide>;

export type Slot = "top" | "main" | "side" | "full";

type Section = {
  key: string;
  title: string;
  slot: Slot;
  ready: (g: PartialGuide) => boolean;
  render: (g: PartialGuide) => ReactNode;
};

const present = <T,>(items: (T | undefined)[] | undefined): T[] =>
  (items ?? []).filter((i): i is T => i != null);

export function DifficultyMeter({ level, className }: { level: number; className?: string }) {
  return (
    <div className={cn("flex gap-1", className)} role="img" aria-label={`Difficulty ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn("h-2 flex-1 rounded-full", n <= level ? "bg-signal" : "bg-secondary")} />
      ))}
    </div>
  );
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="space-y-2.5">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3">
        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/30" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const SECTIONS: Section[] = [
  {
    key: "verdict",
    title: "Verdict",
    slot: "top",
    ready: (g) => g.difficulty?.level != null,
    render: (g) => {
      const level = g.difficulty?.level ?? 0;
      return (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <p className="text-[30px] leading-none font-semibold tracking-tight tnum">
              {level}
              <span className="text-base font-normal text-muted-foreground"> of 5 difficulty</span>
            </p>
            <DifficultyMeter level={level} />
            {g.difficulty?.why && <p className="text-[15px] leading-6">{g.difficulty.why}</p>}
          </div>
          <dl className="grid content-start gap-3 lg:col-span-5">
            <div className="rounded-xl bg-muted px-4 py-3">
              <dt className="text-xs text-muted-foreground">Hands-on setup</dt>
              <dd className="mt-1 text-lg leading-snug font-medium">{g.time?.setup ?? "…"}</dd>
            </div>
            <div className="rounded-xl bg-muted px-4 py-3">
              <dt className="text-xs text-muted-foreground">Waiting on the provider</dt>
              <dd className="mt-1 text-lg leading-snug font-medium">
                {g.time == null ? "…" : (g.time.approvalWait ?? "No review step")}
              </dd>
            </div>
          </dl>
        </div>
      );
    },
  },
  {
    key: "requirements",
    title: "Before you start",
    slot: "main",
    ready: (g) => present(g.requirements).length > 0,
    render: (g) => <Bullets items={present(g.requirements)} />,
  },
  {
    key: "agentHelp",
    title: "Who does what",
    slot: "side",
    ready: (g) => present(g.agentHelp?.canDo).length > 0 || present(g.agentHelp?.youMustDo).length > 0,
    render: (g) => (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-xl bg-muted p-4">
          <h4 className="mb-3 text-sm font-medium">An agent can</h4>
          <Bullets items={present(g.agentHelp?.canDo)} />
        </div>
        <div className="rounded-xl bg-muted p-4">
          <h4 className="mb-3 text-sm font-medium">You have to</h4>
          <Bullets items={present(g.agentHelp?.youMustDo)} />
        </div>
      </div>
    ),
  },
  {
    key: "steps",
    title: "Steps",
    slot: "main",
    ready: (g) => present(g.steps).length > 0,
    render: (g) => (
      <ol className="space-y-1">
        {present(g.steps).map((s, i) => (
          <li key={i} className="flex gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-muted">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium tnum">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-medium">{s.title}</p>
              {s.detail && <p className="mt-1 text-muted-foreground">{s.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    ),
  },
  {
    key: "blockers",
    title: "If you're stuck",
    slot: "side",
    ready: (g) => present(g.blockers).length > 0,
    render: (g) => (
      <dl className="space-y-3">
        {present(g.blockers).map((b, i) => (
          <div key={i} className="rounded-xl bg-muted p-4">
            <dt className="font-medium">{b.problem}</dt>
            <dd className="mt-1.5 text-muted-foreground">{b.fix}</dd>
          </div>
        ))}
      </dl>
    ),
  },
  {
    key: "references",
    title: "Sources",
    slot: "full",
    ready: (g) => present(g.references).length > 0,
    render: (g) => (
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {present(g.references).map((r, i) => (
          <li key={i}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full items-start justify-between gap-3 rounded-xl bg-muted px-4 py-3 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="min-w-0">
                <span className="line-clamp-2 font-medium">{r.title || r.url}</span>
                {r.url && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{hostOf(r.url)}</span>}
              </span>
              <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </li>
        ))}
      </ul>
    ),
  },
];
