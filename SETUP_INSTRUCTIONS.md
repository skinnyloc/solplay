# SolPlay Gaming Platform - Setup Instructions

## Phase 3: Supabase Database Setup

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/log in
2. Click "New Project"
3. Fill in project details:
   - **Name**: solplay-gaming (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your target users
   - **Pricing Plan**: Free tier is fine for development
4. Click "Create new project" and wait for setup to complete

### Step 2: Run the Database Schema

1. In your Supabase dashboard, go to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `/supabase/schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify that all tables were created successfully:
   - `users`
   - `games`
   - `game_moves`
   - `leaderboard` (materialized view)

### Step 3: Get Your API Keys

1. In your Supabase dashboard, go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (the long JWT token under "Project API keys")

### Step 4: Configure Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-key
```

3. Save the file

### Step 5: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

Your app should now be connected to Supabase!

### Step 6: Test the API

You can test the user initialization endpoint:

**POST request:**
```bash
curl -X POST http://localhost:3001/api/supabase/init \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"GQ95MH74f2kF6Aqv5dy6PSKq3S1xfwQowwYYqVQPNTMe"}'
```

**GET request:**
```bash
curl "http://localhost:3001/api/supabase/init?wallet_address=GQ95MH74f2kF6Aqv5dy6PSKq3S1xfwQowwYYqVQPNTMe"
```

### Step 7: Verify Database

Go back to Supabase:
1. Navigate to **Table Editor** in the left sidebar
2. Click on the `users` table
3. You should see your test user created!

---

## What's Been Set Up

✅ **Database Schema:**
- `users` - Player profiles and stats
- `games` - Game sessions and state
- `game_moves` - Move history
- `leaderboard` - Materialized view for rankings

✅ **API Routes:**
- `POST /api/supabase/init` - Create/update user on wallet connect
- `GET /api/supabase/init` - Fetch user stats

✅ **Features:**
- Automatic user stat updates on game completion
- Leaderboard auto-refresh after games
- Row Level Security (RLS) enabled
- Database triggers for stat tracking

---

## Next Steps

In the next phases, you'll:
- Integrate wallet connection with automatic user creation
- Build game logic for all 4 games
- Implement the betting system with Solana smart contracts
- Add matchmaking and real-time gameplay

---

## Troubleshooting

**Error: "Missing Supabase environment variables"**
- Make sure `.env.local` is in the root directory
- Verify the variable names start with `NEXT_PUBLIC_`
- Restart your dev server after adding env vars

**Error: "relation 'users' does not exist"**
- Make sure you ran the schema.sql file in Supabase SQL Editor
- Check the SQL Editor for any error messages

**Error: "Invalid API key"**
- Double-check you copied the **anon/public** key (not the service role key)
- Ensure there are no extra spaces or line breaks in the key
