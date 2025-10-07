import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const { gameId } = params;

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    // Fetch game from database
    const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();

    if (error || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if game has been matched
    if (game.status === 'in_progress' && game.player2_wallet) {
      return NextResponse.json({
        matched: true,
        gameId: game.id,
        opponent: game.player2_wallet,
        game,
      });
    }

    // Still waiting
    return NextResponse.json({
      matched: false,
      gameId: game.id,
      status: game.status,
    });
  } catch (error) {
    console.error('Check game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
