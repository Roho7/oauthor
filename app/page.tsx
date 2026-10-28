"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Check, Loader2, X } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { GuideView } from "@/components/guide-view";
import { DifficultyMeter, type PartialGuide } from "@/components/sections";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { slugify, type Guide } from "@/lib/guide";
import { getGuide, listCards, type LibraryCard } from "@/lib/store";
import { HOME_THREAD, loadThread, moveThread, saveThread } from "@/lib/threads";
import type { OAuthorMessage, OAuthorTools } from "@/lib/tools";

type ToolName = keyof OAuthorTools;
type RenderPart = Extract<OAuthorMessage["parts"][number], { type: "tool-render_guide" }>;

const STATUS: Record<ToolName, string> = {
  get_guide: "Checking library…",
  research_app: "Reading docs…",
  render_guide: "Writing guide…",
};

type Opened = { slug: string; guide: Guide | null };

function latestRenderPart(messages: OAuthorMessage[]) {
  for (let m = messages.length - 1; m >= 0; m--) {
    const parts = messages[m].parts;
    for (let p = parts.length - 1; p >= 0; p--) {
      const part = parts[p];
      if (part.type === "tool-render_guide") {
        return { key: `${messages[m].id}:${part.toolCallId}`, part: part as RenderPart };
      }
    }
  }
  return null;
}

type Line = { id: string; role: "user" | "assistant"; text: string };

function threadLines(messages: OAuthorMessage[]): Line[] {
  return messages.flatMap((m) => {
    if (m.role !== "user" && m.role !== "assistant") return [];
    const text = m.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("").trim();
    return text ? [{ id: m.id, role: m.role, text }] : [];
  });
}

function pushApp(slug: string) {
  if (new URLSearchParams(window.location.search).get("app") !== slug) {
    window.history.pushState(null, "", `?app=${encodeURIComponent(slug)}`);
  }
}

