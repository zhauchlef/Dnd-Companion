import { createClient } from "@supabase/supabase-js";
 
// Self-contained client. If you already have one (e.g. lib/supabase.ts),
// you can re-export it from here instead.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
);