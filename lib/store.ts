import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

export type LibraryCard = { slug: string; appName: string };

export async function listCards(): Promise<LibraryCard[]> {
  const { data, error } = await anonClient()
    .from("guides")
    .select("slug, app_name")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ slug: String(row.slug), appName: String(row.app_name) }));
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
