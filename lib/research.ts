import { Composio } from "@composio/core";
import { z } from "zod";
import { serverEnv } from "./env";

const MAX_PAGES = 6;
const MAX_CHARS = 6000;

export const pageSchema = z.object({
  url: z.string(),
  title: z.string(),
  markdown: z.string().min(1),
});

export type ResearchPage = z.infer<typeof pageSchema>;

let composio: Composio | undefined;

async function run(slug: string, args: Record<string, unknown>): Promise<unknown> {
  const env = serverEnv();
  composio ??= new Composio({ apiKey: env.COMPOSIO_API_KEY });
  const res = await composio.tools.execute(slug, {
    userId: env.COMPOSIO_USER_ID,
    arguments: args,
    dangerouslySkipVersionCheck: true,
  });
  if (!res.successful) throw new Error(`${slug} failed: ${res.error ?? "unknown error"}`);
  return res.data;
}

function walk(value: unknown, visit: (obj: Record<string, unknown>) => void) {
  if (Array.isArray(value)) return value.forEach((v) => walk(v, visit));
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    visit(obj);
    Object.values(obj).forEach((v) => walk(v, visit));
  }
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function searchHits(data: unknown): { url: string; title: string }[] {
  const hits: { url: string; title: string }[] = [];
  walk(data, (o) => {
    const url = str(o.url);
    if (url && /^https?:\/\//.test(url)) hits.push({ url, title: str(o.title) ?? url });
  });
  return hits;
}

function scrapeResult(data: unknown): { title?: string; markdown?: string } {
  let markdown: string | undefined;
  let title: string | undefined;
  walk(data, (o) => {
    markdown ??= str(o.markdown);
    title ??= str(o.title);
  });
  return { markdown, title };
}

function dedupe(lists: { url: string; title: string }[][]) {
  const seen = new Set<string>();
  const out: { url: string; title: string }[] = [];
  const longest = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const hit = list[i];
      if (!hit) continue;
      const key = hit.url.replace(/[#?].*$/, "").replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(hit);
    }
  }
  return out;
}

export async function researchApp(name: string): Promise<ResearchPage[]> {
  const queries = [`${name} developer OAuth app registration`, `${name} OAuth app review verification`];
  const results = await Promise.all(queries.map((q) => run("FIRECRAWL_SEARCH", { q, limit: 6 })));
  const targets = dedupe(results.map(searchHits)).slice(0, MAX_PAGES);

  const scraped = await Promise.allSettled(
    targets.map(async (hit) => {
      const data = await run("FIRECRAWL_SCRAPE", {
        url: hit.url,
        formats: ["markdown"],
        onlyMainContent: true,
      });
      const { markdown, title } = scrapeResult(data);
      return pageSchema.parse({
        url: hit.url,
        title: title ?? hit.title,
        markdown: markdown?.slice(0, MAX_CHARS),
      });
    }),
  );

  const pages = scraped.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (pages.length === 0) throw new Error(`No readable documentation pages found for "${name}"`);
  return pages;
}
