import type { ReactNode } from "react";
import type { DeepPartial } from "ai";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Guide } from "@/lib/guide";
import { cn } from "@/lib/utils";

export type PartialGuide = DeepPartial<Guide>;

export type Section = {
  key: string;
  title: string;
  column: "full" | "main" | "side";
  order: string;
  ready: (g: PartialGuide) => boolean;
  aside?: (g: PartialGuide) => ReactNode;
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

function AgentBadge() {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-signal-soft pr-2.5 pl-2 text-xs font-medium text-signal">
      <Sparkles className="size-3.5" aria-hidden />
      AI can do this
    </span>
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
    column: "full",
    order: "order-0",
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
    column: "side",
    order: "order-1",
    ready: (g) => present(g.requirements).length > 0,
    render: (g) => <Bullets items={present(g.requirements)} />,
  },
  {
    key: "steps",
    title: "Steps",
    column: "main",
    order: "order-2",
    ready: (g) => present(g.steps).length > 0,
    aside: (g) => {
      const steps = present(g.steps);
      const automatable = steps.filter((s) => s.agentCompatible).length;
      return automatable > 0 ? (
        <span className="text-xs text-muted-foreground tnum">
          {automatable} of {steps.length} can be automated
        </span>
      ) : null;
    },
    render: (g) => (
      <ol className="space-y-1">
        {present(g.steps).map((s, i) => (
          <li key={i} className="flex gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-muted">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium tnum">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <p className="font-medium">{s.title}</p>
                {s.agentCompatible && <AgentBadge />}
              </div>
              {s.detail && <p className="mt-1 text-muted-foreground">{s.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    ),
  },
  {
    key: "issues",
    title: "Where people get stuck",
    column: "side",
    order: "order-3",
    ready: (g) => present(g.issues).length > 0,
    render: (g) => (
      <Accordion className="gap-2">
        {present(g.issues).map((issue, i) => (
          <AccordionItem key={i} value={i} className="rounded-xl bg-muted px-4">
            <AccordionTrigger className="gap-3 py-3.5 hover:no-underline">{issue.problem}</AccordionTrigger>
            <AccordionContent className="pb-4 text-muted-foreground">{issue.fix}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    ),
  },
  {
    key: "references",
    title: "Sources",
    column: "full",
    order: "order-4 lg:order-none",
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
