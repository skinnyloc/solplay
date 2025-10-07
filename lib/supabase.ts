import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  wallet_address: string;
  username: string | null;
  total_games_played: number;
  total_games_won: number;
  total_earnings: number;
  created_at: string;
  last_seen: string;
}

export interface Game {
  id: string;
  game_type: 'chess' | 'checkers' | 'connect_four' | 'coin_flip';
  player1_wallet: string;
  player2_wallet: string | null;
  wager_amount: number;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  winner_wallet: string | null;
  game_state: any;
  escrow_pda: string | null;
  house_fee: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface GameMove {
  id: string;
  game_id: string;
  player_wallet: string;
  move_data: any;
  move_number: number;
  timestamp: string;
}

export interface LeaderboardEntry {
  wallet_address: string;
  username: string | null;
  total_wins: number;
  total_earnings: number;
  win_rate: number;
  rank: number;
}

// Helper functions

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found
        return null;
      }
      console.error('Error fetching user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserByWallet:', error);
    throw error;
  }
}

/**
 * Create a new user
 */
export async function createUser(walletAddress: string, username?: string): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          wallet_address: walletAddress,
          username: username || null,
          total_games_played: 0,
          total_games_won: 0,
          total_earnings: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

/**
 * Update user's last_seen timestamp
 */
export async function updateUserLastSeen(walletAddress: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('Error updating last_seen:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateUserLastSeen:', error);
    throw error;
  }
}

/**
 * Create a new game
 */
export async function createGame(
  gameType: 'chess' | 'checkers' | 'connect_four' | 'coin_flip',
  player1Wallet: string,
  wagerAmount: number
): Promise<Game> {
  try {
    // Calculate house fee (3%)
    const houseFee = wagerAmount * 0.03;

    const { data, error } = await supabase
      .from('games')
      .insert([
        {
          game_type: gameType,
          player1_wallet: player1Wallet,
          wager_amount: wagerAmount,
          house_fee: houseFee,
          status: 'waiting',
          game_state: {},
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating game:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createGame:', error);
    throw error;
  }
}

/**
 * Update game status
 */
export async function updateGameStatus(
  gameId: string,
  status: 'waiting' | 'active' | 'completed' | 'cancelled',
  additionalData?: Partial<Game>
): Promise<Game> {
  try {
    const updateData: any = { status };

    // Add timestamps based on status
    if (status === 'active' && !additionalData?.started_at) {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' && !additionalData?.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    // Merge additional data
    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    const { data, error } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)
      .select()
      .single();

    if (error) {
      console.error('Error updating game status:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateGameStatus:', error);
    throw error;
  }
}

/**
 * Get game by ID
 */
export async function getGameById(gameId: string): Promise<Game | null> {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching game:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getGameById:', error);
    throw error;
  }
}

/**
 * Get all waiting games (for matchmaking)
 */
export async function getWaitingGames(
  gameType?: 'chess' | 'checkers' | 'connect_four' | 'coin_flip'
): Promise<Game[]> {
  try {
    let query = supabase
      .from('games')
      .select('*')
      .eq('status', 'waiting')
      .is('player2_wallet', null);

    if (gameType) {
      query = query.eq('game_type', gameType);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching waiting games:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getWaitingGames:', error);
    throw error;
  }
}

/**
 * Join an existing game
 */
export async function joinGame(gameId: string, player2Wallet: string): Promise<Game> {
  try {
    const { data, error } = await supabase
      .from('games')
      .update({
        player2_wallet: player2Wallet,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .select()
      .single();

    if (error) {
      console.error('Error joining game:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in joinGame:', error);
    throw error;
  }
}

/**
 * Add a game move
 */
export async function addGameMove(
  gameId: string,
  playerWallet: string,
  moveData: any,
  moveNumber: number
): Promise<GameMove> {
  try {
    const { data, error } = await supabase
      .from('game_moves')
      .insert([
        {
          game_id: gameId,
          player_wallet: playerWallet,
          move_data: moveData,
          move_number: moveNumber,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding game move:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in addGameMove:', error);
    throw error;
  }
}

/**
 * Get all moves for a game
 */
export async function getGameMoves(gameId: string): Promise<GameMove[]> {
  try {
    const { data, error } = await supabase
      .from('game_moves')
      .select('*')
      .eq('game_id', gameId)
      .order('move_number', { ascending: true });

    if (error) {
      console.error('Error fetching game moves:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getGameMoves:', error);
    throw error;
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    throw error;
  }
}

/**
 * Get user's game history
 */
export async function getUserGames(walletAddress: string, limit: number = 50): Promise<Game[]> {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .or(`player1_wallet.eq.${walletAddress},player2_wallet.eq.${walletAddress}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user games:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserGames:', error);
    throw error;
  }
}
