'use client';

import { useState } from 'react';

export interface BetOption {
  label: string;
  value: number;
}

const BET_OPTIONS: BetOption[] = [
  { label: '0.001 SOL', value: 0.001 },
  { label: '0.01 SOL', value: 0.01 },
  { label: '0.05 SOL', value: 0.05 },
  { label: '0.1 SOL', value: 0.1 },
  { label: '0.5 SOL', value: 0.5 },
  { label: '1 SOL', value: 1.0 },
];

const COIN_FLIP_BET_OPTIONS: BetOption[] = [
  { label: '0.001 SOL', value: 0.001 },
  { label: '0.005 SOL', value: 0.005 },
  { label: '0.01 SOL', value: 0.01 },
];

interface BetSelectorProps {
  selectedBet: number;
  onBetChange: (amount: number) => void;
  gameType?: 'chess' | 'checkers' | 'connect-four' | 'coin-flip';
  disabled?: boolean;
}

export const BetSelector = ({ selectedBet, onBetChange, gameType, disabled = false }: BetSelectorProps) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  // Use coin flip options for coin flip game, otherwise use standard options
  const betOptions = gameType === 'coin-flip' ? COIN_FLIP_BET_OPTIONS : BET_OPTIONS;
  const maxBet = gameType === 'coin-flip' ? 0.01 : 1.0;

  const houseFeeRate = 0.03; // 3%
  const houseFee = selectedBet * houseFeeRate;
  const totalPot = selectedBet * 2;
  const potentialWin = totalPot - houseFee;

  const handleCustomAmountSubmit = () => {
    const amount = parseFloat(customAmount);

    if (isNaN(amount)) {
      alert('Please enter a valid number');
      return;
    }

    if (amount < 0.001) {
      alert('Minimum bet is 0.001 SOL');
      return;
    }

    if (amount > maxBet) {
      alert(`Maximum bet for ${gameType || 'this game'} is ${maxBet} SOL`);
      return;
    }

    onBetChange(amount);
    setShowCustomInput(false);
    setCustomAmount('');
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold mb-3 text-center">Select Bet Amount</h3>

        {/* Preset bet options */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {betOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => !disabled && onBetChange(option.value)}
              disabled={disabled}
              className={`py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                selectedBet === option.value
                  ? 'bg-teal-500 text-white shadow-glow scale-105'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom amount button */}
        {!showCustomInput ? (
          <button
            onClick={() => !disabled && setShowCustomInput(true)}
            disabled={disabled}
            className="w-full py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all border border-slate-600"
          >
            Custom Amount
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Enter amount (SOL)"
              step="0.001"
              min="0.001"
              max={maxBet}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white focus:border-teal-500 focus:outline-none"
            />
            <button
              onClick={handleCustomAmountSubmit}
              className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 font-semibold transition-all"
            >
              Set
            </button>
            <button
              onClick={() => {
                setShowCustomInput(false);
                setCustomAmount('');
              }}
              className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-semibold transition-all"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Bet calculations */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 mb-3">Bet Details</h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Your wager:</span>
            <span className="text-white font-semibold">{selectedBet.toFixed(3)} SOL</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Opponent wager:</span>
            <span className="text-white font-semibold">{selectedBet.toFixed(3)} SOL</span>
          </div>

          <div className="border-t border-slate-700 pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Total pot:</span>
              <span className="text-white font-semibold">{totalPot.toFixed(3)} SOL</span>
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">House fee (3%):</span>
            <span className="text-orange-400 font-semibold">-{houseFee.toFixed(4)} SOL</span>
          </div>

          <div className="border-t border-slate-700 pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Potential win:</span>
              <span className="text-teal-400 font-bold text-lg">{potentialWin.toFixed(4)} SOL</span>
            </div>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Winner receives:</span>
            <span className="text-slate-400">97% of pot</span>
          </div>
        </div>
      </div>

      {/* Risk warning for higher bets */}
      {selectedBet >= 0.5 && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 text-center">
          <p className="text-xs text-yellow-400">
            <strong>⚠️ High Stakes:</strong> You&apos;re wagering {selectedBet} SOL. Make sure you can afford to lose this
            amount!
          </p>
        </div>
      )}

      {gameType === 'coin-flip' && (
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-300">
            <strong>ℹ️ Coin Flip Limit:</strong> Maximum bet for coin flip is {maxBet} SOL
          </p>
        </div>
      )}
    </div>
  );
};
