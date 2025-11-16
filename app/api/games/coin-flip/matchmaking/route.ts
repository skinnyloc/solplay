import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerWallet, playerChoice, wagerAmount } = body;

    if (!playerWallet || !playerChoice || !wagerAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // First try exact wager match
    let { data: waitingGames, error: searchError } = await supabase
      .from("active_games")
      .select('*')
      .eq('game_type', 'coin_flip')
      .eq('status', 'waiting')
      .eq('player1_wager', wagerAmount)
      .is('player2_wallet', null)
      .neq('player1_wallet', playerWallet)
      .order('created_at', { ascending: true })
      .limit(1);

    // If no exact match, try flexible matching (equal or lower wager)
    if (!waitingGames || waitingGames.length === 0) {
      const { data: flexibleGames } = await supabase
        .from("active_games")
        .select('*')
        .eq('game_type', 'coin_flip')
        .lte('player1_wager', wagerAmount) // Less than or equal
        .eq('status', 'waiting')
        .is('player2_wallet', null)
        .neq('player1_wallet', playerWallet)
        .order('player1_wager', { ascending: false }) // Prefer highest wager
        .order('created_at', { ascending: true }) // Then oldest
        .limit(1);

      waitingGames = flexibleGames || [];
    }

    if (searchError) {
      console.error('Error searching for games:', searchError);
      return NextResponse.json({ error: 'Matchmaking failed' }, { status: 500 });
    }

    // If opponent found, join their game
    if (waitingGames && waitingGames.length > 0) {
      // Randomly select one of the waiting games
      const randomGame = waitingGames[Math.floor(Math.random() * waitingGames.length)];
      const player1Choice = randomGame.game_state?.player1Choice || 'heads';

      // Calculate matched wager, pot, and fees
      const matchedWager = Math.min(randomGame.player1_wager, wagerAmount);
      const totalPot = matchedWager * 2;
      const houseFee = totalPot * 0.03; // 3% house fee
      const netPot = totalPot - houseFee;

      // Update game with player 2
      const { data: updatedGame, error: updateError } = await supabase
        .from("active_games")
        .update({
          player2_wallet: playerWallet,
          player2_wager: wagerAmount,
          matched_wager: matchedWager,
          total_pot: totalPot,
          house_fee: houseFee,
          net_pot: netPot,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          game_state: {
            player1Choice,
            player2Choice: playerChoice,
          },
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
    // Initialize player1_wager, but leave player2_wager null until matched
    const { data: newGame, error: createError } = await supabase
      .from("active_games")
      .insert({
        game_type: 'coin_flip',
        player1_wallet: playerWallet,
        player2_wallet: null,
        player1_wager: wagerAmount,
        player2_wager: null,
        matched_wager: null,
        total_pot: null,
        house_fee: null,
        net_pot: null,
        status: 'waiting',
        player1_deposited: false,
        player2_deposited: false,
        game_state: {
          player1Choice: playerChoice,
        },
        created_at: new Date().toISOString(),
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

    const { data: game, error } = await supabase.from("active_games").select('*').eq('id', gameId).single();

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
