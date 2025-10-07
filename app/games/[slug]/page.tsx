'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { ChessBoard } from '@/components/ChessBoard';
import { CheckersBoard } from '@/components/CheckersBoard';
import { ConnectFourBoard } from '@/components/ConnectFourBoard';
import { GameSidebar } from '@/components/GameSidebar';

const gameInfo: Record<string, { name: string; emoji: string; description: string }> = {
  chess: {
    name: 'Chess',
    emoji: '♟️',
    description: 'Classic strategy game for two players',
  },
  checkers: {
    name: 'Checkers',
    emoji: '🔴',
    description: 'Jump your way to victory',
  },
  'connect-four': {
    name: 'Connect Four',
    emoji: '🟡',
    description: 'Connect four discs in a row to win',
  },
  'coin-flip': {
    name: 'Coin Flip',
    emoji: '🪙',
    description: 'Call heads or tails and win double',
  },
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const slug = params.slug as string;

  const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'completed'>('waiting');
  const [opponentWallet, setOpponentWallet] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!publicKey) {
      router.push('/');
    }
  }, [publicKey, router]);

  const game = gameInfo[slug];

  if (!game) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="glass-card rounded-2xl p-12 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Game Not Found</h1>
          <p className="text-slate-400 mb-6">The game you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-teal-500 hover:bg-teal-600 px-8 py-3 rounded-lg font-semibold transition-all duration-200 hover:shadow-glow"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Render appropriate game board
  const renderGameBoard = () => {
    switch (slug) {
      case 'chess':
        return <ChessBoard />;
      case 'checkers':
        return <CheckersBoard />;
      case 'connect-four':
        return <ConnectFourBoard />;
      case 'coin-flip':
        return (
          <div className="glass-card rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Coin Flip</h2>
            <p className="text-slate-400 mb-6">
              Coin flip game coming soon!
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-7xl mx-auto">
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
            <div className="text-5xl">{game.emoji}</div>
            <div className="text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 text-transparent bg-clip-text">
                {game.name}
              </h1>
              <p className="text-slate-300">{game.description}</p>
            </div>
          </div>
        </div>

        {/* Game Board and Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Game Board */}
          <div className="flex-1">
            {renderGameBoard()}
          </div>

          {/* Sidebar */}
          <GameSidebar
            gameType={game.name}
            gameStatus={gameStatus}
            opponentWallet={opponentWallet}
            currentTurn="player"
          />
        </div>
      </div>
    </div>
  );
}
