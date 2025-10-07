import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const { gameId } = params;

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    // Fetch game to verify it's in waiting status
    const { data: game, error: fetchError } = await supabase.from('games').select('*').eq('id', gameId).single();

    if (fetchError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Only allow canceling games that are still waiting
    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Cannot cancel game in progress' }, { status: 400 });
    }

    // Delete the game
    const { error: deleteError } = await supabase.from('games').delete().eq('id', gameId);

    if (deleteError) {
      console.error('Error deleting game:', deleteError);
      return NextResponse.json({ error: 'Failed to cancel game' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Game canceled successfully' });
  } catch (error) {
    console.error('Cancel game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
