// ⚠️  THIS IS A TYPESCRIPT FILE — paste it into your Next.js project at:
//     lib/supabase/server.ts
// Do NOT run it in the Supabase SQL editor.
//
// Install deps first:
//   npm install @supabase/ssr @supabase/supabase-js

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Use inside Server Components, Route Handlers, and Server Actions
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll is called from a Server Component — cookies can only
            // be set in Middleware or Route Handlers. Safe to ignore here.
          }
        },
      },
    },
  )
}

// Use when you need to bypass RLS (e.g. admin operations, cron jobs)
export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
}
