'use client';

import { WalletButton } from './WalletButton';

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span className="text-2xl sm:text-4xl">🎮</span>
          <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 text-transparent bg-clip-text whitespace-nowrap">
            SolPlay
          </h1>
        </div>

        {/* Wallet Button */}
        <div className="flex-shrink min-w-0">
          <WalletButton />
        </div>
      </div>
    </header>
  );
};
