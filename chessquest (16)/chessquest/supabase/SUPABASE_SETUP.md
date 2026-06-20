# Enabling real online play (≈10 minutes)

The game works online **right now** with no setup using a local fallback (two
tabs/windows on the same computer can play each other). To let two different
people on different computers play across the internet, connect a free Supabase
project:

## 1. Create a project
- Go to https://supabase.com and sign up (free).
- Click **New project**. Pick any name and a database password. Wait ~2 min for
  it to provision.

## 2. Run the schema
- In the project, open **SQL Editor** (left sidebar).
- Open `supabase/schema.sql` from this repo, copy all of it, paste it into a new
  query, and click **Run**. This creates the `games` and `profiles` tables,
  turns on Realtime, and sets access policies.

## 3. Enable anonymous sign-in
- Go to **Authentication → Providers** (or **Sign In / Providers**).
- Enable **Anonymous sign-ins**. (The app signs players in anonymously so each
  has an identity for Realtime; no email needed.)

## 4. Get your keys
- Go to **Project Settings → API**.
- Copy the **Project URL** and the **anon public** key.

## 5. Add them to the app
- In the project root, create a file named `.env` (copy `.env.example`):

  ```
  VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-public-key
  ```

- Restart the dev server (or rebuild). On Netlify, add these two as environment
  variables under **Site settings → Environment variables**, then redeploy.

## 6. Done
The app auto-detects the credentials and switches from the local fallback to
real networked play. Random matchmaking and room codes now work across devices.

## Notes
- The included Row Level Security policies are permissive (good for a friendly
  hobby project). If you want stricter rules, edit the policies in `schema.sql`.
- Free-tier limits are generous for casual play. Abandoned games can be cleaned
  up with the optional query at the bottom of `schema.sql`.
- If credentials are wrong or missing, the app silently falls back to local
  mode, so it never breaks.

---

# Adding verified accounts (email + Google) — optional

Accounts are optional: guests can always play. Turning these on lets players
sign in with a verified email or Google, and keeps their name + rating across
devices. The app code is already built; you just enable the providers.

## A. Email sign-up with verification

1. In Supabase, go to **Authentication → Providers → Email**. Make sure it's
   enabled (it is by default).
2. Turn on **Confirm email**. Supabase will now email a verification link when
   someone signs up; they can't sign in until they click it.
3. (Optional) Under **Authentication → Email Templates**, customize the
   confirmation and magic-link emails.
4. Under **Authentication → URL Configuration**, set **Site URL** to your live
   site address (your Netlify URL, e.g. `https://yourgame.netlify.app`). For
   local testing also add `http://localhost:5273` to **Redirect URLs**. This is
   where users land after clicking the email link or finishing Google sign-in.

That's it for email — the in-app "Create account" tab and "Magic link" tab now
work. New sign-ups see "check your inbox to verify."

## B. Google sign-in

You need a Google OAuth client (free). The app's "Continue with Google" button
is already wired; it just needs these credentials.

1. **In Supabase:** go to **Authentication → Providers → Google**. Leave this
   tab open — you'll need the **Callback URL** it shows (looks like
   `https://YOUR-PROJECT.supabase.co/auth/v1/callback`).
2. **In Google Cloud Console** (https://console.cloud.google.com):
   - Create a project (or pick one).
   - Go to **APIs & Services → OAuth consent screen**, choose **External**,
     fill in the app name + your email, and save. Add your email as a test user
     while developing.
   - Go to **APIs & Services → Credentials → Create Credentials → OAuth client
     ID**. Choose **Web application**.
   - Under **Authorized redirect URIs**, paste the Supabase Callback URL from
     step 1.
   - Create it. Copy the **Client ID** and **Client secret**.
3. **Back in Supabase's Google provider tab:** paste the Client ID and Client
   secret, and **Save**. Toggle the provider **on**.
4. Make sure your **Site URL** / **Redirect URLs** (Authentication → URL
   Configuration) include your live site and `http://localhost:5273`.

Now "Continue with Google" works: it redirects to Google, then back to the app,
which reads the session and links it to the player's identity automatically.

## Notes
- Accounts stay **optional** — there's no gate. A guest who signs in keeps the
  same player id and rating; signing out drops back to guest without data loss.
- If providers aren't configured, the account screen shows a friendly "verified
  accounts turn on when the server is connected" message and guest play is
  unaffected.
