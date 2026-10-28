import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { publicEnv } from "./env";
import { guideRowSchema, slugify, type Guide } from "./guide";

export type GuidesRow = {
  slug: string;
  app_name: string;
  guide: unknown;
  model: string | null;
  created_at: string;
  updated_at: string;
};

type Database = {
  composio: {
    Tables: {
      guides: {
        Row: GuidesRow;
        Insert: Pick<GuidesRow, "slug" | "app_name" | "guide"> & Partial<GuidesRow>;
        Update: Partial<GuidesRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

export type Db = SupabaseClient<Database, "composio">;

export const dbOptions = { db: { schema: "composio" as const }, auth: { persistSession: false } };

let anon: Db | undefined;
export function anonClient(): Db {
  const env = publicEnv();
  anon ??= createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, dbOptions);
  return anon;
}

const cardRowSchema = guideRowSchema.transform((row) => ({
  slug: row.slug,
  appName: row.app_name,
  level: row.guide.difficulty.level,
  setup: row.guide.time.setup,
  approvalWait: row.guide.time.approvalWait,
}));

export type LibraryCard = z.infer<typeof cardRowSchema>;

export async function listCards(): Promise<LibraryCard[]> {
  const { data, error } = await anonClient()
    .from("guides")
    .select("slug, app_name, guide")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) => {
    const card = cardRowSchema.safeParse(row);
    return card.success ? [card.data] : [];
  });
}

export async function getGuide(slug: string): Promise<Guide | null> {
  const { data, error } = await anonClient()
    .from("guides")
    .select("slug, app_name, guide")
    .eq("slug", slugify(slug))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return guideRowSchema.parse(data).guide;
}
