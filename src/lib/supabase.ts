import { createClient } from "@supabase/supabase-js";
import { convertToWebP } from "./imageOptimizer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes("your-project")
);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

export function getErrorMessage(err: unknown): string {
  if (!err) return "Unknown error occurred";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    if (obj.message && typeof obj.message === "string") {
      const details = obj.details ? ` - ${obj.details}` : "";
      const hint = obj.hint ? ` (${obj.hint})` : "";
      return `${obj.message}${details}${hint}`;
    }
    if (obj.error_description && typeof obj.error_description === "string") {
      return obj.error_description;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

export async function uploadMediaFile(file: File, folder: string = "uploads"): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
  }

  const webpFile = await convertToWebP(file, 0.85);
  const cleanFileName = webpFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

  const { data, error } = await supabase.storage
    .from("evolvia-media")
    .upload(filePath, webpFile, {
      cacheControl: "3600",
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from("evolvia-media")
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
