# SkryveAI — How to Run Your App

## STEP 1: Install Node.js (only once)

1. Go to **https://nodejs.org**
2. Click the big green **LTS** button
3. Run the downloaded installer → click Next → Next → Install
4. **Restart your computer**

---

## STEP 2: Install app dependencies

1. Open **VS Code**
2. Open your project folder: `C:\Users\aniek\SKRYVEAIP`
3. Open the terminal: **View → Terminal** (or press Ctrl + `)
4. Type this and press Enter:
   ```
   npm install
   ```
5. Wait about 2 minutes for it to finish

---

## STEP 3: Create your Supabase project (free)

1. Go to **https://supabase.com** → Sign up free
2. Click **New Project**
3. Name: `SkryveAI` → choose any region → click Create
4. Wait ~2 minutes for it to initialize

**Get your keys:**
1. In Supabase → click **Project Settings** (gear icon) → **API**
2. Copy **Project URL** → paste into `.env` as `VITE_SUPABASE_URL`
3. Copy **anon public** key → paste into `.env` as `VITE_SUPABASE_PUBLISHABLE_KEY`

**Run the database schema:**
1. In Supabase → click **SQL Editor** (code icon)
2. Open the file `skryveai_database_schema.sql` from your Downloads
3. Select all the text → copy it
4. Paste it into the SQL Editor → click **Run**
5. You should see "Success" — this creates all 25 tables

---

## STEP 4: Get your API keys

### OpenAI (for AI email writing)
1. Go to **https://platform.openai.com/api-keys**
2. Sign up or log in
3. Click **Create new secret key**
4. Copy it — it starts with `sk-proj-...`
5. Add $5-10 in credits (Settings → Billing) so the AI works

### Google Places (for business search)
1. Go to **https://console.cloud.google.com**
2. Create a project → search for "Places API" → Enable it
3. Go to **Credentials** → Create Credentials → API Key
4. Copy the key — it starts with `AIza...`

### Resend (for sending emails)
1. Go to **https://resend.com** → Sign up free
2. Go to **API Keys** → Create API Key
3. Copy it — starts with `re_...`
4. (Free plan lets you send from `onboarding@resend.dev` for testing)

### Paystack (for payments)
1. Go to **https://paystack.com** → Sign up
2. Complete business verification
3. Go to **Settings → Developer** → copy your Test keys

---

## STEP 5: Fill in your .env file

Open the file `C:\Users\aniek\SKRYVEAIP\.env` in VS Code and fill in:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co         ← from Supabase
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...            ← from Supabase
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...               ← from Paystack
VITE_APP_URL=http://localhost:5173
```

---

## STEP 6: Start the app

In your VS Code terminal:
```
npm run dev
```

Open your browser → go to **http://localhost:5173**

You should see your SkryveAI landing page! 🎉

---

## STEP 7: Deploy the edge functions (backend AI)

The edge functions are what make the AI work. You deploy them to Supabase.

1. Install Supabase CLI:
   ```
   npm install -g supabase
   ```

2. Log in to Supabase:
   ```
   supabase login
   ```
   (Opens your browser — click Authorize)

3. Get your Project Reference ID:
   - Supabase Dashboard → Project Settings → General → Reference ID
   - Looks like: `abcdefghijklmnop`

4. Link your project:
   ```
   supabase link --project-ref YOUR_REFERENCE_ID
   ```

5. Deploy all functions:
   ```
   supabase functions deploy
   ```

6. Set your API keys as secrets (so the AI can use them):
   ```
   supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY
   supabase secrets set GOOGLE_PLACES_API_KEY=AIza_YOUR_KEY
   supabase secrets set RESEND_API_KEY=re_YOUR_KEY
   supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_YOUR_KEY
   supabase secrets set APP_URL=http://localhost:5173
   ```

---

## STEP 8: Deploy your website (so others can use it)

**Option A: Vercel (free, recommended)**
1. Go to **https://vercel.com** → Sign up with GitHub
2. Push your code to GitHub first (ask Claude to help with this)
3. Click **Import Project** → select your repo
4. Add all your `.env` variables in Vercel's settings
5. Click Deploy — done!

**Option B: Netlify (also free)**
1. In your terminal: `npm run build`
2. Go to **https://netlify.com** → drag the `dist` folder onto their page

---

## What each API key costs

| Service | Free tier | Paid |
|---------|-----------|------|
| Supabase | Free forever (500MB DB) | $25/mo |
| OpenAI | Pay per use (~$0.01/email) | Varies |
| Google Places | $200 free credit/month | Then pay per use |
| Resend | 3,000 emails/month free | $20/mo for more |
| Paystack | Free (takes ~1.5% per transaction) | Free |

---

## Troubleshooting

**"npm: command not found"** → Node.js not installed, go back to Step 1

**"Missing Supabase environment variables"** → .env file not filled in

**"Edge function not found"** → Run `supabase functions deploy` again

**App loads but search doesn't work** → Check Google Places API key is set in Supabase secrets

**AI doesn't write emails** → Check OpenAI API key has credits and is set in Supabase secrets
