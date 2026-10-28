import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { repairGuideInput } from "@/lib/guide";
import { systemPrompt } from "@/lib/prompt";
import { createTools, type OAuthorMessage } from "@/lib/tools";

export const maxDuration = 300;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
  openApp: z.string().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request body" }, { status: 400 });

  const env = serverEnv();
  const tools = createTools(env.OAUTHOR_MODEL);

  let messages: OAuthorMessage[];
  try {
    messages = await validateUIMessages<OAuthorMessage>({ messages: body.data.messages, tools });
  } catch {
    return Response.json({ error: "Invalid messages" }, { status: 400 });
  }

  const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
  const result = streamText({
    model: openrouter(env.OAUTHOR_MODEL),
    instructions: systemPrompt(body.data.openApp),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: isStepCount(8),
    repairToolCall: async ({ toolCall }) => {
      if (toolCall.toolName !== "render_guide") return null;
      const input = repairGuideInput(toolCall.input);
      return input ? { ...toolCall, input } : null;
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => (error instanceof Error ? error.message : "Something went wrong"),
    }),
  });
}
