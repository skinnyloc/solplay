import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gameId = params.id;
    const body = await request.json();
    const { result, winner } = body;

    if (!result || !winner) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update game with result
    const { error } = await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_wallet: winner,
        game_state: {
          result,
          completedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (error) {
      console.error('Error finishing game:', error);
      return NextResponse.json({ error: 'Failed to finish game' }, { status: 500 });
    }

    // Update user stats
    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();

    if (game) {
      // Update winner stats
      await supabase.rpc('increment_user_stats', {
        wallet: winner,
        games_played: 1,
        games_won: 1,
        earnings: game.wager_amount * 2 - game.house_fee,
      });

      // Update loser stats
      const loser = game.player1_wallet === winner ? game.player2_wallet : game.player1_wallet;
      await supabase.rpc('increment_user_stats', {
        wallet: loser,
        games_played: 1,
        games_won: 0,
        earnings: -game.wager_amount,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error finishing game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
