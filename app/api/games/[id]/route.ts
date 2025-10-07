import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gameId = params.id;

    const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();

    if (error || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gameId = params.id;

    // Only allow deleting games that are in 'waiting' status
    const { data: game } = await supabase.from('games').select('status').eq('id', gameId).single();

    if (!game || game.status !== 'waiting') {
      return NextResponse.json({ error: 'Cannot delete this game' }, { status: 400 });
    }

    const { error } = await supabase.from('games').delete().eq('id', gameId);

    if (error) {
      console.error('Error deleting game:', error);
      return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
