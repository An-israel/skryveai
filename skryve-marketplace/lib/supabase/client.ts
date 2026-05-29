// lib/supabase/client.ts
// Place this file at: src/lib/supabase/client.ts in your project
//
// Install first: npm install @supabase/supabase-js
// Then add to your .env file:
//   VITE_SUPABASE_URL=your-supabase-url
//   VITE_SUPABASE_ANON_KEY=your-anon-key

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
