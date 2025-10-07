-- SolPlay Gaming Platform Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE game_type AS ENUM ('chess', 'checkers', 'connect_four', 'coin_flip');
CREATE TYPE game_status AS ENUM ('waiting', 'active', 'completed', 'cancelled');

-- 1. Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    total_games_played INTEGER DEFAULT 0,
    total_games_won INTEGER DEFAULT 0,
    total_earnings NUMERIC(20, 9) DEFAULT 0, -- SOL has 9 decimals
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on wallet_address for faster lookups
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- 2. Games table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_type game_type NOT NULL,
    player1_wallet TEXT NOT NULL,
    player2_wallet TEXT,
    wager_amount NUMERIC(20, 9) NOT NULL, -- SOL amount
    status game_status DEFAULT 'waiting',
    winner_wallet TEXT,
    game_state JSONB DEFAULT '{}'::jsonb, -- Stores board state, moves, etc.
    escrow_pda TEXT, -- Solana Program Derived Address
    house_fee NUMERIC(20, 9) DEFAULT 0, -- 3% house fee
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Foreign key constraints
    CONSTRAINT fk_player1 FOREIGN KEY (player1_wallet) REFERENCES users(wallet_address),
    CONSTRAINT fk_player2 FOREIGN KEY (player2_wallet) REFERENCES users(wallet_address),
    CONSTRAINT fk_winner FOREIGN KEY (winner_wallet) REFERENCES users(wallet_address)
);

-- Create indexes for common queries
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_player1 ON games(player1_wallet);
CREATE INDEX idx_games_player2 ON games(player2_wallet);
CREATE INDEX idx_games_created_at ON games(created_at DESC);

-- 3. Game Moves table
CREATE TABLE game_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    player_wallet TEXT NOT NULL,
    move_data JSONB NOT NULL, -- Chess notation, board position, etc.
    move_number INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Create indexes for game moves
CREATE INDEX idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX idx_game_moves_timestamp ON game_moves(timestamp);

-- 4. Leaderboard materialized view
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
    u.wallet_address,
    u.username,
    u.total_games_won AS total_wins,
    u.total_earnings,
    CASE
        WHEN u.total_games_played > 0
        THEN ROUND((u.total_games_won::NUMERIC / u.total_games_played::NUMERIC) * 100, 2)
        ELSE 0
    END AS win_rate,
    ROW_NUMBER() OVER (ORDER BY u.total_earnings DESC) AS rank
FROM users u
WHERE u.total_games_played > 0
ORDER BY u.total_earnings DESC;

-- Create index on leaderboard view
CREATE UNIQUE INDEX idx_leaderboard_wallet ON leaderboard(wallet_address);

-- Function to refresh leaderboard (call this periodically or after game completion)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user stats when game completes
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update when game is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update player 1 stats
        UPDATE users
        SET total_games_played = total_games_played + 1,
            total_games_won = CASE
                WHEN NEW.winner_wallet = NEW.player1_wallet THEN total_games_won + 1
                ELSE total_games_won
            END,
            total_earnings = CASE
                WHEN NEW.winner_wallet = NEW.player1_wallet
                THEN total_earnings + (NEW.wager_amount * 2 * 0.97) - NEW.wager_amount
                ELSE total_earnings - NEW.wager_amount
            END
        WHERE wallet_address = NEW.player1_wallet;

        -- Update player 2 stats
        IF NEW.player2_wallet IS NOT NULL THEN
            UPDATE users
            SET total_games_played = total_games_played + 1,
                total_games_won = CASE
                    WHEN NEW.winner_wallet = NEW.player2_wallet THEN total_games_won + 1
                    ELSE total_games_won
                END,
                total_earnings = CASE
                    WHEN NEW.winner_wallet = NEW.player2_wallet
                    THEN total_earnings + (NEW.wager_amount * 2 * 0.97) - NEW.wager_amount
                    ELSE total_earnings - NEW.wager_amount
                END
            WHERE wallet_address = NEW.player2_wallet;
        END IF;

        -- Refresh leaderboard
        PERFORM refresh_leaderboard();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_user_stats
AFTER UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_seen
CREATE TRIGGER trigger_update_last_seen
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_last_seen();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Users can read all user data
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (true);

-- Users can insert their own data
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (true);

-- Games are viewable by everyone
CREATE POLICY "Games are viewable by everyone" ON games
    FOR SELECT USING (true);

-- Users can create games
CREATE POLICY "Users can create games" ON games
    FOR INSERT WITH CHECK (true);

-- Users can update games they're part of
CREATE POLICY "Players can update their games" ON games
    FOR UPDATE USING (true);

-- Game moves are viewable by everyone
CREATE POLICY "Game moves are viewable by everyone" ON game_moves
    FOR SELECT USING (true);

-- Users can insert moves for games they're in
CREATE POLICY "Players can insert moves" ON game_moves
    FOR INSERT WITH CHECK (true);

-- Insert sample data for testing (optional)
-- INSERT INTO users (wallet_address, username) VALUES
-- ('GQ95MH74f2kF6Aqv5dy6PSKq3S1xfwQowwYYqVQPNTMe', 'House'),
-- ('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', 'TestPlayer1');
