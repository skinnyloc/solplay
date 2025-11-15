-- ============================================
-- SOLPLAY GAMING - MATCHMAKING + ESCROW SYSTEM
-- Complete Database Schema with Atomic Matchmaking
-- ============================================
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase project: https://supabase.com/dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this ENTIRE file
-- 5. Click "Run" or press Cmd/Ctrl + Enter
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE game_type AS ENUM ('chess', 'checkers', 'connect_four', 'coin_flip');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE game_status AS ENUM ('waiting', 'matched', 'active', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE queue_status AS ENUM ('waiting', 'matched', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLE 1: USERS
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- ============================================
-- TABLE 2: MATCH QUEUE
-- Players waiting to be matched
-- ============================================

CREATE TABLE IF NOT EXISTS match_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_wallet TEXT NOT NULL,
    game_type game_type NOT NULL,
    wager_amount NUMERIC(20, 9) NOT NULL CHECK (wager_amount > 0),
    status queue_status DEFAULT 'waiting',
    matched_game_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    matched_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_match_queue_status ON match_queue(status);
CREATE INDEX IF NOT EXISTS idx_match_queue_game_type ON match_queue(game_type, status);
CREATE INDEX IF NOT EXISTS idx_match_queue_wager ON match_queue(wager_amount);
CREATE INDEX IF NOT EXISTS idx_match_queue_created_at ON match_queue(created_at);

-- ============================================
-- TABLE 3: ACTIVE GAMES
-- Games currently in progress
-- ============================================

CREATE TABLE IF NOT EXISTS active_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_type game_type NOT NULL,
    player1_wallet TEXT NOT NULL,
    player2_wallet TEXT NOT NULL,
    player1_wager NUMERIC(20, 9) NOT NULL,
    player2_wager NUMERIC(20, 9) NOT NULL,
    matched_wager NUMERIC(20, 9) NOT NULL, -- Lower of the two wagers
    total_pot NUMERIC(20, 9) NOT NULL, -- matched_wager * 2
    house_fee NUMERIC(20, 9) NOT NULL, -- 5% of total_pot
    net_pot NUMERIC(20, 9) NOT NULL, -- total_pot - house_fee (95%)
    status game_status DEFAULT 'matched',
    winner_wallet TEXT,
    game_state JSONB DEFAULT '{}'::jsonb,

    -- Blockchain tracking
    escrow_pda TEXT,
    player1_tx_signature TEXT,
    player2_tx_signature TEXT,
    resolve_tx_signature TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Deposit tracking
    player1_deposited BOOLEAN DEFAULT FALSE,
    player2_deposited BOOLEAN DEFAULT FALSE,
    player1_deposited_at TIMESTAMP,
    player2_deposited_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_active_games_status ON active_games(status);
CREATE INDEX IF NOT EXISTS idx_active_games_player1 ON active_games(player1_wallet);
CREATE INDEX IF NOT EXISTS idx_active_games_player2 ON active_games(player2_wallet);
CREATE INDEX IF NOT EXISTS idx_active_games_created_at ON active_games(created_at DESC);

-- ============================================
-- TABLE 4: GAME RESULTS
-- Historical record of completed games
-- ============================================

CREATE TABLE IF NOT EXISTS game_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    game_type game_type NOT NULL,
    winner_wallet TEXT NOT NULL,
    loser_wallet TEXT NOT NULL,
    total_pot NUMERIC(20, 9) NOT NULL,
    payout NUMERIC(20, 9) NOT NULL, -- Winner receives this (95% of pot)
    house_fee NUMERIC(20, 9) NOT NULL, -- 5% of pot
    resolve_tx_signature TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_results_game_id ON game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_game_results_winner ON game_results(winner_wallet);
CREATE INDEX IF NOT EXISTS idx_game_results_timestamp ON game_results(timestamp DESC);

-- ============================================
-- TABLE 5: HOUSE EARNINGS
-- Track all house fees collected
-- ============================================

CREATE TABLE IF NOT EXISTS house_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    game_type game_type NOT NULL,
    fee_collected NUMERIC(20, 9) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_house_earnings_timestamp ON house_earnings(timestamp DESC);

-- ============================================
-- TABLE 6: REFUNDS
-- Track wager differences when players bet different amounts
-- ============================================

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    player_wallet TEXT NOT NULL,
    amount NUMERIC(20, 9) NOT NULL,
    reason TEXT NOT NULL,
    refund_tx_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_player ON refunds(player_wallet);
CREATE INDEX IF NOT EXISTS idx_refunds_processed ON refunds(processed);
CREATE INDEX IF NOT EXISTS idx_refunds_game_id ON refunds(game_id);

-- ============================================
-- TABLE 7: GAME MOVES (Optional - for games like chess)
-- ============================================

CREATE TABLE IF NOT EXISTS game_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    player_wallet TEXT NOT NULL,
    move_data JSONB NOT NULL,
    move_number INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_timestamp ON game_moves(timestamp);

-- ============================================
-- FUNCTION: ATOMIC MATCHMAKING
-- Finds a match or creates a new queue entry
-- ============================================

CREATE OR REPLACE FUNCTION find_or_create_match(
    p_player_wallet TEXT,
    p_game_type game_type,
    p_wager_amount NUMERIC
)
RETURNS TABLE (
    matched BOOLEAN,
    game_id UUID,
    queue_id UUID,
    matched_wager NUMERIC,
    refund_amount NUMERIC
) AS $$
DECLARE
    v_existing_queue RECORD;
    v_new_game_id UUID;
    v_new_queue_id UUID;
    v_matched_wager NUMERIC;
    v_refund_amount NUMERIC;
    v_total_pot NUMERIC;
    v_house_fee NUMERIC;
    v_net_pot NUMERIC;
BEGIN
    -- Lock the match_queue table to prevent race conditions
    LOCK TABLE match_queue IN EXCLUSIVE MODE;

    -- Look for an existing waiting player with same game type
    SELECT * INTO v_existing_queue
    FROM match_queue
    WHERE game_type = p_game_type
      AND status = 'waiting'
      AND player_wallet != p_player_wallet
      AND expires_at > NOW()
    ORDER BY created_at ASC
    LIMIT 1;

    IF FOUND THEN
        -- MATCH FOUND!

        -- Calculate matched wager (use lower amount)
        v_matched_wager := LEAST(v_existing_queue.wager_amount, p_wager_amount);
        v_total_pot := v_matched_wager * 2;
        v_house_fee := v_total_pot * 0.05; -- 5% house fee
        v_net_pot := v_total_pot - v_house_fee; -- 95% goes to winner

        -- Create new game
        INSERT INTO active_games (
            game_type,
            player1_wallet,
            player2_wallet,
            player1_wager,
            player2_wager,
            matched_wager,
            total_pot,
            house_fee,
            net_pot,
            status
        ) VALUES (
            p_game_type,
            v_existing_queue.player_wallet,
            p_player_wallet,
            v_existing_queue.wager_amount,
            p_wager_amount,
            v_matched_wager,
            v_total_pot,
            v_house_fee,
            v_net_pot,
            'matched'
        ) RETURNING id INTO v_new_game_id;

        -- Update queue entries to matched
        UPDATE match_queue
        SET status = 'matched',
            matched_game_id = v_new_game_id,
            matched_at = NOW()
        WHERE id = v_existing_queue.id;

        INSERT INTO match_queue (player_wallet, game_type, wager_amount, status, matched_game_id, matched_at)
        VALUES (p_player_wallet, p_game_type, p_wager_amount, 'matched', v_new_game_id, NOW())
        RETURNING id INTO v_new_queue_id;

        -- Handle refunds if wagers don't match
        IF v_existing_queue.wager_amount > v_matched_wager THEN
            v_refund_amount := v_existing_queue.wager_amount - v_matched_wager;
            INSERT INTO refunds (game_id, player_wallet, amount, reason)
            VALUES (v_new_game_id, v_existing_queue.player_wallet, v_refund_amount, 'Wager amount mismatch - refunding difference');
        ELSIF p_wager_amount > v_matched_wager THEN
            v_refund_amount := p_wager_amount - v_matched_wager;
            INSERT INTO refunds (game_id, player_wallet, amount, reason)
            VALUES (v_new_game_id, p_player_wallet, v_refund_amount, 'Wager amount mismatch - refunding difference');
        ELSE
            v_refund_amount := 0;
        END IF;

        -- Return match success
        RETURN QUERY SELECT TRUE, v_new_game_id, v_new_queue_id, v_matched_wager, COALESCE(v_refund_amount, 0);

    ELSE
        -- NO MATCH - Add to queue
        INSERT INTO match_queue (player_wallet, game_type, wager_amount, status)
        VALUES (p_player_wallet, p_game_type, p_wager_amount, 'waiting')
        RETURNING id INTO v_new_queue_id;

        RETURN QUERY SELECT FALSE, NULL::UUID, v_new_queue_id, p_wager_amount, 0::NUMERIC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: COMPLETE GAME
-- Records winner and distributes payouts
-- ============================================

CREATE OR REPLACE FUNCTION complete_game(
    p_game_id UUID,
    p_winner_wallet TEXT,
    p_resolve_tx_signature TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    payout NUMERIC,
    house_fee NUMERIC
) AS $$
DECLARE
    v_game RECORD;
    v_loser_wallet TEXT;
    v_payout NUMERIC;
    v_house_fee NUMERIC;
BEGIN
    -- Get game details
    SELECT * INTO v_game
    FROM active_games
    WHERE id = p_game_id
      AND status IN ('matched', 'active', 'in_progress')
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game not found or already completed';
    END IF;

    -- Determine loser
    IF p_winner_wallet = v_game.player1_wallet THEN
        v_loser_wallet := v_game.player2_wallet;
    ELSIF p_winner_wallet = v_game.player2_wallet THEN
        v_loser_wallet := v_game.player1_wallet;
    ELSE
        RAISE EXCEPTION 'Winner must be one of the players';
    END IF;

    v_payout := v_game.net_pot;
    v_house_fee := v_game.house_fee;

    -- Update game status
    UPDATE active_games
    SET status = 'completed',
        winner_wallet = p_winner_wallet,
        completed_at = NOW(),
        resolve_tx_signature = p_resolve_tx_signature
    WHERE id = p_game_id;

    -- Record game result
    INSERT INTO game_results (
        game_id,
        game_type,
        winner_wallet,
        loser_wallet,
        total_pot,
        payout,
        house_fee,
        resolve_tx_signature
    ) VALUES (
        p_game_id,
        v_game.game_type,
        p_winner_wallet,
        v_loser_wallet,
        v_game.total_pot,
        v_payout,
        v_house_fee,
        p_resolve_tx_signature
    );

    -- Record house earnings
    INSERT INTO house_earnings (game_id, game_type, fee_collected)
    VALUES (p_game_id, v_game.game_type, v_house_fee);

    -- Update user stats
    UPDATE users
    SET total_games_played = total_games_played + 1,
        total_games_won = total_games_won + 1,
        total_earnings = total_earnings + v_payout
    WHERE wallet_address = p_winner_wallet;

    UPDATE users
    SET total_games_played = total_games_played + 1,
        total_earnings = total_earnings - v_game.matched_wager
    WHERE wallet_address = v_loser_wallet;

    -- Create users if they don't exist
    INSERT INTO users (wallet_address, total_games_played, total_games_won, total_earnings)
    VALUES (p_winner_wallet, 1, 1, v_payout)
    ON CONFLICT (wallet_address) DO NOTHING;

    INSERT INTO users (wallet_address, total_games_played, total_games_won, total_earnings)
    VALUES (v_loser_wallet, 1, 0, -v_game.matched_wager)
    ON CONFLICT (wallet_address) DO NOTHING;

    RETURN QUERY SELECT TRUE, v_payout, v_house_fee;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Disable RLS first to clean slate
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE active_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE house_earnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE refunds DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users viewable by all" ON users;
DROP POLICY IF EXISTS "Queue viewable by player" ON match_queue;
DROP POLICY IF EXISTS "Games viewable by players" ON active_games;
DROP POLICY IF EXISTS "Results viewable by all" ON game_results;
DROP POLICY IF EXISTS "House earnings viewable by all" ON house_earnings;
DROP POLICY IF EXISTS "Refunds viewable by player" ON refunds;
DROP POLICY IF EXISTS "Moves viewable by all" ON game_moves;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- PERMISSIVE POLICIES (for testing - make more restrictive in production)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on match_queue" ON match_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on active_games" ON active_games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on game_results" ON game_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on house_earnings" ON house_earnings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on refunds" ON refunds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on game_moves" ON game_moves FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- VIEWS
-- ============================================

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    wallet_address,
    total_games_played,
    total_games_won,
    total_earnings,
    CASE
        WHEN total_games_played > 0
        THEN ROUND((total_games_won::NUMERIC / total_games_played::NUMERIC) * 100, 2)
        ELSE 0
    END as win_rate
FROM users
WHERE total_games_played > 0
ORDER BY total_games_won DESC, total_earnings DESC
LIMIT 100;

-- Active games count view
CREATE OR REPLACE VIEW active_games_summary AS
SELECT
    game_type,
    COUNT(*) as active_count,
    AVG(matched_wager) as avg_wager,
    SUM(total_pot) as total_pot_value
FROM active_games
WHERE status IN ('matched', 'active', 'in_progress')
GROUP BY game_type;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MATCHMAKING + ESCROW SYSTEM READY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE ' ';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - users';
    RAISE NOTICE '  - match_queue';
    RAISE NOTICE '  - active_games';
    RAISE NOTICE '  - game_results';
    RAISE NOTICE '  - house_earnings';
    RAISE NOTICE '  - refunds';
    RAISE NOTICE '  - game_moves';
    RAISE NOTICE ' ';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - find_or_create_match() - Atomic matchmaking';
    RAISE NOTICE '  - complete_game() - Winner payout logic';
    RAISE NOTICE ' ';
    RAISE NOTICE 'RLS enabled with permissive policies';
    RAISE NOTICE 'Views: leaderboard, active_games_summary';
    RAISE NOTICE ' ';
    RAISE NOTICE 'House fee: 5%% of total pot';
    RAISE NOTICE 'Ready to play!';
    RAISE NOTICE '========================================';
END $$;
