import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    const wagerAmount = searchParams.get('wagerAmount');

    // Count players in queue (waiting games)
    let waitingQuery = supabase.from('games').select('*', { count: 'exact', head: true }).eq('status', 'waiting');

    if (gameType) {
      waitingQuery = waitingQuery.eq('game_type', gameType);
    }

    if (wagerAmount) {
      waitingQuery = waitingQuery.eq('wager_amount', parseFloat(wagerAmount));
    }

    const { count: playersInQueue } = await waitingQuery;

    // Count games in progress
    let progressQuery = supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    if (gameType) {
      progressQuery = progressQuery.eq('game_type', gameType);
    }

    const { count: gamesInProgress } = await progressQuery;

    // Calculate average wait time (simplified - based on completed games in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    let completedQuery = supabase
      .from('games')
      .select('created_at, started_at')
      .eq('status', 'completed')
      .gte('created_at', oneHourAgo)
      .not('started_at', 'is', null);

    if (gameType) {
      completedQuery = completedQuery.eq('game_type', gameType);
    }

    const { data: recentGames } = await completedQuery;

    let averageWaitTime = 12; // Default 12 seconds

    if (recentGames && recentGames.length > 0) {
      const waitTimes = recentGames
        .map((game) => {
          if (game.started_at && game.created_at) {
            const created = new Date(game.created_at).getTime();
            const started = new Date(game.started_at).getTime();
            return (started - created) / 1000; // Convert to seconds
          }
          return 0;
        })
        .filter((time) => time > 0 && time < 300); // Filter out outliers (< 5 min)

      if (waitTimes.length > 0) {
        averageWaitTime = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
      }
    }

    return NextResponse.json({
      playersInQueue: playersInQueue || 0,
      gamesInProgress: gamesInProgress || 0,
      averageWaitTime,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      {
        playersInQueue: 0,
        gamesInProgress: 0,
        averageWaitTime: 12,
      },
      { status: 200 }
    ); // Return defaults on error
  }
}
