'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { DemoModeBanner } from '@/components/DemoModeBanner';

type CoinSide = 'heads' | 'tails';
type GamePhase = 'selection' | 'waiting' | 'confirming' | 'flipping' | 'result';
type CoinState = 'idle' | 'flipping' | 'heads' | 'tails';

const BET_AMOUNTS = [0.001, 0.005, 0.01];

export default function CoinFlipPage() {
  const router = useRouter();
  const { publicKey } = useWallet();

  const [gamePhase, setGamePhase] = useState<GamePhase>('selection');
  const [coinState, setCoinState] = useState<CoinState>('idle');
  const [playerChoice, setPlayerChoice] = useState<CoinSide>('heads');
  const [opponentChoice, setOpponentChoice] = useState<CoinSide | null>(null);
  const [betAmount, setBetAmount] = useState(0.005);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [opponentWallet, setOpponentWallet] = useState<string | null>(null);
  const [winnerPayout, setWinnerPayout] = useState(0);
  const [choiceLocked, setChoiceLocked] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      router.push('/');
    }
  }, [publicKey, router]);

  // Poll for matchmaking
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gamePhase === 'waiting' && gameId) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/games/coin-flip/matchmaking?gameId=${gameId}`);
          const data = await response.json();

          if (data.matched && data.game) {
            setOpponentWallet(data.game.player2_wallet);
            setOpponentChoice(data.game.game_state.player2Choice);
            setGamePhase('confirming');
            clearInterval(interval);
            toast('Opponent found!', { icon: '✅' });

            // Auto-start flip after 2 seconds
            setTimeout(() => {
              startCoinFlip();
            }, 2000);
          }
        } catch (error) {
          console.error('Matchmaking poll error:', error);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gamePhase, gameId]);

  const houseFee = betAmount * 0.03;
  const potentialWin = betAmount * 2 - houseFee;

  const handleFindOpponent = async () => {
    if (!publicKey) {
      toast('Please connect your wallet!', { icon: '⚠️' });
      return;
    }

    setChoiceLocked(true);
    setGamePhase('waiting');

    try {
      const response = await fetch('/api/games/coin-flip/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerWallet: publicKey.toBase58(),
          playerChoice,
          wagerAmount: betAmount,
        }),
      });

      const data = await response.json();

      if (data.matched) {
        // Immediately matched - we are player 2, so opponent is player 1
        setGameId(data.gameId);
        setOpponentWallet(data.player1Wallet); // Fixed: opponent is player1
        setOpponentChoice(data.player1Choice); // Fixed: get player1's choice
        setGamePhase('confirming');
        toast('Opponent found!', { icon: '✅' });

        // Auto-start flip after 2 seconds
        setTimeout(() => {
          startCoinFlip();
        }, 2000);
      } else {
        // Waiting for opponent
        setGameId(data.gameId);
        toast('Searching for opponent...', { icon: '🔍' });
      }
    } catch (error) {
      console.error('Matchmaking error:', error);
      toast('Matchmaking failed. Try again.', { icon: '❌' });
      setGamePhase('selection');
      setChoiceLocked(false);
    }
  };

  const startCoinFlip = async () => {
    setGamePhase('flipping');
    setCoinState('flipping');

    if (!publicKey || !gameId || !opponentWallet || !opponentChoice) {
      toast('Game state error!', { icon: '❌' });
      return;
    }

    try {
      // Determine who is player1 vs player2
      // If we created the game (waiting), we are player1
      // If we joined a game (matched immediately), we are player2
      const myWallet = publicKey.toBase58();

      // Fetch game to see who is who
      const gameResponse = await fetch(`/api/games/${gameId}`);
      const { game: gameData } = await gameResponse.json();

      console.log('📋 Game Data:', gameData);

      if (!gameData) {
        toast('Game not found!', { icon: '❌' });
        setGamePhase('selection');
        setChoiceLocked(false);
        return;
      }

      const isPlayer1 = gameData.player1_wallet === myWallet;
      const actualWagerAmount = gameData.wager_amount; // Use actual wager from game

      console.log('🎯 isPlayer1:', isPlayer1);
      console.log('💰 Actual Wager:', actualWagerAmount);

      // Call server-side flip API with correct player assignments
      const response = await fetch('/api/games/coin-flip/flip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          player1Wallet: isPlayer1 ? myWallet : opponentWallet,
          player2Wallet: isPlayer1 ? opponentWallet : myWallet,
          player1Choice: isPlayer1 ? playerChoice : opponentChoice,
          player2Choice: isPlayer1 ? opponentChoice : playerChoice,
          wagerAmount: actualWagerAmount, // Use game's actual wager
        }),
      });

      console.log('📤 Flip Request:', {
        gameId,
        player1Wallet: isPlayer1 ? myWallet : opponentWallet,
        player2Wallet: isPlayer1 ? opponentWallet : myWallet,
        player1Choice: isPlayer1 ? playerChoice : opponentChoice,
        player2Choice: isPlayer1 ? opponentChoice : playerChoice,
        wagerAmount: actualWagerAmount,
      });

      const data = await response.json();

      console.log('🎲 Flip API Response:', data);

      if (data.error) {
        console.error('❌ Flip API Error:', data.error);
        toast(data.error, { icon: '❌' });
        setGamePhase('selection');
        setChoiceLocked(false);
        return;
      }

      // Validate we got the necessary data
      if (!data.result || !data.winner) {
        console.error('❌ Invalid flip response:', data);
        toast('Invalid game result. Please try again.', { icon: '❌' });
        setGamePhase('selection');
        setChoiceLocked(false);
        return;
      }

      // Wait for coin animation (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Set result
      const flipResult = data.result as CoinSide;
      setResult(flipResult);
      setCoinState(flipResult);

      // Check if player won
      const won = data.winner === publicKey.toBase58();
      console.log('🏆 Winner:', data.winner);
      console.log('👤 My Wallet:', publicKey.toBase58());
      console.log('✅ Did I Win?', won);

      setIsWinner(won);
      setWinnerPayout(data.winnerPayout);

      if (won) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      // Show result after brief delay
      setTimeout(() => {
        console.log('📊 Setting game phase to result');
        setGamePhase('result');
      }, 500);
    } catch (error) {
      console.error('💥 Coin flip error:', error);
      toast('Flip failed. Please try again.', { icon: '❌' });
      setGamePhase('selection');
      setChoiceLocked(false);
    }
  };

  const handleRematch = () => {
    setGamePhase('selection');
    setCoinState('idle');
    setResult(null);
    setIsWinner(false);
    setShowConfetti(false);
    setGameId(null);
    setOpponentWallet(null);
    setOpponentChoice(null);
    setChoiceLocked(false);
  };

  const handleCancelWaiting = async () => {
    if (gameId) {
      // Delete the waiting game
      try {
        await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Error canceling game:', error);
      }
    }

    setGamePhase('selection');
    setGameId(null);
    setChoiceLocked(false);
    toast('Matchmaking canceled', { icon: 'ℹ️' });
  };

  const truncateWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Demo Mode Banner */}
      <DemoModeBanner />

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

      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors"
        >
          <span>←</span> Back to Games
        </button>

        {/* Game Header */}
        <div className="glass-card rounded-2xl p-6 mb-6 text-center">
          <div className="flex items-center justify-center gap-4">
            <div className="text-5xl">🪙</div>
            <div className="text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-transparent bg-clip-text">
                Coin Flip
              </h1>
              <p className="text-slate-300">Call heads or tails and win double!</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Game Area */}
          <div className="flex-1">
            {/* Selection Phase */}
            {gamePhase === 'selection' && (
              <div className="glass-card rounded-2xl p-8 space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Choose Your Side</h2>
                  <p className="text-slate-400">Pick heads or tails (choice locked after finding opponent)</p>
                </div>

                {/* Choice Buttons */}
                <div className="grid grid-cols-2 gap-6">
                  <button
                    onClick={() => !choiceLocked && setPlayerChoice('heads')}
                    disabled={choiceLocked}
                    className={`p-8 rounded-2xl border-4 transition-all duration-200 ${
                      playerChoice === 'heads'
                        ? 'border-yellow-500 bg-yellow-500/20 shadow-glow'
                        : 'border-slate-700 bg-slate-800/50 hover:border-yellow-500/50'
                    } ${choiceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-6xl mb-3">👑</div>
                    <div className="text-2xl font-bold">HEADS</div>
                  </button>

                  <button
                    onClick={() => !choiceLocked && setPlayerChoice('tails')}
                    disabled={choiceLocked}
                    className={`p-8 rounded-2xl border-4 transition-all duration-200 ${
                      playerChoice === 'tails'
                        ? 'border-orange-500 bg-orange-500/20 shadow-glow'
                        : 'border-slate-700 bg-slate-800/50 hover:border-orange-500/50'
                    } ${choiceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-6xl mb-3">🦅</div>
                    <div className="text-2xl font-bold">TAILS</div>
                  </button>
                </div>

                {/* Bet Selection */}
                <div>
                  <h3 className="text-xl font-bold mb-4 text-center">Select Bet Amount</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {BET_AMOUNTS.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setBetAmount(amount)}
                        className={`py-4 rounded-xl font-semibold transition-all duration-200 ${
                          betAmount === amount
                            ? 'bg-teal-500 text-white shadow-glow'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                      >
                        {amount} SOL
                      </button>
                    ))}
                  </div>
                </div>

                {/* Find Opponent Button */}
                <button
                  onClick={handleFindOpponent}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 py-4 sm:py-5 rounded-xl font-bold text-lg sm:text-xl transition-all duration-200 hover:shadow-glow-lg"
                >
                  Find Opponent
                </button>
              </div>
            )}

            {/* Waiting Phase */}
            {gamePhase === 'waiting' && (
              <div className="glass-card rounded-2xl p-12 text-center">
                <div className="animate-pulse mb-6">
                  <div className="text-6xl mb-4">⏳</div>
                  <h2 className="text-2xl font-bold mb-2">Finding Opponent...</h2>
                  <p className="text-slate-400">Matching you with another player</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Your choice: {playerChoice === 'heads' ? '👑 HEADS' : '🦅 TAILS'} (locked)
                  </p>
                </div>

                <button
                  onClick={handleCancelWaiting}
                  className="mt-6 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Cancel Matchmaking
                </button>
              </div>
            )}

            {/* Confirming Phase */}
            {gamePhase === 'confirming' && (
              <div className="glass-card rounded-2xl p-12 text-center">
                <div className="mb-6">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-2xl font-bold mb-2">Opponent Found!</h2>
                  <p className="text-slate-400 mb-4">Starting coin flip...</p>

                  <div className="flex justify-center gap-8 text-lg">
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
                      <span className="font-bold mt-2">{opponentChoice?.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Flipping Phase */}
            {gamePhase === 'flipping' && (
              <div className="glass-card rounded-2xl p-12">
                <div className="flex flex-col items-center justify-center">
                  <h2 className="text-3xl font-bold mb-8">Coin is Flipping!</h2>

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

                  <p className="text-xl text-slate-400 mb-4">Good luck!</p>

                  {/* Emergency exit if stuck */}
                  <button
                    onClick={() => {
                      console.log('⚠️ User manually reset from flipping phase');
                      handleRematch();
                    }}
                    className="mt-4 text-sm text-slate-500 hover:text-slate-300 underline"
                  >
                    Something wrong? Click to restart
                  </button>
                </div>
              </div>
            )}

            {/* Result Phase */}
            {gamePhase === 'result' && result && (
              <div className="glass-card rounded-2xl p-12 text-center">
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
                    {isWinner ? `+${winnerPayout.toFixed(4)} SOL` : `-${betAmount.toFixed(4)} SOL`}
                  </p>
                  {isWinner && (
                    <p className="text-sm text-slate-400 mt-2">(House fee: {houseFee.toFixed(5)} SOL deducted)</p>
                  )}
                  <p className="text-xs text-yellow-400 mt-3">
                    ⚠️ DEMO MODE - Winnings not actually transferred
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleRematch}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:shadow-glow"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl font-bold text-lg transition-all duration-200"
                  >
                    Back to Lobby
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-96 space-y-6">
            {/* Game Info */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Game Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Your Choice:</span>
                  <span className="font-bold text-lg flex items-center gap-2">
                    {playerChoice === 'heads' ? '👑' : '🦅'} {playerChoice.toUpperCase()}
                    {choiceLocked && <span className="text-xs text-yellow-500">🔒</span>}
                  </span>
                </div>

                {(gamePhase === 'confirming' || gamePhase === 'flipping' || gamePhase === 'result') && opponentChoice && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Opponent:</span>
                    <span className="font-bold text-lg flex items-center gap-2">
                      {opponentChoice === 'heads' ? '👑' : '🦅'} {opponentChoice.toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-700 pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bet amount:</span>
                    <span className="text-white font-semibold">{betAmount.toFixed(3)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">House fee (3%):</span>
                    <span className="text-orange-400 font-semibold">{houseFee.toFixed(5)} SOL</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-400">Potential win:</span>
                    <span className="text-teal-400 font-bold">{potentialWin.toFixed(4)} SOL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Player Info */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Players</h3>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-teal-500/10 border-2 border-teal-500">
                  <p className="text-xs text-slate-400 mb-1">You</p>
                  <p className="font-semibold">{publicKey ? truncateWallet(publicKey.toBase58()) : 'Not connected'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border-2 border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">Opponent</p>
                  <p className="font-semibold">
                    {opponentWallet ? truncateWallet(opponentWallet) : gamePhase === 'waiting' ? 'Searching...' : 'Waiting...'}
                  </p>
                </div>
              </div>
            </div>

            {/* How to Play */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">How to Play</h3>
              <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
                <li>Choose Heads or Tails</li>
                <li>Select your bet amount</li>
                <li>Click &quot;Find Opponent&quot;</li>
                <li>Your choice is locked during matchmaking</li>
                <li>Watch the coin flip!</li>
                <li>Winner gets 97% of prize pool (3% house fee)</li>
              </ol>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                <p className="text-xs text-blue-300">
                  <strong>Fair Play:</strong> Results are generated using cryptographically secure randomness on the server.
                </p>
              </div>
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
