# 🎮 Simulation Mode Setup Guide

## What is Simulation Mode?

Simulation Mode lets you **test the complete betting and gameplay flow ALONE** without needing a second player. Perfect for:
- Testing the full game flow from bet → play → results
- Verifying the betting system works correctly
- Playing through Chess, Checkers, Connect Four, and Coin Flip
- Seeing how payouts are calculated

## ⚠️ IMPORTANT: Database Setup Required

Before using Simulation Mode, you **MUST** set up your Supabase database tables. The error you're seeing (`"Could not find the table 'public.games' in the schema cache"`) means the database isn't set up yet.

### Step 1: Run Database Migrations

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy and paste the contents of `/supabase/schema.sql` (the entire file)
5. Click **"Run"** to execute
6. Wait for success message

### Step 2: Add Deposit Tracking Columns

1. Still in SQL Editor, click **"New Query"** again
2. Copy and paste the contents of `/supabase/migrations/add_deposit_columns.sql`
3. Click **"Run"** to execute
4. Wait for success message

### Step 3: Verify Tables Created

1. In Supabase, go to **"Table Editor"** (left sidebar)
2. You should see these tables:
   - `users`
   - `games`
   - `transactions`
   - `leaderboard` (view)

If you see these tables, you're ready to go! 🎉

## 🚀 How to Use Simulation Mode

### Option 1: From Devnet Tools Page

1. Visit http://localhost:3001/devnet-tools
2. Connect your Phantom wallet
3. Click the big **"🎮 Simulation Mode"** button (marked as RECOMMENDED)
4. This takes you to the test game page

### Option 2: Direct Link

1. Visit http://localhost:3001/test-game directly
2. Connect your wallet if not already connected

### Testing Flow

Once on the Test Game page:

1. **Choose Your Game**: Select Chess, Checkers, Connect Four, or Coin Flip
2. **Select Your Bet**: Choose bet amount (0.001 - 1 SOL)
3. **Click "Start Test Game"**
4. You'll be redirected to the game page
5. **Play the game**: You control BOTH players to test gameplay
6. **See Results**: Watch the win/loss screen with payout calculations

## 🧪 What Happens Behind the Scenes

When you start a simulation game:

1. ✅ System creates a fake "bot" player automatically
2. ✅ Both players are marked as "deposited" (no real SOL transactions needed)
3. ✅ Game starts immediately in "in_progress" status
4. ✅ You can play through the entire game
5. ✅ Results are calculated with proper house fee (3%) deduction

## 🎯 Testing Each Game

### Chess (`/games/chess/play/[id]`)
- Make moves for BOTH white and black
- Test check, checkmate, stalemate
- See timer and move history

### Checkers (`/games/checkers/play/[id]`)
- Make moves for BOTH red and black
- Test captures and mandatory jumps
- King promotion when reaching opposite end

### Connect Four (`/games/connect-four/play/[id]`)
- Drop pieces for BOTH red and yellow
- Test win detection (4 in a row)
- Verify draw detection when board fills

### Coin Flip (`/games/coin-flip/play/[id]`)
- Automatically flips after 2 seconds
- Random result generated
- Shows win/loss with payout

## 📁 Key Files Created

```
/app/test-game/page.tsx                          - Main simulation UI
/app/api/matchmaking/simulate/route.ts           - Bot creation API
/app/games/chess/play/[id]/page.tsx             - Chess game page
/app/games/checkers/play/[id]/page.tsx          - Checkers game page
/app/games/connect-four/play/[id]/page.tsx      - Connect Four game page
/app/games/coin-flip/play/[id]/page.tsx         - Coin Flip game page
/app/api/games/[id]/route.ts                    - Fetch/delete game API
/app/api/games/[id]/finish/route.ts             - Complete game API
/supabase/migrations/add_deposit_columns.sql     - Deposit tracking schema
```

## 🔍 Troubleshooting

### "Could not find the table 'public.games'"
- **Solution**: Run the database migrations (Step 1 & 2 above)

### "Game not found" after clicking Start Test Game
- **Solution**: Make sure database tables are created
- Check browser console for errors
- Verify Supabase credentials in `.env.local`

### Simulation game won't start
- **Solution**: Open browser DevTools → Console
- Look for API errors
- Verify `/api/matchmaking/simulate` returns success

### Page shows "Loading game..." forever
- **Solution**: Game wasn't created in database
- Check that `/api/matchmaking/simulate` POST succeeded
- Verify `game_state` column accepts JSONB data

## ✅ Success Checklist

- [ ] Database tables created in Supabase
- [ ] Deposit columns added to `games` table
- [ ] Can visit http://localhost:3001/test-game
- [ ] Can select a game and bet amount
- [ ] "Start Test Game" button works
- [ ] Redirected to game page successfully
- [ ] Can play through entire game
- [ ] See win/loss results screen

## 🎊 Ready to Test!

Once you've completed the database setup:

1. Visit http://localhost:3001/test-game
2. Connect your wallet (devnet)
3. Select Coin Flip + 0.001 SOL bet
4. Click "Start Test Game"
5. Watch it auto-flip and show results!

Then test the other games:
- Chess: Play a quick checkmate
- Checkers: Test capturing mechanics
- Connect Four: Get 4 in a row

**You're now ready to test the complete betting flow end-to-end!** 🚀
