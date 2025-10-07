import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, gameType, wagerAmount } = body;

    if (!walletAddress || !gameType || wagerAmount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate game type
    const validGameTypes = ['chess', 'checkers', 'connect-four', 'coin-flip'];
    if (!validGameTypes.includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    // First try to find exact match (same wager)
    let { data: waitingGames, error: searchError } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', gameType)
      .eq('wager_amount', wagerAmount)
      .eq('status', 'waiting')
      .is('player2_wallet', null)
      .neq('player1_wallet', walletAddress) // Don't match with yourself
      .order('created_at', { ascending: true })
      .limit(1);

    // If no exact match, find games with equal or lower wager
    if (!waitingGames || waitingGames.length === 0) {
      const { data: flexibleGames } = await supabase
        .from('games')
        .select('*')
        .eq('game_type', gameType)
        .lte('wager_amount', wagerAmount) // Less than or equal to your wager
        .eq('status', 'waiting')
        .is('player2_wallet', null)
        .neq('player1_wallet', walletAddress)
        .order('wager_amount', { ascending: false }) // Prefer highest wager first
        .order('created_at', { ascending: true }) // Then oldest first
        .limit(3); // Get top 3 options

      if (flexibleGames && flexibleGames.length > 0) {
        // Return available games for user to choose
        return NextResponse.json({
          matched: false,
          availableGames: flexibleGames.map(g => ({
            gameId: g.id,
            wagerAmount: g.wager_amount,
            opponent: g.player1_wallet,
          })),
          message: 'No exact match. Would you like to join a game with different wager?',
        });
      }

      waitingGames = null; // No matches at all
    }

    if (searchError) {
      console.error('Error searching for games:', searchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (waitingGames && waitingGames.length > 0) {
      // Match found! Add as player 2
      const matchedGame = waitingGames[0];

      const { data: updatedGame, error: updateError } = await supabase
        .from('games')
        .update({
          player2_wallet: walletAddress,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchedGame.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating game:', updateError);
        return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
      }

      // Initialize both players' stats if needed
      await ensureUserExists(matchedGame.player1_wallet);
      await ensureUserExists(walletAddress);

      return NextResponse.json({
        matched: true,
        gameId: updatedGame.id,
        opponent: matchedGame.player1_wallet,
        isPlayer1: false,
      });
    } else {
      // No match found - Create new game (player 1 waiting)
      const houseFee = wagerAmount * 0.03;

      const { data: newGame, error: createError } = await supabase
        .from('games')
        .insert({
          game_type: gameType,
          player1_wallet: walletAddress,
          player2_wallet: null,
          wager_amount: wagerAmount,
          house_fee: houseFee,
          status: 'waiting',
          game_state: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating game:', createError);
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
      }

      // Ensure user exists
      await ensureUserExists(walletAddress);

      return NextResponse.json({
        matched: false,
        gameId: newGame.id,
        isPlayer1: true,
      });
    }
  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to ensure user exists in database
async function ensureUserExists(walletAddress: string) {
  const { data: existingUser } = await supabase.from('users').select('*').eq('wallet_address', walletAddress).single();

  if (!existingUser) {
    await supabase.from('users').insert({
      wallet_address: walletAddress,
      username: `Player_${walletAddress.slice(0, 6)}`,
      total_games_played: 0,
      total_games_won: 0,
      total_earnings: 0,
      created_at: new Date().toISOString(),
    });
  }
}
