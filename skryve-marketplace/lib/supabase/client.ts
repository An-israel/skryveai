// ⚠️  THIS IS A TYPESCRIPT FILE — paste it into your Next.js project at:
//     lib/supabase/client.ts
// Do NOT run it in the Supabase SQL editor.
//
// Install deps first:
//   npm install @supabase/ssr @supabase/supabase-js

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseClient() {
  if (client) return client
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return client
}
