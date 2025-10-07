import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, playerWallet, signature, amount } = body;

    if (!gameId || !playerWallet || !signature || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify transaction on-chain
    let tx;
    try {
      tx = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return NextResponse.json({ error: 'Failed to verify transaction' }, { status: 500 });
    }

    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found on blockchain' }, { status: 400 });
    }

    // Verify transaction was successful
    if (tx.meta?.err) {
      return NextResponse.json({ error: 'Transaction failed on blockchain' }, { status: 400 });
    }

    // Get game from database
    const { data: game, error: gameError } = await supabase.from('games').select('*').eq('id', gameId).single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Determine which player deposited
    const isPlayer1 = game.player1_wallet === playerWallet;
    const isPlayer2 = game.player2_wallet === playerWallet;

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Player not in this game' }, { status: 400 });
    }

    // Update game with deposit confirmation
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (isPlayer1) {
      updateData.player1_deposited = true;
      updateData.player1_tx_signature = signature;
    } else {
      updateData.player2_deposited = true;
      updateData.player2_tx_signature = signature;
    }

    const { error: updateError } = await supabase.from('games').update(updateData).eq('id', gameId);

    if (updateError) {
      console.error('Error updating game:', updateError);
      return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }

    // Check if both players have deposited
    const bothDeposited = isPlayer1 ? game.player2_deposited : game.player1_deposited;

    if (bothDeposited) {
      // Both players deposited - activate the game
      await supabase
        .from('games')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      return NextResponse.json({
        success: true,
        bothDeposited: true,
        gameReady: true,
      });
    }

    return NextResponse.json({
      success: true,
      bothDeposited: false,
      waitingForOpponent: true,
    });
  } catch (error) {
    console.error('Confirm deposit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
