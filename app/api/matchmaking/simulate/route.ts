import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Simulation Mode API
 * Automatically creates a "bot" player to match with you for testing
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🎮 Simulate API called');
    const body = await request.json();
    console.log('📦 Request body:', body);
    const { walletAddress, gameType, wagerAmount } = body;

    if (!walletAddress || !gameType || wagerAmount === undefined) {
      console.error('❌ Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a simulated bot wallet address
    const botWallet = `BOT${Math.random().toString(36).substring(2, 15)}SIM`;
    console.log('🤖 Created bot wallet:', botWallet);

    // Ensure bot user exists
    const { data: existingBot } = await supabase.from('users').select('*').eq('wallet_address', botWallet).single();

    if (!existingBot) {
      await supabase.from('users').insert({
        wallet_address: botWallet,
        username: `TestBot_${Math.floor(Math.random() * 1000)}`,
        total_games_played: 0,
        total_games_won: 0,
        total_earnings: 0,
        created_at: new Date().toISOString(),
      });
    }

    // Ensure player exists
    const { data: existingPlayer } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (!existingPlayer) {
      await supabase.from('users').insert({
        wallet_address: walletAddress,
        username: `Player_${walletAddress.slice(0, 6)}`,
        total_games_played: 0,
        total_games_won: 0,
        total_earnings: 0,
        created_at: new Date().toISOString(),
      });
    }

    // Create game with both players immediately matched
    const houseFee = wagerAmount * 0.03;

    const { data: newGame, error: createError } = await supabase
      .from('games')
      .insert({
        game_type: gameType,
        player1_wallet: walletAddress,
        player2_wallet: botWallet,
        wager_amount: wagerAmount,
        house_fee: houseFee,
        status: 'in_progress', // Start immediately
        game_state: {
          isSimulation: true,
          botPlayer: botWallet,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        // Auto-mark as deposited for simulation
        player1_deposited: true,
        player2_deposited: true,
        player1_tx_signature: 'SIMULATION_TX_PLAYER',
        player2_tx_signature: 'SIMULATION_TX_BOT',
      })
      .select()
      .single();

    if (createError) {
      console.error('💥 Error creating simulation game:', createError);
      return NextResponse.json({ error: `Database error: ${createError.message}` }, { status: 500 });
    }

    console.log('✅ Game created successfully! ID:', newGame.id);
    return NextResponse.json({
      matched: true,
      gameId: newGame.id,
      opponent: botWallet,
      isSimulation: true,
      message: 'Simulation game created - both players deposited automatically',
    });
  } catch (error: any) {
    console.error('💥 Simulation error:', error);
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}
