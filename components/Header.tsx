'use client';

import { WalletButton } from './WalletButton';

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎮</span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 text-transparent bg-clip-text">
            SolPlay
          </h1>
        </div>

        {/* Wallet Button */}
        <WalletButton />
      </div>
    </header>
  );
};
