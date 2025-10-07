'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';

interface WalletMultiButtonWrapperProps {
  className?: string;
}

export const WalletMultiButtonWrapper = ({ className }: WalletMultiButtonWrapperProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={className || "bg-slate-700 rounded-lg px-6 py-3 font-semibold"}>
        Loading...
      </div>
    );
  }

  return <WalletMultiButton className={className} />;
};
