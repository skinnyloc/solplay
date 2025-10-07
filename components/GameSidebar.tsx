'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface GameSidebarProps {
  gameType: string;
  gameStatus: 'waiting' | 'active' | 'completed';
  opponentWallet?: string;
  currentTurn?: 'player' | 'opponent';
  timeLeft?: number;
}

const BET_AMOUNTS = [0.001, 0.01, 0.05, 0.1, 0.5, 1];

export const GameSidebar = ({
  gameType,
  gameStatus,
  opponentWallet,
  currentTurn,
  timeLeft = 300
}: GameSidebarProps) => {
  const { publicKey } = useWallet();
  const [betAmount, setBetAmount] = useState(0.1);
  const [timer, setTimer] = useState(timeLeft);

  // Countdown timer
  useEffect(() => {
    if (gameStatus === 'active' && currentTurn === 'player') {
      const interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameStatus, currentTurn]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const houseFee = betAmount * 0.03;
  const potentialWin = (betAmount * 2) - houseFee;

  const truncateWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  return (
    <div className="w-full lg:w-96 space-y-6">
      {/* Bet Amount Selector */}
      {gameStatus === 'waiting' && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4">Select Bet Amount</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {BET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                className={`py-3 rounded-lg font-semibold transition-all duration-200 ${
                  betAmount === amount
                    ? 'bg-teal-500 text-white shadow-glow'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {amount} SOL
              </button>
            ))}
          </div>

          <div className="space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-slate-400">Your bet:</span>
              <span className="text-white font-semibold">{betAmount} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">House fee (3%):</span>
              <span className="text-orange-400 font-semibold">{houseFee.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-700">
              <span className="text-slate-400">Potential win:</span>
              <span className="text-teal-400 font-bold">{potentialWin.toFixed(4)} SOL</span>
            </div>
          </div>

          <button className="w-full bg-teal-500 hover:bg-teal-600 py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:shadow-glow">
            Find Match
          </button>
        </div>
      )}

      {/* Game Status */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Game Status</h3>
          <div
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              gameStatus === 'waiting'
                ? 'bg-yellow-500/20 text-yellow-400'
                : gameStatus === 'active'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {gameStatus === 'waiting' ? 'Waiting' : gameStatus === 'active' ? 'Playing' : 'Completed'}
          </div>
        </div>

        {/* Player Cards */}
        <div className="space-y-3">
          {/* You */}
          <div
            className={`p-4 rounded-xl border-2 transition-all ${
              currentTurn === 'player'
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">You</p>
                <p className="font-semibold">
                  {publicKey ? truncateWallet(publicKey.toBase58()) : 'Not connected'}
                </p>
              </div>
              {currentTurn === 'player' && (
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">Time left</p>
                  <p className="text-xl font-bold text-teal-400">{formatTime(timer)}</p>
                </div>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="px-3 text-slate-500 font-bold">VS</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* Opponent */}
          <div
            className={`p-4 rounded-xl border-2 transition-all ${
              currentTurn === 'opponent'
                ? 'border-red-500 bg-red-500/10'
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Opponent</p>
                <p className="font-semibold">
                  {opponentWallet ? truncateWallet(opponentWallet) : 'Waiting...'}
                </p>
              </div>
              {currentTurn === 'opponent' && opponentWallet && (
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">Time left</p>
                  <p className="text-xl font-bold text-red-400">{formatTime(timer)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Info */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4 capitalize">{gameType.replace('-', ' ')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Bet amount:</span>
            <span className="text-white font-semibold">{betAmount} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Prize pool:</span>
            <span className="text-teal-400 font-semibold">{(betAmount * 2).toFixed(3)} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Turn time:</span>
            <span className="text-white font-semibold">5 minutes</span>
          </div>
        </div>
      </div>

      {/* Controls (when active) */}
      {gameStatus === 'active' && (
        <div className="glass-card rounded-2xl p-6">
          <button className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500 text-red-400 py-3 rounded-xl font-semibold transition-all duration-200">
            Forfeit Game
          </button>
        </div>
      )}
    </div>
  );
};
