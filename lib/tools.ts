import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import { guideSchema } from "./guide";
import { researchApp } from "./research";
import { getGuide } from "./store";
import { saveGuide } from "./store-server";

export function createTools(model: string) {
  return {
    get_guide: tool({
      description:
        "Read a saved guide from the library by slug. Returns null when no guide is saved for that app.",
      inputSchema: z.object({ slug: z.string().describe("Lowercase app slug, e.g. spotify") }),
      execute: ({ slug }) => getGuide(slug),
    }),
    research_app: tool({
      description:
        "Search the web and read official documentation pages about registering an OAuth app with a provider. Returns page markdown.",
      inputSchema: z.object({ name: z.string().describe("The app or provider name, e.g. Xero") }),
      execute: ({ name }) => researchApp(name),
    }),
    render_guide: tool({
      description:
        "Render the finished guide into the page and save it to the library. Call once per guide, with the complete guide.",
      inputSchema: guideSchema,
      execute: async (guide) => ({ slug: await saveGuide(guide, model) }),
    }),
  };
}

export type OAuthorTools = ReturnType<typeof createTools>;
export type OAuthorMessage = UIMessage<never, never, InferUITools<OAuthorTools>>;
