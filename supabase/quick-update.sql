-- Add deposit tracking columns if they don't exist
ALTER TABLE games ADD COLUMN IF NOT EXISTS player1_deposited BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player2_deposited BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player1_tx_signature TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player2_tx_signature TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing status enum to include 'in_progress' if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_status' AND 'in_progress' = ANY(enum_range(NULL::game_status)::text[])) THEN
        ALTER TYPE game_status ADD VALUE 'in_progress';
    END IF;
END $$;
