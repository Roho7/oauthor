import { Composio } from "@composio/core";
import { z } from "zod";
import type { CrawlerConfig } from "./env";

export type SearchHit = { url: string; title: string };
export type ScrapedPage = { title?: string; markdown?: string };

export type Crawler = {
  search(query: string, limit: number): Promise<SearchHit[]>;
  scrape(url: string): Promise<ScrapedPage>;
};

const FIRECRAWL_API = "https://api.firecrawl.dev/v2";

const firecrawlSearchSchema = z.object({
  data: z.object({ web: z.array(z.object({ url: z.string(), title: z.string().optional() })).default([]) }),
});

const firecrawlScrapeSchema = z.object({
  data: z.object({
    markdown: z.string().optional(),
    metadata: z.object({ title: z.string().optional() }).optional(),
  }),
});

function firecrawl(apiKey: string): Crawler {
  async function post(path: string, body: object): Promise<unknown> {
    const res = await fetch(`${FIRECRAWL_API}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Firecrawl ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  return {
    async search(query, limit) {
      const { data } = firecrawlSearchSchema.parse(await post("/search", { query, limit }));
      return data.web.map((hit) => ({ url: hit.url, title: hit.title ?? hit.url }));
    },
    async scrape(url) {
      const { data } = firecrawlScrapeSchema.parse(
        await post("/scrape", { url, formats: ["markdown"], onlyMainContent: true }),
      );
      return { markdown: data.markdown, title: data.metadata?.title };
    },
  };
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

function composio(apiKey: string): Crawler {
  const client = new Composio({ apiKey });

  async function run(slug: string, args: Record<string, unknown>): Promise<unknown> {
    const res = await client.tools.execute(slug, { arguments: args, dangerouslySkipVersionCheck: true });
    if (!res.successful) throw new Error(`${slug} failed: ${res.error ?? "unknown error"}`);
    return res.data;
  }

  return {
    async search(query, limit) {
      const hits: SearchHit[] = [];
      walk(await run("FIRECRAWL_SEARCH", { q: query, limit }), (o) => {
        const url = str(o.url);
        if (url && /^https?:\/\//.test(url)) hits.push({ url, title: str(o.title) ?? url });
      });
      return hits;
    },
    async scrape(url) {
      const page: ScrapedPage = {};
      walk(await run("FIRECRAWL_SCRAPE", { url, formats: ["markdown"], onlyMainContent: true }), (o) => {
        page.markdown ??= str(o.markdown);
        page.title ??= str(o.title);
      });
      return page;
    },
  };
}

export function createCrawler(config: CrawlerConfig): Crawler {
  return config.kind === "firecrawl" ? firecrawl(config.apiKey) : composio(config.apiKey);
}
