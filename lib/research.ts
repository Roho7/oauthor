import { z } from "zod";
import { createCrawler, type Crawler, type SearchHit } from "./crawler";
import { serverEnv } from "./env";

const MAX_PAGES = 6;
const MAX_CHARS = 8000;

export const pageSchema = z.object({
  url: z.string(),
  title: z.string(),
  markdown: z.string().min(1),
});

export type ResearchPage = z.infer<typeof pageSchema>;

let crawler: Crawler | undefined;

const LINK_ONLY_LINE = /^\s*(?:[-*+]|\d+\.)?\s*\[[^\]]*\]\([^)]*\)\s*$/;

export function readableMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !LINK_ONLY_LINE.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_CHARS);
}

function dedupe(lists: SearchHit[][]) {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
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
  const c = (crawler ??= createCrawler(serverEnv().crawler));
  const queries = [`${name} developer OAuth app registration`, `${name} OAuth app review verification`];
  const results = await Promise.all(queries.map((q) => c.search(q, 6)));
  const targets = dedupe(results).slice(0, MAX_PAGES);

  const scraped = await Promise.allSettled(
    targets.map(async (hit) => {
      const { markdown, title } = await c.scrape(hit.url);
      return pageSchema.parse({ url: hit.url, title: title ?? hit.title, markdown: markdown && readableMarkdown(markdown) });
    }),
  );

  const pages = scraped.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (pages.length === 0) throw new Error(`No readable documentation pages found for "${name}"`);
  return pages;
}
