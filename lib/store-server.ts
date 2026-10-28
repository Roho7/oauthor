import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";
import { guideSchema, slugify, type Guide } from "./guide";
import { dbOptions, type Db } from "./store";

function serviceClient(): Db {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, dbOptions);
}

export async function saveGuide(input: Guide, model: string): Promise<string> {
  const guide = guideSchema.parse(input);
  const slug = slugify(guide.app.name);
  if (!slug) throw new Error("Guide app name produced an empty slug");
  const { error } = await serviceClient().from("guides").upsert(
    { slug, app_name: guide.app.name, guide, model, updated_at: new Date().toISOString() },
    { onConflict: "slug" },
  );
  if (error) throw new Error(error.message);
  return slug;
}
