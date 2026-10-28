import { z } from "zod";

export const guideSchema = z.object({
  app: z.object({
    name: z.string().min(1).describe("Product or provider name, e.g. Spotify"),
    website: z.string().describe("The provider's developer portal or main site URL"),
  }),
  difficulty: z.object({
    level: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
      .describe("1 = about an hour, 5 = weeks of review and paperwork"),
    why: z.string().describe("One or two sentences justifying the level"),
  }),
  time: z.object({
    setup: z.string().describe("Hands-on time, e.g. '30 minutes'"),
    approvalWait: z
      .string()
      .nullable()
      .describe("Review or verification wait, e.g. '2-6 weeks'; null if none"),
  }),
  requirements: z.array(z.string()).describe("What the developer needs before starting"),
  agentHelp: z.object({
    canDo: z.array(z.string()).describe("Tasks an AI agent can do for the developer"),
    youMustDo: z.array(z.string()).describe("Tasks only the developer can do"),
  }),
  steps: z.array(z.object({ title: z.string(), detail: z.string() })),
  blockers: z.array(z.object({ problem: z.string(), fix: z.string() })),
  references: z.array(z.object({ title: z.string(), url: z.string() })),
});

export type Guide = z.infer<typeof guideSchema>;

export const guideRowSchema = z.object({
  slug: z.string(),
  app_name: z.string(),
  guide: guideSchema,
});

export type GuideRow = z.infer<typeof guideRowSchema>;

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
