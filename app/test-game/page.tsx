'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButtonWrapper } from '@/components/WalletMultiButtonWrapper';
import { BetSelector } from '@/components/BetSelector';
import { toast } from 'react-hot-toast';

type GameType = 'chess' | 'checkers' | 'connect-four' | 'coin-flip';

export default function TestGamePage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const [selectedGame, setSelectedGame] = useState<GameType>('coin-flip');
  const [selectedBet, setSelectedBet] = useState<number>(0.001);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [testRealDeposit, setTestRealDeposit] = useState(false);

  const games = [
    { id: 'coin-flip' as GameType, name: 'Coin Flip', emoji: '🪙', color: 'from-yellow-500 to-orange-500' },
    { id: 'chess' as GameType, name: 'Chess', emoji: '♟️', color: 'from-purple-500 to-pink-500' },
    { id: 'checkers' as GameType, name: 'Checkers', emoji: '🔴', color: 'from-red-500 to-orange-500' },
    {
      id: 'connect-four' as GameType,
      name: 'Connect Four',
      emoji: '🔵',
      color: 'from-blue-500 to-cyan-500',
    },
  ];

  const handleStartSimulation = async () => {
    console.log('🎮 Start button clicked!');
    console.log('Wallet connected:', !!publicKey);
    console.log('Selected game:', selectedGame);
    console.log('Selected bet:', selectedBet);

    if (!publicKey) {
      toast('Please connect your wallet first!', { icon: '⚠️' });
      return;
    }

    setIsCreatingGame(true);
    console.log('🔄 Creating simulation game...');

    try {
      // Convert game type from dash to underscore for database enum
      const gameTypeForDb = selectedGame.replace(/-/g, '_');
      console.log('📝 Converted game type:', gameTypeForDb);

      // Call simulation API to create game with bot
      const response = await fetch('/api/matchmaking/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          gameType: gameTypeForDb,
          wagerAmount: selectedBet,
        }),
      });

      console.log('📡 API Response status:', response.status);
      const data = await response.json();
      console.log('📦 API Response data:', data);

      if (data.error) {
        console.error('❌ API Error:', data.error);
        toast(data.error, { icon: '❌' });
        setIsCreatingGame(false);
        return;
      }

      if (data.matched) {
        console.log('✅ Game created! ID:', data.gameId);
        toast('Simulation game created! Starting...', { icon: '🎮' });

        // Navigate to the game page
        setTimeout(() => {
          const url = `/games/${selectedGame}/play/${data.gameId}`;
          console.log('🚀 Navigating to:', url);
          router.push(url);
        }, 1000);
      }
    } catch (error) {
      console.error('💥 Error creating simulation:', error);
      toast('Failed to create simulation. Check console.', { icon: '❌' });
      setIsCreatingGame(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors"
          >
            <span>←</span> Back to Home
          </button>

          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-400 to-cyan-400 text-transparent bg-clip-text">
            🎮 Test Game Simulation
          </h1>
          <p className="text-slate-400">
            Play a complete game alone with a bot opponent - perfect for testing the betting system!
          </p>
        </div>

        {/* Info Banner */}
        <div className="glass-card rounded-2xl p-6 mb-6 bg-blue-500/10 border-2 border-blue-500">
          <h2 className="text-xl font-bold mb-2 text-blue-400">🧪 Simulation Mode</h2>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>✅ Automatically creates a bot opponent</li>
            <li>✅ Simulates deposits (no real SOL required for deposits)</li>
            <li>✅ Test the complete flow: bet → play → win/lose</li>
            <li>✅ Perfect for testing before going live</li>
          </ul>
        </div>

        {/* Wallet Connection */}
        {!connected && (
          <div className="glass-card rounded-2xl p-12 text-center mb-6">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-slate-400 mb-6">You need to connect your wallet to start testing</p>
            <WalletMultiButtonWrapper />
          </div>
        )}

        {connected && (
          <>
            {/* Game Selection */}
            <div className="glass-card rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">1. Choose Your Game</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game.id)}
                    className={`p-6 rounded-xl border-4 transition-all duration-200 ${
                      selectedGame === game.id
                        ? 'border-teal-500 bg-teal-500/20 scale-105 shadow-glow'
                        : 'border-slate-700 bg-slate-800/50 hover:border-teal-500/50'
                    }`}
                  >
                    <div className="text-4xl mb-2">{game.emoji}</div>
                    <div className="text-sm font-bold">{game.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bet Selection */}
            <div className="glass-card rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">2. Select Your Bet</h2>
              <BetSelector
                selectedBet={selectedBet}
                onBetChange={setSelectedBet}
                gameType={selectedGame}
                disabled={isCreatingGame}
              />
            </div>

            {/* Test Mode Toggle */}
            <div className="glass-card rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">3. Choose Test Mode</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTestRealDeposit(false)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    !testRealDeposit
                      ? 'border-teal-500 bg-teal-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-teal-500/50'
                  }`}
                >
                  <div className="text-2xl mb-2">🎮</div>
                  <div className="font-bold">Instant Play</div>
                  <div className="text-xs text-slate-400 mt-1">No deposit needed</div>
                </button>
                <button
                  onClick={() => setTestRealDeposit(true)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    testRealDeposit
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-orange-500/50'
                  }`}
                >
                  <div className="text-2xl mb-2">💰</div>
                  <div className="font-bold">Test Deposit</div>
                  <div className="text-xs text-slate-400 mt-1">Real devnet SOL</div>
                </button>
              </div>
            </div>

            {/* Start Button */}
            <div className="glass-card rounded-2xl p-8 text-center">
              <h2 className="text-xl font-bold mb-4">4. Start Simulation</h2>

              {!isCreatingGame ? (
                <button
                  onClick={handleStartSimulation}
                  className={`w-full max-w-md mx-auto py-6 rounded-xl font-bold text-xl transition-all duration-200 hover:shadow-glow-lg ${
                    testRealDeposit
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                      : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600'
                  }`}
                >
                  {testRealDeposit ? '💰 Start With Real Deposit' : '🎮 Start Instant Test'}
                </button>
              ) : (
                <div className="py-6">
                  <div className="animate-pulse flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-teal-500 rounded-full animate-ping"></div>
                    <span className="text-xl font-bold text-teal-400">Creating simulation game...</span>
                  </div>
                </div>
              )}

              <div className="mt-6 text-sm text-slate-400">
                <p>
                  <strong>Note:</strong> {testRealDeposit
                    ? 'You will be asked to deposit REAL devnet SOL to test the transaction flow!'
                    : 'Deposits are automatic - no real SOL needed. Perfect for quick testing!'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* How It Works */}
        <div className="glass-card rounded-2xl p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">How Simulation Mode Works</h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="text-2xl">1️⃣</div>
              <div>
                <h3 className="font-bold text-teal-400 mb-1">Auto-Match with Bot</h3>
                <p className="text-sm text-slate-300">
                  System creates a fake &quot;bot&quot; player and matches you instantly
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-2xl">2️⃣</div>
              <div>
                <h3 className="font-bold text-teal-400 mb-1">Simulated Deposits</h3>
                <p className="text-sm text-slate-300">
                  Both players are marked as &quot;deposited&quot; automatically - no real transactions needed
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-2xl">3️⃣</div>
              <div>
                <h3 className="font-bold text-teal-400 mb-1">Play the Game</h3>
                <p className="text-sm text-slate-300">
                  You control BOTH sides (your moves + bot moves) to test the gameplay
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-2xl">4️⃣</div>
              <div>
                <h3 className="font-bold text-teal-400 mb-1">See Results</h3>
                <p className="text-sm text-slate-300">
                  Game ends normally and shows win/loss screen with payout calculations
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-sm text-yellow-400">
              <strong>⚠️ Testing Only:</strong> This is for testing the system flow. Real games require actual SOL
              deposits and match with real players!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
