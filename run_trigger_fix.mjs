// Runs the trigger fix via Supabase Management API
// Usage: node run_trigger_fix.mjs <personal_access_token>

const PAT = process.argv[2]
const PROJECT_REF = "uwwmwerdfpyekgshkrft"

if (!PAT) {
  console.error("Usage: node run_trigger_fix.mjs <your_supabase_personal_access_token>")
  console.error("Get your token from: https://supabase.com/dashboard/account/tokens")
  process.exit(1)
}

const sql = `
CREATE OR REPLACE FUNCTION initialize_user_data()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, status, plan, trial_ends_at)
  VALUES (NEW.id, 'trial', 'free', NOW() + INTERVAL '3 days')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credits (user_id, total_credits, used_credits)
  VALUES (NEW.id, 10, 0)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.email_settings (user_id, provider, from_name, from_email)
  VALUES (NEW.id, 'resend', NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
)

const data = await res.json()
if (res.ok) {
  console.log("✅ Trigger function fixed successfully!")
  console.log(JSON.stringify(data, null, 2))
} else {
  console.error("❌ Failed:", JSON.stringify(data, null, 2))
}
