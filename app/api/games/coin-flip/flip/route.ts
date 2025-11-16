import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, player1Wallet, player2Wallet, player1Choice, player2Choice } = body;

    // Validate input
    if (!gameId || !player1Wallet || !player2Wallet || !player1Choice || !player2Choice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch game to get actual wagers
    const { data: game, error: fetchError } = await supabase
      .from('active_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError || !game) {
      console.error('Error fetching game:', fetchError);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify both players are present
    if (!game.player2_wallet) {
      return NextResponse.json({ error: 'Game not ready - waiting for player 2' }, { status: 400 });
    }

    // Use matched_wager from game (already calculated when player 2 joined)
    const matchedWager = game.matched_wager;
    const totalPot = game.total_pot;
    const houseFee = game.house_fee;
    const netPot = game.net_pot;

    if (!matchedWager || !totalPot || !houseFee || !netPot) {
      console.error('Game missing pot calculations:', game);
      return NextResponse.json({ error: 'Game data incomplete' }, { status: 500 });
    }

    // Generate cryptographically secure random result
    const randomBytes = crypto.randomBytes(1);
    const result: 'heads' | 'tails' = randomBytes[0] % 2 === 0 ? 'heads' : 'tails';

    // Determine winner
    let winnerWallet: string;
    let loserWallet: string;

    if (player1Choice === result) {
      winnerWallet = player1Wallet;
      loserWallet = player2Wallet;
    } else {
      winnerWallet = player2Wallet;
      loserWallet = player1Wallet;
    }

    const winnerPayout = netPot; // Winner gets net pot (after house fee)

    // Update game in Supabase
    const { error: gameError } = await supabase
      .from("active_games")
      .update({
        status: 'completed',
        winner_wallet: winnerWallet,
        completed_at: new Date().toISOString(),
        game_state: {
          result,
          player1Choice,
          player2Choice,
          randomBytes: randomBytes[0], // For transparency/verification
        },
      })
      .eq('id', gameId);

    if (gameError) {
      console.error('Error updating game:', gameError);
      return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }

    // Insert game result into game_moves table
    const { error: moveError } = await supabase.from('game_moves').insert({
      game_id: gameId,
      player_wallet: winnerWallet,
      move_data: { result, winner: winnerWallet },
      move_number: 1,
    });

    if (moveError) {
      console.error('Error inserting move:', moveError);
    }

    // Update winner stats
    const { data: winnerData } = await supabase
      .from('users')
      .select('total_games_played, total_games_won, total_earnings')
      .eq('wallet_address', winnerWallet)
      .single();

    if (winnerData) {
      await supabase
        .from('users')
        .update({
          total_games_played: (winnerData.total_games_played || 0) + 1,
          total_games_won: (winnerData.total_games_won || 0) + 1,
          total_earnings: (winnerData.total_earnings || 0) + winnerPayout,
        })
        .eq('wallet_address', winnerWallet);
    }

    // Update loser stats
    const { data: loserData } = await supabase
      .from('users')
      .select('total_games_played, total_earnings')
      .eq('wallet_address', loserWallet)
      .single();

    if (loserData) {
      await supabase
        .from('users')
        .update({
          total_games_played: (loserData.total_games_played || 0) + 1,
          total_earnings: (loserData.total_earnings || 0) - matchedWager,
        })
        .eq('wallet_address', loserWallet);
    }

    return NextResponse.json({
      result,
      winner: winnerWallet,
      winnerPayout,
      houseFee,
      randomSeed: randomBytes[0],
    });
  } catch (error) {
    console.error('Coin flip error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
