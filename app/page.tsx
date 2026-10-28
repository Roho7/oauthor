"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuideView } from "@/components/guide-view";
import type { PartialGuide } from "@/components/sections";
import { slugify, type Guide } from "@/lib/guide";
import { getGuide, listCards, type LibraryCard } from "@/lib/store";
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

function statusLine(messages: OAuthorMessage[], busy: boolean): string | null {
  if (!busy) return null;
  const last = messages.at(-1);
  if (last?.role !== "assistant") return "Thinking…";
  const tail = last.parts.at(-1);
  if (tail?.type === "text") return null;
  if (tail?.type.startsWith("tool-")) {
    const done = "state" in tail && (tail.state === "output-available" || tail.state === "output-error");
    const name = tail.type.slice(5) as ToolName;
    if (!done && name in STATUS) return STATUS[name];
  }
  return "Thinking…";
}

function assistantText(messages: OAuthorMessage[]): string {
  const last = messages.at(-1);
  if (last?.role !== "assistant") return "";
  return last.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("").trim();
}

function pushApp(slug: string) {
  if (new URLSearchParams(window.location.search).get("app") !== slug) {
    window.history.pushState(null, "", `?app=${encodeURIComponent(slug)}`);
  }
}

export default function Home() {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error } = useChat<OAuthorMessage>({ transport });
  const [input, setInput] = useState("");
  const [cards, setCards] = useState<LibraryCard[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [hiddenLive, setHiddenLive] = useState<string | null>(null);
  const handledLive = useRef<string | null>(null);

  const busy = status === "submitted" || status === "streaming";
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

  const openGuide = useCallback(async (slug: string, push: boolean) => {
    const guide = await getGuide(slug).catch(() => null);
    setHiddenLive(liveKey.current);
    setOpened({ slug, guide });
    if (push) pushApp(slug);
  }, []);

  useEffect(refreshCards, [refreshCards]);

  useEffect(() => {
    const fromUrl = () => new URLSearchParams(window.location.search).get("app");
    const initial = fromUrl();
    if (initial) void openGuide(initial, false);
    const onPop = () => {
      const slug = fromUrl();
      if (slug) void openGuide(slug, false);
      else setOpened(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [openGuide]);

  useEffect(() => {
    if (!live || live.part.state !== "output-available" || handledLive.current === live.key) return;
    handledLive.current = live.key;
    pushApp(live.part.output.slug);
    refreshCards();
  }, [live, refreshCards]);

  const showLive = live != null && live.key !== hiddenLive && live.part.state !== "output-error";
  const liveGuide = showLive ? (live.part.input as PartialGuide | undefined) : undefined;

  const shown: PartialGuide | undefined = liveGuide ?? opened?.guide ?? undefined;
  const streaming = liveGuide != null && live?.part.state === "input-streaming";
  const activeSlug = liveGuide
    ? liveGuide.app?.name
      ? slugify(liveGuide.app.name)
      : undefined
    : opened?.slug;

  const line = statusLine(messages, busy);
  const text = assistantText(messages);
  const renderFailed = live?.part.state === "output-error" ? live.part.errorText : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value || busy) return;
    setInput("");
    void sendMessage({ text: value }, { body: { openApp: activeSlug } });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-56 pt-8">
      <h1 className="text-xl font-semibold tracking-tight">OAuthor</h1>
      <p className="text-sm text-zinc-500">Know if it&apos;s an hour or six weeks.</p>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Library">
        {cards.map((card) => (
          <button
            key={card.slug}
            onClick={() => void openGuide(card.slug, true)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
              card.slug === activeSlug
                ? "border-zinc-900 dark:border-zinc-100"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            {card.appName}
          </button>
        ))}
        {cards.length === 0 && !libraryError && (
          <span className="text-sm text-zinc-500">No guides yet. Ask about an app below.</span>
        )}
        {libraryError && <span className="text-sm text-red-600">Library unavailable: {libraryError}</span>}
      </nav>

      <main className="mt-8 flex-1">
        {line && <div className="mb-4 animate-pulse text-sm text-zinc-500">{line}</div>}
        {renderFailed && <div className="mb-4 text-sm text-red-600">Could not save the guide: {renderFailed}</div>}
        {shown ? (
          <GuideView guide={shown} streaming={streaming} />
        ) : opened && !opened.guide ? (
          <p className="text-zinc-500">No saved guide for &ldquo;{opened.slug}&rdquo; yet. Ask for one below.</p>
        ) : (
          !line && <p className="text-zinc-500">Pick a guide above, or type an app&apos;s name to generate one.</p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-background/95 backdrop-blur dark:border-zinc-800">
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-3">
          {(text || error) && (
            <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
              {error ? <span className="text-red-600">{error.message}</span> : text}
            </div>
          )}
          <form onSubmit={submit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about an app…"
              className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
