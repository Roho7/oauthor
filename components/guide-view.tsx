"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SECTIONS, type PartialGuide, type Section } from "./sections";

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

      <div className="grid items-start gap-3 lg:grid-cols-12">
        {cardsIn("full", guide, streaming).slice(0, 1)}
        <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-3">{cardsIn("main", guide, streaming)}</div>
        <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-3">{cardsIn("side", guide, streaming)}</div>
        {cardsIn("full", guide, streaming).slice(1)}
      </div>
    </article>
  );
}

function cardsIn(column: Section["column"], guide: PartialGuide, streaming: boolean) {
  return SECTIONS.filter((s) => s.column === column && (streaming || s.ready(guide))).map((s) => {
    const ready = s.ready(guide);
    return (
      <Card key={s.key} className={cn("gap-4 py-5", s.order, s.column === "full" && "lg:col-span-12")}>
        <CardHeader className="flex flex-row items-baseline justify-between gap-3 px-5">
          <CardTitle className="text-base">{s.title}</CardTitle>
          {ready && s.aside?.(guide)}
        </CardHeader>
        <CardContent className="px-5 text-sm leading-6">
          {ready ? (
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
    );
  });
}
