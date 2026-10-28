import type { ReactNode } from "react";
import type { DeepPartial } from "ai";
import type { Guide } from "@/lib/guide";

export type PartialGuide = DeepPartial<Guide>;

type Section = {
  key: string;
  title: string;
  ready: (g: PartialGuide) => boolean;
  render: (g: PartialGuide) => ReactNode;
};

const present = <T,>(items: (T | undefined)[] | undefined): T[] =>
  (items ?? []).filter((i): i is T => i != null);

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1 pl-5">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

const Pill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
    <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
    <div className="font-medium">{value}</div>
  </div>
);

export const SECTIONS: Section[] = [
  {
    key: "verdict",
    title: "Verdict",
    ready: (g) => g.difficulty?.level != null || g.time?.setup != null,
    render: (g) => (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {g.difficulty?.level != null && (
            <Pill label="Difficulty" value={`${g.difficulty.level} / 5`} />
          )}
          {g.time?.setup != null && <Pill label="Setup" value={g.time.setup} />}
          {g.time?.approvalWait != null && <Pill label="Approval wait" value={g.time.approvalWait} />}
          {g.time?.approvalWait === null && <Pill label="Approval wait" value="None" />}
        </div>
        {g.difficulty?.why && <p>{g.difficulty.why}</p>}
      </div>
    ),
  },
  {
    key: "requirements",
    title: "Before you start",
    ready: (g) => present(g.requirements).length > 0,
    render: (g) => <List items={present(g.requirements)} />,
  },
  {
    key: "agentHelp",
    title: "Who does what",
    ready: (g) =>
      present(g.agentHelp?.canDo).length > 0 || present(g.agentHelp?.youMustDo).length > 0,
    render: (g) => (
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-1 text-sm font-medium text-zinc-500">An agent can</h4>
          <List items={present(g.agentHelp?.canDo)} />
        </div>
        <div>
          <h4 className="mb-1 text-sm font-medium text-zinc-500">You must</h4>
          <List items={present(g.agentHelp?.youMustDo)} />
        </div>
      </div>
    ),
  },
  {
    key: "steps",
    title: "Steps",
    ready: (g) => present(g.steps).length > 0,
    render: (g) => (
      <ol className="space-y-3">
        {present(g.steps).map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
              {i + 1}
            </span>
            <div>
              <div className="font-medium">{s.title}</div>
              {s.detail && <p className="text-zinc-600 dark:text-zinc-400">{s.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    ),
  },
  {
    key: "blockers",
    title: "If you're stuck",
    ready: (g) => present(g.blockers).length > 0,
    render: (g) => (
      <dl className="space-y-3">
        {present(g.blockers).map((b, i) => (
          <div key={i}>
            <dt className="font-medium">{b.problem}</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">{b.fix}</dd>
          </div>
        ))}
      </dl>
    ),
  },
  {
    key: "references",
    title: "References",
    ready: (g) => present(g.references).length > 0,
    render: (g) => (
      <ul className="space-y-1">
        {present(g.references).map((r, i) => (
          <li key={i}>
            {r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              >
                {r.title || r.url}
              </a>
            ) : (
              r.title
            )}
          </li>
        ))}
      </ul>
    ),
  },
];
