'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';

type CoinSide = 'heads' | 'tails';
type CoinState = 'idle' | 'flipping' | 'heads' | 'tails';

export default function CoinFlipPlayPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const gameId = params.id as string;

  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulation, setIsSimulation] = useState(false);
  const [coinState, setCoinState] = useState<CoinState>('idle');
  const [result, setResult] = useState<CoinSide | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasFlipped, setHasFlipped] = useState(false);

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

      // Auto-start flip for simulation mode
      if (data.game.game_state?.isSimulation && data.game.status === 'in_progress') {
        setTimeout(() => {
          startCoinFlip(data.game);
        }, 2000);
      }
    } catch (error) {
      console.error('Error fetching game:', error);
      toast('Failed to load game', { icon: '❌' });
      router.push('/');
    }
  };

  const startCoinFlip = async (gameData: any) => {
    if (hasFlipped) return;
    setHasFlipped(true);
    setCoinState('flipping');

    try {
      // For simulation, we'll use a random result
      const flipResult: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';

      // Wait for coin animation (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Set result
      setResult(flipResult);
      setCoinState(flipResult);

      // Determine winner based on player choice (stored in game_state)
      const playerChoice = gameData.game_state?.player1Choice || 'heads';
      const won = flipResult === playerChoice;
      setIsWinner(won);

      // Update game in database
      await fetch(`/api/games/${gameId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: flipResult,
          winner: won ? gameData.player1_wallet : gameData.player2_wallet,
        }),
      });

      if (won) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (error) {
      console.error('Coin flip error:', error);
      toast('Flip failed. Please try again.', { icon: '❌' });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🪙</div>
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

  const playerChoice = game.game_state?.player1Choice || 'heads';
  const opponentChoice = playerChoice === 'heads' ? 'tails' : 'heads';
  const houseFee = game.house_fee || game.wager_amount * 0.03;
  const potentialWin = game.wager_amount * 2 - houseFee;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#fbbf24', '#14b8a6', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 4)],
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
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
              <div className="text-5xl">🪙</div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-transparent bg-clip-text">
                  Coin Flip Game
                </h1>
                <p className="text-slate-400">
                  {game.wager_amount} SOL • {isSimulation ? '🧪 Simulation Mode' : 'Live Match'}
                </p>
              </div>
            </div>

            <div className="glass-card px-6 py-3 rounded-xl">
              <div className="text-sm text-slate-400">Prize Pool</div>
              <div className="text-2xl font-bold text-teal-400">
                {potentialWin.toFixed(4)} SOL
              </div>
            </div>
          </div>
        </div>

        {isSimulation && !result && (
          <div className="glass-card rounded-xl p-4 mb-6 bg-blue-500/10 border-2 border-blue-500">
            <p className="text-sm text-blue-300">
              <strong>🧪 Simulation Mode:</strong> Watch the coin flip automatically! The result is randomly generated for testing.
            </p>
          </div>
        )}

        {/* Game Area */}
        <div className="glass-card rounded-2xl p-8 mb-6">
          {!result ? (
            <>
              {/* Flipping Phase */}
              <div className="flex flex-col items-center justify-center">
                <h2 className="text-3xl font-bold mb-8">
                  {coinState === 'flipping' ? 'Coin is Flipping!' : 'Ready to Flip!'}
                </h2>

                {/* Player Choices Display */}
                <div className="flex justify-center gap-8 mb-8">
                  <div className="flex flex-col items-center">
                    <span className="text-slate-400 text-sm mb-2">You</span>
                    <div className="text-4xl">{playerChoice === 'heads' ? '👑' : '🦅'}</div>
                    <span className="font-bold mt-2">{playerChoice.toUpperCase()}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="text-4xl">⚔️</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-slate-400 text-sm mb-2">Opponent</span>
                    <div className="text-4xl">{opponentChoice === 'heads' ? '👑' : '🦅'}</div>
                    <span className="font-bold mt-2">{opponentChoice.toUpperCase()}</span>
                  </div>
                </div>

                {/* Animated Coin */}
                <div className="coin-container mb-8">
                  <div className={`coin ${coinState === 'flipping' ? 'flipping' : ''}`}>
                    <div className="coin-face coin-heads">
                      <div className="text-8xl">👑</div>
                    </div>
                    <div className="coin-face coin-tails">
                      <div className="text-8xl">🦅</div>
                    </div>
                  </div>
                </div>

                <p className="text-xl text-slate-400">Good luck!</p>
              </div>
            </>
          ) : (
            <>
              {/* Result Phase */}
              <div className="text-center">
                <div className={`mb-8 ${isWinner ? 'animate-bounce' : ''}`}>
                  <div className="text-8xl mb-4">{result === 'heads' ? '👑' : '🦅'}</div>
                  <h2 className="text-4xl font-bold mb-2">The coin landed on {result.toUpperCase()}!</h2>
                </div>

                <div
                  className={`p-8 rounded-2xl mb-8 ${
                    isWinner ? 'bg-green-500/20 border-4 border-green-500' : 'bg-red-500/20 border-4 border-red-500'
                  }`}
                >
                  <h3 className={`text-5xl font-bold mb-4 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                    {isWinner ? '🎉 YOU WON! 🎉' : '😔 YOU LOST'}
                  </h3>
                  <p className="text-3xl font-bold">
                    {isWinner ? `+${potentialWin.toFixed(4)} SOL` : `-${game.wager_amount.toFixed(4)} SOL`}
                  </p>
                  {isWinner && (
                    <p className="text-sm text-slate-400 mt-2">(House fee: {houseFee.toFixed(5)} SOL deducted)</p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/test-game')}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:shadow-glow"
                  >
                    Test Another Game
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl font-bold text-lg transition-all duration-200"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Game Info Sidebar */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4">Game Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Bet amount:</span>
              <span className="text-white font-semibold">{game.wager_amount.toFixed(3)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">House fee (3%):</span>
              <span className="text-orange-400 font-semibold">{houseFee.toFixed(5)} SOL</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-700">
              <span className="text-slate-400">Winner gets:</span>
              <span className="text-teal-400 font-bold">{potentialWin.toFixed(4)} SOL</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .coin-container {
          perspective: 1000px;
          width: 200px;
          height: 200px;
        }

        .coin {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.1s;
        }

        .coin.flipping {
          animation: coinFlip 2s cubic-bezier(0.5, 0.1, 0.3, 1);
        }

        @keyframes coinFlip {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(3600deg);
          }
        }

        .coin-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(145deg, #fbbf24, #d97706);
          border: 8px solid #92400e;
          box-shadow: 0 10px 30px rgba(251, 191, 36, 0.5);
        }

        .coin-tails {
          transform: rotateY(180deg);
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: fall 3s linear forwards;
        }

        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
