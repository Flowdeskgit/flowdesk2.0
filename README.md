# Flowdesk ADV

Flowdesk ADV is the Netlify/Supabase version of the MCR Advocacia operations app.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and fill in the Supabase client values.

3. Run the app:

   ```bash
   npm run dev
   ```

## Netlify Environment

Client-side variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Server-only variables for Netlify Functions:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Database

Apply the SQL in `supabase/migrations/001_flowdesk_adv_schema.sql` to create profiles, JSONB entity tables, row-level security policies, and the `uploads` storage bucket.