export default function Home() {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, setMessages, status, error } = useChat<OAuthorMessage>({ transport });
  const [threadKey, setThreadKey] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const pendingMove = useRef<string | null>(null);
  const threadBox = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [input, setInput] = useState("");
  const [cards, setCards] = useState<LibraryCard[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [hiddenLive, setHiddenLive] = useState<string | null>(null);
  const handledLive = useRef<string | null>(null);

  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  const live = latestRenderPart(messages);

  const refreshCards = useCallback(() => {
    listCards().then(
      (c) => {
        setCards(c);
        setLibraryError(null);
      },
      (e: unknown) => setLibraryError((e instanceof Error && e.message) || "request failed"),
    );
  }, []);

  const liveKey = useRef<string | null>(null);
  useEffect(() => {
    liveKey.current = live?.key ?? null;
  }, [live?.key]);

  const switchThread = useCallback(
    (key: string) =>
      loadThread(key).then((loaded) => {
        if (busyRef.current) return;
        setMessages(loaded);
        setThreadKey(key);
      }),
    [setMessages],
  );

  const openGuide = useCallback(
    async (slug: string, push: boolean) => {
      const guide = await getGuide(slug).catch(() => null);
      setHiddenLive(liveKey.current);
      setOpened({ slug, guide });
      if (push) pushApp(slug);
      void switchThread(slug);
    },
    [switchThread],
  );

  useEffect(refreshCards, [refreshCards]);

  useEffect(() => {
    const fromUrl = () => new URLSearchParams(window.location.search).get("app");
    const initial = fromUrl();
    if (initial) void openGuide(initial, false);
    else void switchThread(HOME_THREAD);
    const onPop = () => {
      const slug = fromUrl();
      if (slug) void openGuide(slug, false);
      else {
        setOpened(null);
        void switchThread(HOME_THREAD);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [openGuide, switchThread]);

  useEffect(() => {
    if (!live || live.part.state !== "output-available" || handledLive.current === live.key) return;
    handledLive.current = live.key;
    pushApp(live.part.output.slug);
    pendingMove.current = live.part.output.slug;
    refreshCards();
  }, [live, refreshCards]);

  useEffect(() => {
    if (!threadKey || busy || messages.length === 0) return;
    const target = pendingMove.current;
    pendingMove.current = null;
    if (target && threadKey === HOME_THREAD) {
      void moveThread(HOME_THREAD, target, messages);
      setThreadKey(target);
    } else {
      void saveThread(threadKey, messages);
    }
  }, [messages, busy, threadKey]);

  const lines = threadLines(messages);
  const lastLine = lines.at(-1)?.text;
  const stepsKey = progress(messages, busy)?.map((st) => st.state).join();
  useEffect(() => {
    const box = threadBox.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [lines.length, lastLine, chatOpen, stepsKey]);

  const showLive = live != null && live.key !== hiddenLive && live.part.state !== "output-error";
  const liveGuide = showLive ? (live.part.input as PartialGuide | undefined) : undefined;

  const shown: PartialGuide | undefined = liveGuide ?? opened?.guide ?? undefined;
  const streaming = liveGuide != null && live?.part.state === "input-streaming";
  const activeSlug = liveGuide
    ? liveGuide.app?.name
      ? slugify(liveGuide.app.name)
      : undefined
    : opened?.slug;

  const goHome = () => {
    setOpened(null);
    setHiddenLive(liveKey.current);
    window.history.pushState(null, "", window.location.pathname);
    void switchThread(HOME_THREAD);
  };
  const renderFailed = live?.part.state === "output-error" ? live.part.errorText : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value || busy) return;
    setInput("");
    setChatOpen(true);
    void sendMessage({ text: value }, { body: { openApp: activeSlug } });
  };

  const steps = progress(messages, busy);

  return (
    <div className="min-h-screen pb-48">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-6 sm:px-6">
        <button
          onClick={goHome}
          className="text-[15px] font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          OAuthor
        </button>
        <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 py-1" aria-label="Library">
          {cards.map((card) => (
            <button
              key={card.slug}
              onClick={() => void openGuide(card.slug, true)}
              aria-current={card.slug === activeSlug ? "page" : undefined}
              className={cn(
                "flex h-8 shrink-0 items-center gap-2 rounded-full pr-3.5 pl-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                card.slug === activeSlug
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <AppLogo name={card.appName} className="size-4 bg-transparent" />
              {card.appName}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
        {renderFailed && (
          <Card className="mb-3 py-4">
            <CardContent className="px-5 text-sm text-destructive">Could not save the guide: {renderFailed}</CardContent>
          </Card>
        )}
        {shown ? (
          <GuideView guide={shown} streaming={streaming} />
        ) : opened && !opened.guide ? (
          <EmptyGuide slug={opened.slug} onAsk={(v) => setInput(v)} />
        ) : (
          (
            <Library
              cards={cards}
              error={libraryError}
              onOpen={(slug) => void openGuide(slug, true)}
              onTry={(app) => setInput(`Write the OAuth setup guide for ${app}`)}
            />
          )
        )}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 px-4 pb-5 sm:px-6">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl space-y-3">
          {chatOpen && (lines.length > 0 || error || steps) && (
            <div className="relative rounded-2xl bg-card shadow-float">
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Close conversation"
                className="absolute -top-2.5 -right-2.5 z-10 flex size-7 items-center justify-center rounded-full bg-card text-muted-foreground shadow-float transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3.5" />
              </button>
              <div ref={threadBox} className="max-h-48 space-y-3 overflow-y-auto px-5 py-4 text-sm leading-6" aria-live="polite">
                {lines.map((line) =>
                  line.role === "user" ? (
                    <p key={line.id} className="ml-auto w-fit max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 whitespace-pre-wrap">
                      {line.text}
                    </p>
                  ) : (
                    <p key={line.id} className="max-w-[92%] whitespace-pre-wrap">
                      {line.text}
                    </p>
                  ),
                )}
                {steps && <Progress steps={steps} />}
                {error && <p className="text-destructive">{error.message}</p>}
              </div>
            </div>
          )}
          <form onSubmit={submit} className="flex items-center gap-2 rounded-full bg-card p-1.5 pl-5 shadow-float">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setChatOpen(true)}
              placeholder={activeSlug ? "Ask about this guide" : "Name any app, like Zoom"}
              aria-label="Ask about an app"
              className="h-10 flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
            />
            <Button type="submit" disabled={busy || !input.trim()} size="icon" className="size-10 rounded-full" aria-label="Send">
              {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

type Step = { label: string; state: "done" | "active" | "todo" };

function progress(messages: OAuthorMessage[], busy: boolean): Step[] | null {
  if (!busy) return null;
  const last = messages.at(-1);
  const parts = last?.role === "assistant" ? last.parts : [];
  const seen = (name: ToolName) => parts.some((p) => p.type === `tool-${name}`);
  const order: ToolName[] = ["get_guide", "research_app", "render_guide"];
  const current = [...order].reverse().find(seen);
  const idx = current ? order.indexOf(current) : -1;
  if (idx === -1 && parts.some((p) => p.type === "text")) return null;
  return order.map((name, i) => ({
    label: STATUS[name],
    state: i < idx ? "done" : i === idx || (idx === -1 && i === 0) ? "active" : "todo",
  }));
}

function Progress({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl bg-muted px-3.5 py-2.5 text-[13px]">
      {steps.map((step) => (
        <span
          key={step.label}
          className={cn("flex items-center gap-1.5", step.state === "todo" ? "text-muted-foreground" : "text-foreground")}
        >
          {step.state === "done" ? (
            <Check className="size-3.5 text-muted-foreground" />
          ) : step.state === "active" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <span className="mx-1 size-1.5 rounded-full bg-foreground/25" />
          )}
          {step.label.replace("…", "")}
        </span>
      ))}
    </div>
  );
}

const SUGGESTIONS = ["Meta Ads", "Gmail", "Twitter/X", "HubSpot", "Zoom", "Notion"];

function Library({
  cards,
  error,
  onOpen,
  onTry,
}: {
  cards: LibraryCard[];
  error: string | null;
  onOpen: (slug: string) => void;
  onTry: (app: string) => void;
}) {
  const saved = new Set(cards.map((c) => c.slug));
  return (
    <section>
      <div className="mb-5 px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Get a clear idea on OAuth setups</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          What it takes to register an OAuth app with a provider and get it approved. Open a guide, or name any app below.
        </p>
      </div>
      {error && (
        <Card className="py-4">
          <CardContent className="px-5 text-sm text-destructive">Library unavailable: {error}</CardContent>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.slug}
            onClick={() => onOpen(card.slug)}
            role="button"
            className="group cursor-pointer rounded-2xl bg-card p-5 text-left shadow-soft transition-shadow hover:shadow-float focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2.5 text-base font-semibold">
                <AppLogo name={card.appName} className="size-8 rounded-lg bg-card text-sm shadow-soft" />
                {card.appName}
              </span>
              <span className="text-sm text-muted-foreground tnum">{card.level} of 5</span>
            </div>
            <DifficultyMeter level={card.level} className="mt-3" />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Setup</dt>
                <dd className="mt-0.5 line-clamp-2">{card.setup}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Review</dt>
                <dd className="mt-0.5 line-clamp-2">{card.approvalWait ?? "None"}</dd>
              </div>
            </dl>
          </button>
        ))}
        {cards.length === 0 && !error && (
          <Card className="py-5 sm:col-span-2 lg:col-span-4">
            <CardContent className="px-5 text-sm text-muted-foreground">
              No guides yet. Name an app below and the first one is written while you watch.
            </CardContent>
          </Card>
        )}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="gap-4 py-5 lg:col-span-2">
          <CardContent className="px-5">
            <h2 className="text-base font-medium">How a guide is made</h2>
            <ol className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-3">
              {[
                ["Checks the library", "A saved guide opens instantly, with nothing re-fetched."],
                ["Reads the provider's docs", "Two searches, then up to six developer pages read in full."],
                ["Writes it here", "Each box fills in as it is written, then the guide gets its own link."],
              ].map(([title, detail], i) => (
                <li key={title} className="rounded-xl bg-muted p-4">
                  <span className="flex size-7 items-center justify-center rounded-full bg-card text-xs font-medium tnum shadow-soft">
                    {i + 1}
                  </span>
                  <p className="mt-3 font-medium">{title}</p>
                  <p className="mt-1 text-muted-foreground">{detail}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">Get a full OAuth setup guide in under a minute.</p>
          </CardContent>
        </Card>
        <Card className="gap-4 py-5">
          <CardContent className="px-5">
            <h2 className="text-base font-medium">Try another app</h2>
            <p className="mt-1 text-sm text-muted-foreground">Get started with one of these apps.</p>
            <ul className="mt-4 space-y-1">
              {SUGGESTIONS.filter((app) => !saved.has(slugify(app))).map((app) => (
                <li key={app}>
                  <button
                    onClick={() => onTry(app)}
                    className="group flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {app}
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function EmptyGuide({ slug, onAsk }: { slug: string; onAsk: (value: string) => void }) {
  return (
    <Card className="py-6">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">No guide for {slug} yet</h1>
          <p className="mt-1 text-sm text-muted-foreground">It takes about a minute to research and write one.</p>
        </div>
        <Button className="h-9 rounded-full px-4" onClick={() => onAsk(`Write the OAuth setup guide for ${slug}`)}>
          Write it
        </Button>
      </CardContent>
    </Card>
  );
}
