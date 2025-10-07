-- ============================================
-- SOLPLAY GAMING - COMPLETE DATABASE SETUP
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
DO $$ BEGIN
    CREATE TYPE game_type AS ENUM ('chess', 'checkers', 'connect_four', 'coin_flip');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE game_status AS ENUM ('waiting', 'active', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users table (NO foreign keys to avoid constraint issues)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    total_games_played INTEGER DEFAULT 0,
    total_games_won INTEGER DEFAULT 0,
    total_earnings NUMERIC(20, 9) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on wallet_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- 2. Games table (NO foreign keys to avoid constraint issues)
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_type game_type NOT NULL,
    player1_wallet TEXT NOT NULL,
    player2_wallet TEXT,
    wager_amount NUMERIC(20, 9) NOT NULL,
    status game_status DEFAULT 'waiting',
    winner_wallet TEXT,
    game_state JSONB DEFAULT '{}'::jsonb,
    escrow_pda TEXT,
    house_fee NUMERIC(20, 9) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Deposit tracking columns
    player1_deposited BOOLEAN DEFAULT FALSE,
    player2_deposited BOOLEAN DEFAULT FALSE,
    player1_tx_signature TEXT,
    player2_tx_signature TEXT,
    player1_deposited_at TIMESTAMP,
    player2_deposited_at TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_wallet);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_wallet);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_deposit_status ON games(player1_deposited, player2_deposited);
CREATE INDEX IF NOT EXISTS idx_games_tx_signatures ON games(player1_tx_signature, player2_tx_signature);

-- 3. Game Moves table
CREATE TABLE IF NOT EXISTS game_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    player_wallet TEXT NOT NULL,
    move_data JSONB NOT NULL,
    move_number INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for game moves
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_timestamp ON game_moves(timestamp);

-- 4. Disable Row Level Security (RLS) for easier testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Games are viewable by everyone" ON games;
DROP POLICY IF EXISTS "Users can create games" ON games;
DROP POLICY IF EXISTS "Players can update their games" ON games;
DROP POLICY IF EXISTS "Game moves are viewable by everyone" ON game_moves;
DROP POLICY IF EXISTS "Players can insert moves" ON game_moves;

-- Enable RLS but with permissive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow everything for testing)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on game_moves" ON game_moves FOR ALL USING (true) WITH CHECK (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup complete! Tables created: users, games, game_moves';
    RAISE NOTICE '✅ All indexes created successfully';
    RAISE NOTICE '✅ Row Level Security configured with permissive policies';
    RAISE NOTICE '🎮 You can now use the simulation mode!';
END $$;
