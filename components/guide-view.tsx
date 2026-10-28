"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SECTIONS, type PartialGuide, type Slot as SlotName } from "./sections";

function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      className="h-9 rounded-full px-4"
      onClick={() => {
        void navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? <Check /> : <Link2 />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

export function GuideView({ guide, streaming }: { guide: PartialGuide; streaming: boolean }) {
  return (
    <article aria-busy={streaming}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {guide.app?.name ?? <Skeleton className="h-8 w-40" />}
          </h1>
          {guide.app?.website && (
            <a
              href={guide.app.website}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {guide.app.website}
            </a>
          )}
        </div>
        {!streaming && guide.app?.name && <CopyLink />}
      </header>

      <div className="grid gap-3 lg:grid-cols-12">
        <Slot guide={guide} streaming={streaming} slot="top" className="lg:col-span-12" />
        <Slot guide={guide} streaming={streaming} slot="main" className="lg:col-span-7" stack />
        <Slot guide={guide} streaming={streaming} slot="side" className="lg:col-span-5" stack />
        <Slot guide={guide} streaming={streaming} slot="full" className="lg:col-span-12" />
      </div>
    </article>
  );
}

function Slot({
  guide,
  streaming,
  slot,
  className,
  stack,
}: {
  guide: PartialGuide;
  streaming: boolean;
  slot: SlotName;
  className: string;
  stack?: boolean;
}) {
  const cards = SECTIONS.filter((s) => s.slot === slot && (streaming || s.ready(guide)));
  if (cards.length === 0) return null;
  const body = cards.map((s) => (
    <Card key={s.key} className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{s.title}</CardTitle>
      </CardHeader>
      <CardContent className="h-full px-5 text-sm leading-6">
        {s.ready(guide) ? (
          s.render(guide)
        ) : (
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}
      </CardContent>
    </Card>
  ));
  return stack ? (
    <div className={cn("flex flex-col gap-3 lg:self-start", className)}>{body}</div>
  ) : (
    <div className={cn("grid", className)}>{body}</div>
  );
}
