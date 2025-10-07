import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerWallet, playerChoice, wagerAmount } = body;

    if (!playerWallet || !playerChoice || !wagerAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Look for waiting opponent (either same choice or opposite choice - 50/50 random matchmaking)
    const { data: waitingGames, error: searchError } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'coin-flip')
      .eq('status', 'waiting')
      .eq('wager_amount', wagerAmount)
      .is('player2_wallet', null)
      .neq('player1_wallet', playerWallet)
      .limit(5);

    if (searchError) {
      console.error('Error searching for games:', searchError);
      return NextResponse.json({ error: 'Matchmaking failed' }, { status: 500 });
    }

    // If opponent found, join their game
    if (waitingGames && waitingGames.length > 0) {
      // Randomly select one of the waiting games
      const randomGame = waitingGames[Math.floor(Math.random() * waitingGames.length)];
      const player1Choice = randomGame.game_state?.player1Choice || 'heads';

      // Update game with player 2
      const { data: updatedGame, error: updateError } = await supabase
        .from('games')
        .update({
          player2_wallet: playerWallet,
          status: 'in_progress',
          game_state: {
            player1Choice,
            player2Choice: playerChoice,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', randomGame.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating game:', updateError);
        return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
      }

      return NextResponse.json({
        matched: true,
        gameId: updatedGame.id,
        player1Wallet: updatedGame.player1_wallet,
        player2Wallet: updatedGame.player2_wallet,
        player1Choice,
        player2Choice: playerChoice,
      });
    }

    // No opponent found, create new waiting game
    const { data: newGame, error: createError } = await supabase
      .from('games')
      .insert({
        game_type: 'coin-flip',
        player1_wallet: playerWallet,
        player2_wallet: null,
        wager_amount: wagerAmount,
        status: 'waiting',
        game_state: {
          player1Choice: playerChoice,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating game:', createError);
      return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
    }

    return NextResponse.json({
      matched: false,
      gameId: newGame.id,
      waiting: true,
    });
  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Check if a waiting game has been matched
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();

    if (error) {
      console.error('Error fetching game:', error);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({
      matched: game.status === 'in_progress',
      game,
    });
  } catch (error) {
    console.error('Check game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
