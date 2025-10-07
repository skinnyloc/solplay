'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { ConnectFourBoard } from '@/components/ConnectFourBoard';

export default function ConnectFourGamePage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const gameId = params.id as string;

  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulation, setIsSimulation] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      router.push('/');
      return;
    }

    fetchGame();
  }, [gameId, publicKey]);

  const fetchGame = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      const data = await response.json();

      if (data.error) {
        toast(data.error, { icon: '❌' });
        router.push('/');
        return;
      }

      setGame(data.game);
      setIsSimulation(data.game.game_state?.isSimulation || false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching game:', error);
      toast('Failed to load game', { icon: '❌' });
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🔵</div>
          <p className="text-xl text-slate-400">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-xl text-slate-400">Game not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const playerColor =
    game.player1_wallet === publicKey?.toBase58() ? 'red' : 'yellow';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors"
          >
            <span>←</span> Back to Home
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🔵</div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">
                  Connect Four Game
                </h1>
                <p className="text-slate-400">
                  {game.wager_amount} SOL • {isSimulation ? '🧪 Simulation Mode' : 'Live Match'}
                </p>
              </div>
            </div>

            <div className="glass-card px-6 py-3 rounded-xl">
              <div className="text-sm text-slate-400">Prize Pool</div>
              <div className="text-2xl font-bold text-teal-400">
                {(game.wager_amount * 2 - game.house_fee).toFixed(4)} SOL
              </div>
            </div>
          </div>
        </div>

        {isSimulation && (
          <div className="glass-card rounded-xl p-4 mb-6 bg-blue-500/10 border-2 border-blue-500">
            <p className="text-sm text-blue-300">
              <strong>🧪 Simulation Mode:</strong> You control both players for testing. Drop pieces
              for both red and yellow to test the complete gameplay flow.
            </p>
          </div>
        )}

        {/* Connect Four Board */}
        <ConnectFourBoard />
      </div>
    </div>
  );
}
