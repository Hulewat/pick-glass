import "server-only";
import { localStore } from "./local";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

let cached: Store | null = null;

/** Supabase when its keys are set, otherwise a local folder. */
export function store(): Store {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? supabaseStore(url, key) : localStore;
  return cached;
}
