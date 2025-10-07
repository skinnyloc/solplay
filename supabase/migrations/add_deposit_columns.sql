-- Add deposit tracking columns to games table

-- Add boolean flags for deposit status
ALTER TABLE games
ADD COLUMN IF NOT EXISTS player1_deposited BOOLEAN DEFAULT FALSE;

ALTER TABLE games
ADD COLUMN IF NOT EXISTS player2_deposited BOOLEAN DEFAULT FALSE;

-- Add transaction signature columns
ALTER TABLE games
ADD COLUMN IF NOT EXISTS player1_tx_signature TEXT;

ALTER TABLE games
ADD COLUMN IF NOT EXISTS player2_tx_signature TEXT;

-- Add deposit timestamps
ALTER TABLE games
ADD COLUMN IF NOT EXISTS player1_deposited_at TIMESTAMP;

ALTER TABLE games
ADD COLUMN IF NOT EXISTS player2_deposited_at TIMESTAMP;

-- Create index for faster queries on deposit status
CREATE INDEX IF NOT EXISTS idx_games_deposit_status
ON games(player1_deposited, player2_deposited);

-- Create index for transaction signatures
CREATE INDEX IF NOT EXISTS idx_games_tx_signatures
ON games(player1_tx_signature, player2_tx_signature);

-- Add comment to table
COMMENT ON COLUMN games.player1_deposited IS 'Whether player 1 has deposited their wager';
COMMENT ON COLUMN games.player2_deposited IS 'Whether player 2 has deposited their wager';
COMMENT ON COLUMN games.player1_tx_signature IS 'Solana transaction signature for player 1 deposit';
COMMENT ON COLUMN games.player2_tx_signature IS 'Solana transaction signature for player 2 deposit';
