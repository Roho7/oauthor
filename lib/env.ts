import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const crawlerSchema = z.union([
  z.object({ FIRECRAWL_API_KEY: z.string().min(1) }).transform((e) => ({
    crawler: { kind: "firecrawl" as const, apiKey: e.FIRECRAWL_API_KEY },
  })),
  z
    .object({ COMPOSIO_API_KEY: z.string().min(1), COMPOSIO_USER_ID: z.string().min(1) })
    .transform((e) => ({
      crawler: { kind: "composio" as const, apiKey: e.COMPOSIO_API_KEY, userId: e.COMPOSIO_USER_ID },
    })),
]);

const serverSchema = publicSchema
  .extend({
    OPENROUTER_API_KEY: z.string().min(1),
    OAUTHOR_MODEL: z.string().min(1).default("anthropic/claude-sonnet-5.5"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .and(crawlerSchema);

export type CrawlerConfig = z.infer<typeof crawlerSchema>["crawler"];

function parse<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map((i) => i.path.join(".")))];
    throw new Error(`Invalid environment: ${keys.join(", ")}`);
  }
  return result.data;
}

export function publicEnv() {
  return parse(publicSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

let cachedServer: z.infer<typeof serverSchema> | undefined;

export function serverEnv() {
  cachedServer ??= parse(serverSchema, {
    ...process.env,
    OAUTHOR_MODEL: process.env.OAUTHOR_MODEL || undefined,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || undefined,
    COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY || undefined,
    COMPOSIO_USER_ID: process.env.COMPOSIO_USER_ID || undefined,
  });
  return cachedServer;
}
