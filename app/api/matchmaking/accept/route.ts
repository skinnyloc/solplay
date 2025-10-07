import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, gameId } = body;

    if (!walletAddress || !gameId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the game to verify it's still available
    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('status', 'waiting')
      .is('player2_wallet', null)
      .single();

    if (fetchError || !game) {
      return NextResponse.json({ error: 'Game no longer available' }, { status: 404 });
    }

    // Join the game as player 2
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        player2_wallet: walletAddress,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .select()
      .single();

    if (updateError) {
      console.error('Error joining game:', updateError);
      return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
    }

    // Ensure both users exist
    await ensureUserExists(game.player1_wallet);
    await ensureUserExists(walletAddress);

    return NextResponse.json({
      matched: true,
      gameId: updatedGame.id,
      opponent: game.player1_wallet,
      wagerAmount: game.wager_amount,
      isPlayer1: false,
    });
  } catch (error) {
    console.error('Accept game error:', error);
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
