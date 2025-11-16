import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    // 1. Fetch the game to get all DB values
    const { data: game, error: gameFetchError } = await supabase
      .from('active_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameFetchError || !game) {
      console.error('Failed to fetch game:', gameFetchError);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const {
      player1_wallet,
      player2_wallet,
      matched_wager,
      total_pot,
      house_fee,
      net_pot,
      game_state
    } = game;

    // Extract choices from game_state
    const player1Choice = game_state?.player1Choice;
    const player2Choice = game_state?.player2Choice;

    if (!player1_wallet || !player2_wallet || !player1Choice || !player2Choice) {
      return NextResponse.json({ error: 'Game not ready - missing players or choices' }, { status: 400 });
    }

    if (!matched_wager || !total_pot || !house_fee || !net_pot) {
      return NextResponse.json({ error: 'Game not ready - missing pot calculations' }, { status: 400 });
    }

    // 2. Generate cryptographically secure random result
    const randomBytes = crypto.randomBytes(1);
    const result: 'heads' | 'tails' = randomBytes[0] % 2 === 0 ? 'heads' : 'tails';

    // 3. Determine winner and loser
    const winner = player1Choice === result ? player1_wallet : player2_wallet;
    const loser = winner === player1_wallet ? player2_wallet : player1_wallet;

    const winnerPayout = net_pot; // Winner gets net pot (total - house fee)

    // 4. Update game to completed status
    const { error: updateError } = await supabase
      .from('active_games')
      .update({
        status: 'completed',
        winner_wallet: winner,
        game_state: {
          ...game_state,
          result,
          randomSeed: randomBytes[0]
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Game update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }

    // 5. Update winner stats
    const { data: winnerData } = await supabase
      .from('users')
      .select('total_games_played, total_games_won, total_earnings')
      .eq('wallet_address', winner)
      .single();

    if (winnerData) {
      await supabase
        .from('users')
        .update({
          total_games_played: (winnerData.total_games_played || 0) + 1,
          total_games_won: (winnerData.total_games_won || 0) + 1,
          total_earnings: (winnerData.total_earnings || 0) + winnerPayout,
        })
        .eq('wallet_address', winner);
    } else {
      // Create winner user if doesn't exist
      await supabase.from('users').insert({
        wallet_address: winner,
        username: `Player_${winner.slice(0, 6)}`,
        total_games_played: 1,
        total_games_won: 1,
        total_earnings: winnerPayout,
      });
    }

    // 6. Update loser stats
    const { data: loserData } = await supabase
      .from('users')
      .select('total_games_played, total_earnings')
      .eq('wallet_address', loser)
      .single();

    if (loserData) {
      await supabase
        .from('users')
        .update({
          total_games_played: (loserData.total_games_played || 0) + 1,
          total_earnings: (loserData.total_earnings || 0) - matched_wager,
        })
        .eq('wallet_address', loser);
    } else {
      // Create loser user if doesn't exist
      await supabase.from('users').insert({
        wallet_address: loser,
        username: `Player_${loser.slice(0, 6)}`,
        total_games_played: 1,
        total_games_won: 0,
        total_earnings: -matched_wager,
      });
    }

    // 7. Insert game move for history
    await supabase.from('game_moves').insert({
      game_id: gameId,
      player_wallet: winner,
      move_data: { result, winner },
      move_number: 1,
    });

    // 8. Return complete result to frontend
    return NextResponse.json({
      success: true,
      result,
      winner,
      loser,
      winnerPayout,
      matched_wager,
      total_pot,
      house_fee,
      net_pot,
      randomSeed: randomBytes[0]
    });

  } catch (err) {
    console.error('Flip route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
