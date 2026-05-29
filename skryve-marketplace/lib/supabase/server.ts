// lib/supabase/server.ts
// This file is only needed if you use Next.js (App Router).
// If you're using Lovable / Vite / React — you DON'T need this file.
// Just use the client.ts file instead everywhere.
//
// If you ARE on Next.js, install: npm install @supabase/ssr
// and add to .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
//   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

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
          } catch { /* safe to ignore in Server Components */ }
        },
      },
    },
  )
}

export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
}
