'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

type QueueStatus = 'idle' | 'searching' | 'found';
type GameType = 'chess' | 'checkers' | 'connect-four' | 'coin-flip';

interface MatchmakingQueueProps {
  gameType: GameType;
  walletAddress: string | null;
  wagerAmount: number;
  onMatchFound?: (gameId: string, opponentWallet: string) => void;
  disabled?: boolean;
}

interface QueueStats {
  playersInQueue: number;
  averageWaitTime: number;
  gamesInProgress: number;
}

export const MatchmakingQueue = ({
  gameType,
  walletAddress,
  wagerAmount,
  onMatchFound,
  disabled = false,
}: MatchmakingQueueProps) => {
  const router = useRouter();
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('idle');
  const [queueTime, setQueueTime] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    playersInQueue: 0,
    averageWaitTime: 0,
    gamesInProgress: 0,
  });

  // Timer for queue duration
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (queueStatus === 'searching') {
      interval = setInterval(() => {
        setQueueTime((prev) => prev + 1);
      }, 1000);
    } else {
      setQueueTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [queueStatus]);

  // Fetch queue statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/matchmaking/stats?gameType=${gameType}&wagerAmount=${wagerAmount}`);
        if (response.ok) {
          const data = await response.json();
          setQueueStats(data);
        }
      } catch (error) {
        console.error('Error fetching queue stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [gameType, wagerAmount]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFindMatch = async () => {
    if (!walletAddress) {
      toast('Please connect your wallet!', { icon: '⚠️' });
      return;
    }

    setQueueStatus('searching');
    setQueueTime(0);

    try {
      const response = await fetch('/api/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          gameType,
          wagerAmount,
        }),
      });

      const data = await response.json();

      if (data.matched) {
        // Immediate match found
        setQueueStatus('found');
        toast('Match found!', { icon: '🎮' });

        if (onMatchFound) {
          onMatchFound(data.gameId, data.opponent);
        } else {
          setTimeout(() => {
            router.push(`/games/${gameType}/play/${data.gameId}`);
          }, 1000);
        }
      } else {
        // Waiting for match - start polling
        setGameId(data.gameId);
        startPolling(data.gameId);
      }
    } catch (error) {
      console.error('Matchmaking error:', error);
      toast('Failed to join matchmaking. Try again.', { icon: '❌' });
      setQueueStatus('idle');
    }
  };

  const startPolling = (currentGameId: string) => {
    let pollCount = 0;
    const maxPolls = 30; // 60 seconds with 2 second intervals

    const interval = setInterval(async () => {
      pollCount++;

      try {
        const response = await fetch(`/api/matchmaking/check/${currentGameId}`);
        const data = await response.json();

        if (data.matched) {
          // Match found!
          clearInterval(interval);
          setQueueStatus('found');
          toast('Match found!', { icon: '🎮' });

          if (onMatchFound) {
            onMatchFound(data.gameId, data.opponent);
          } else {
            setTimeout(() => {
              router.push(`/games/${gameType}/play/${data.gameId}`);
            }, 1000);
          }
        } else if (pollCount >= maxPolls) {
          // Timeout
          clearInterval(interval);
          handleCancelQueue();
          toast('No match found. Please try again!', { icon: '⏱️' });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    // Store interval ID for cleanup
    return interval;
  };

  const handleCancelQueue = async () => {
    if (gameId) {
      try {
        await fetch(`/api/matchmaking/cancel/${gameId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error canceling queue:', error);
      }
    }

    setQueueStatus('idle');
    setGameId(null);
    setQueueTime(0);
    toast('Matchmaking canceled', { icon: 'ℹ️' });
  };

  return (
    <div className="space-y-4">
      {/* Main button */}
      {queueStatus === 'idle' && (
        <button
          onClick={handleFindMatch}
          disabled={disabled || !walletAddress}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Find Match
        </button>
      )}

      {queueStatus === 'searching' && (
        <div className="space-y-3">
          <div className="bg-slate-800/50 border-2 border-teal-500 rounded-xl p-6 text-center animate-pulse">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-3 h-3 bg-teal-500 rounded-full animate-ping"></div>
              <h3 className="text-xl font-bold text-teal-400">Searching for Opponent...</h3>
            </div>
            <p className="text-2xl font-mono font-bold text-white">{formatTime(queueTime)}</p>
            <p className="text-sm text-slate-400 mt-2">Looking for players with {wagerAmount} SOL wager</p>
          </div>

          <button
            onClick={handleCancelQueue}
            className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl font-semibold transition-all"
          >
            Cancel Search
          </button>
        </div>
      )}

      {queueStatus === 'found' && (
        <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="text-xl font-bold text-green-400 mb-2">Match Found!</h3>
          <p className="text-slate-300">Starting game...</p>
        </div>
      )}

      {/* Queue statistics */}
      {queueStatus === 'idle' && (
        <div className="glass-card rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-400 mb-3">Queue Statistics</h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Players in queue:</span>
              <span className="font-bold text-teal-400">{queueStats.playersInQueue}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Average wait time:</span>
              <span className="font-bold text-white">{queueStats.averageWaitTime}s</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Games in progress:</span>
              <span className="font-bold text-white">{queueStats.gamesInProgress}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tips while searching */}
      {queueStatus === 'searching' && (
        <div className="glass-card rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-400 mb-2">💡 While you wait...</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Matchmaking usually takes 10-30 seconds</li>
            <li>• You&apos;ll be matched with a player betting {wagerAmount} SOL</li>
            <li>• Make sure you have enough SOL in your wallet</li>
            <li>• Keep this tab open for the best experience</li>
          </ul>
        </div>
      )}
    </div>
  );
};
