'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButtonWrapper } from './WalletMultiButtonWrapper';
import { useState, useEffect, useRef } from 'react';

export const WalletButton = () => {
  const { publicKey, disconnect } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Prevent hydration issues by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render until mounted on client
  if (!mounted) {
    return (
      <div className="bg-slate-700 rounded-lg px-6 py-3 font-semibold">
        Loading...
      </div>
    );
  }

  // If no wallet connected, show the default connect button
  if (!publicKey) {
    return (
      <WalletMultiButtonWrapper className="!bg-teal-500 hover:!bg-teal-600 !rounded-lg !px-6 !py-3 !font-semibold !transition-all !duration-200 hover:!shadow-[0_0_20px_rgba(20,184,166,0.5)]" />
    );
  }

  // Truncate wallet address
  const truncatedAddress = `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-teal-500 hover:bg-teal-600 rounded-lg px-6 py-3 font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(20,184,166,0.5)] flex items-center gap-2"
      >
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        {truncatedAddress}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800/90 backdrop-blur-lg rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50">
          <button
            onClick={() => {
              disconnect();
              setShowDropdown(false);
            }}
            className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors text-red-400 hover:text-red-300 font-medium"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
