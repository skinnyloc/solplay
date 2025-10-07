'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButtonWrapper } from '@/components/WalletMultiButtonWrapper';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';

const games = [
  {
    id: 'chess',
    name: 'Chess',
    emoji: '♟️',
    slug: 'chess',
    playersOnline: 12,
    betRange: '0.001 - 1 SOL',
  },
  {
    id: 'checkers',
    name: 'Checkers',
    emoji: '🔴',
    slug: 'checkers',
    playersOnline: 8,
    betRange: '0.001 - 1 SOL',
  },
  {
    id: 'connect-four',
    name: 'Connect Four',
    emoji: '🟡',
    slug: 'connect-four',
    playersOnline: 15,
    betRange: '0.001 - 1 SOL',
  },
  {
    id: 'coin-flip',
    name: 'Coin Flip',
    emoji: '🪙',
    slug: 'coin-flip',
    playersOnline: 23,
    betRange: '0.001 - 0.01 SOL',
  },
];

export default function Home() {
  const { publicKey } = useWallet();
  const router = useRouter();

  const handleGameClick = (slug: string) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first!', {
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #14b8a6',
        },
      });
      return;
    }
    router.push(`/games/${slug}`);
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="relative text-center mb-20 overflow-hidden">
          {/* Animated Background Particles */}
          <div className="absolute inset-0 -z-10">
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
            <div className="particle particle-3"></div>
            <div className="particle particle-4"></div>
            <div className="particle particle-5"></div>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 text-transparent bg-clip-text leading-tight">
            Play Classic Games,
            <br />
            Win Real SOL
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Connect your wallet and compete for crypto prizes on the Solana blockchain
          </p>

          {!publicKey ? (
            <div className="flex justify-center">
              <WalletMultiButtonWrapper className="!bg-teal-500 hover:!bg-teal-600 !rounded-xl !px-8 !py-4 !text-lg !font-bold !transition-all !duration-200 hover:!shadow-glow-lg !transform hover:!scale-105" />
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500/20 border border-teal-500 rounded-xl">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-teal-400 font-semibold">Wallet Connected - Choose a game below</span>
            </div>
          )}
        </div>

        {/* Game Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
          {games.map((game) => (
            <div
              key={game.id}
              onClick={() => handleGameClick(game.slug)}
              className="glass-card-hover rounded-2xl p-6 cursor-pointer transform transition-all duration-300 hover:-translate-y-2"
            >
              <div className="text-7xl mb-4 text-center">{game.emoji}</div>
              <h3 className="text-2xl font-bold mb-2 text-center">{game.name}</h3>

              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <p className="text-slate-400 text-sm">
                  {game.playersOnline} players online
                </p>
              </div>

              <div className="text-teal-400 text-center font-semibold mb-4">
                {game.betRange}
              </div>

              <button
                disabled={!publicKey}
                className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                  publicKey
                    ? 'bg-teal-500 hover:bg-teal-600 hover:shadow-glow text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {publicKey ? 'Play Now' : 'Connect Wallet'}
              </button>
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">247</div>
                <p className="text-slate-400">Games Played Today</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">18.5 SOL</div>
                <p className="text-slate-400">Total Wagered</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">2.3 SOL</div>
                <p className="text-slate-400">Biggest Win Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="glass-card rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-teal-400 to-cyan-400 text-transparent bg-clip-text">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl mb-3">👛</div>
                <h3 className="font-semibold text-lg mb-2">Connect Wallet</h3>
                <p className="text-slate-400 text-sm">
                  Connect your Phantom, Solflare, or Backpack wallet
                </p>
              </div>
              <div>
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="font-semibold text-lg mb-2">Choose Game</h3>
                <p className="text-slate-400 text-sm">
                  Select a game and set your wager amount
                </p>
              </div>
              <div>
                <div className="text-4xl mb-3">🏆</div>
                <h3 className="font-semibold text-lg mb-2">Win SOL</h3>
                <p className="text-slate-400 text-sm">
                  Winner gets 97%, automatic smart contract payout
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          33% {
            transform: translate(30px, -30px) rotate(120deg);
          }
          66% {
            transform: translate(-20px, 20px) rotate(240deg);
          }
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: linear-gradient(45deg, #14b8a6, #06b6d4);
          border-radius: 50%;
          opacity: 0.6;
          animation: float 20s infinite ease-in-out;
          box-shadow: 0 0 10px rgba(20, 184, 166, 0.8);
        }

        .particle-1 {
          top: 10%;
          left: 10%;
          animation-delay: 0s;
          animation-duration: 15s;
        }

        .particle-2 {
          top: 20%;
          right: 15%;
          animation-delay: 2s;
          animation-duration: 18s;
        }

        .particle-3 {
          top: 60%;
          left: 20%;
          animation-delay: 4s;
          animation-duration: 22s;
        }

        .particle-4 {
          bottom: 20%;
          right: 25%;
          animation-delay: 1s;
          animation-duration: 20s;
        }

        .particle-5 {
          top: 40%;
          left: 50%;
          animation-delay: 3s;
          animation-duration: 17s;
        }
      `}</style>
    </>
  );
}
