'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButtonWrapper } from '@/components/WalletMultiButtonWrapper';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  getBalance,
  requestAirdrop,
  getNetworkInfo,
  formatAddress,
  TEMP_ESCROW_WALLET,
  HOUSE_WALLET,
} from '@/lib/solana';

export default function DevnetToolsPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [isRequestingAirdrop, setIsRequestingAirdrop] = useState(false);
  const [airdropAmount, setAirdropAmount] = useState<number>(1);
  const [escrowBalance, setEscrowBalance] = useState<number>(0);

  const networkInfo = getNetworkInfo();

  useEffect(() => {
    if (publicKey) {
      fetchBalance();
    }
  }, [publicKey]);

  const fetchBalance = async () => {
    if (!publicKey) return;

    try {
      const bal = await getBalance(publicKey);
      setBalance(bal);

      // Also check escrow balance
      const escrowBal = await getBalance(TEMP_ESCROW_WALLET);
      setEscrowBalance(escrowBal);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleAirdrop = async () => {
    if (!publicKey) {
      toast('Please connect your wallet first', { icon: '⚠️' });
      return;
    }

    if (!networkInfo.isDevnet) {
      toast('Airdrops only available on devnet', { icon: '⚠️' });
      return;
    }

    setIsRequestingAirdrop(true);

    try {
      const signature = await requestAirdrop(publicKey, airdropAmount);
      toast(`Airdrop successful! ${airdropAmount} SOL received`, { icon: '✅' });
      console.log('Airdrop signature:', signature);

      // Refresh balance after airdrop
      setTimeout(() => {
        fetchBalance();
      }, 2000);
    } catch (error: any) {
      console.error('Airdrop error:', error);
      toast(error.message || 'Airdrop failed. Try again in a few seconds.', { icon: '❌' });
    } finally {
      setIsRequestingAirdrop(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast('Address copied!', { icon: '📋' });
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
            🧪 Devnet Testing Tools
          </h1>
          <p className="text-slate-400">Request test SOL and prepare for testing</p>
        </div>

        {/* Network Status */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Network Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Current Network</div>
              <div
                className={`text-lg font-bold ${networkInfo.isDevnet ? 'text-yellow-400' : 'text-green-400'}`}
              >
                {networkInfo.isDevnet ? '🧪 DEVNET (Test Mode)' : '🌐 MAINNET'}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">RPC Endpoint</div>
              <div className="text-xs font-mono text-slate-300 truncate">{networkInfo.rpcUrl}</div>
            </div>
          </div>

          {!networkInfo.isDevnet && (
            <div className="mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-center">
              <p className="text-sm text-red-400">
                <strong>⚠️ Warning:</strong> You are on MAINNET. Airdrops are not available. Switch to devnet for
                testing.
              </p>
            </div>
          )}
        </div>

        {/* Wallet Connection */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Wallet Connection</h2>

          {!connected ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">Connect your wallet to get started</p>
              <WalletMultiButtonWrapper />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-slate-400">Your Wallet</div>
                  <button
                    onClick={() => publicKey && copyAddress(publicKey.toBase58())}
                    className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-all"
                  >
                    Copy Address
                  </button>
                </div>
                <div className="font-mono text-teal-400 text-sm break-all">{publicKey?.toBase58()}</div>
              </div>

              <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/50 rounded-lg p-6 text-center">
                <div className="text-sm text-slate-400 mb-2">Current Balance</div>
                <div className="text-5xl font-bold text-teal-400 mb-2">{balance.toFixed(4)}</div>
                <div className="text-sm text-slate-400">SOL</div>
                <button
                  onClick={fetchBalance}
                  className="mt-4 text-xs bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-md transition-all"
                >
                  🔄 Refresh Balance
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Airdrop Section */}
        {connected && networkInfo.isDevnet && (
          <div className="glass-card rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Request Test SOL</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Airdrop Amount (SOL)</label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[0.5, 1, 2, 5].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAirdropAmount(amount)}
                      className={`py-3 rounded-lg font-semibold transition-all ${
                        airdropAmount === amount
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      {amount} SOL
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAirdrop}
                disabled={isRequestingAirdrop}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRequestingAirdrop ? '🔄 Requesting Airdrop...' : `🚰 Request ${airdropAmount} SOL`}
              </button>

              <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>ℹ️ Note:</strong> Devnet airdrops have a rate limit. If you get an error, wait 30-60 seconds
                  and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* System Addresses */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">System Addresses</h2>

          <div className="space-y-3">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-400">Escrow Wallet</div>
                <button
                  onClick={() => copyAddress(TEMP_ESCROW_WALLET.toBase58())}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-all"
                >
                  Copy
                </button>
              </div>
              <div className="font-mono text-xs text-slate-300 break-all mb-2">{TEMP_ESCROW_WALLET.toBase58()}</div>
              <div className="text-sm text-teal-400">Balance: {escrowBalance.toFixed(4)} SOL</div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-400">House Wallet</div>
                <button
                  onClick={() => copyAddress(HOUSE_WALLET.toBase58())}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-all"
                >
                  Copy
                </button>
              </div>
              <div className="font-mono text-xs text-slate-300 break-all">{HOUSE_WALLET.toBase58()}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {connected && balance > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>

            {/* Simulation Mode - Highlighted */}
            <div className="mb-4 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border-2 border-teal-500 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-teal-400 text-lg">🎮 Simulation Mode</h3>
                <span className="text-xs bg-teal-500 px-2 py-1 rounded-full font-bold">RECOMMENDED</span>
              </div>
              <p className="text-sm text-slate-300 mb-3">
                Test complete games with auto-bot matching - no need for 2 players!
              </p>
              <button
                onClick={() => router.push('/test-game')}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 py-3 rounded-xl font-bold transition-all"
              >
                Start Simulation Testing →
              </button>
            </div>

            <div className="text-sm text-slate-500 text-center mb-3">Or test individual games (multiplayer required)</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/games/coin-flip')}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 py-4 rounded-xl font-bold transition-all"
              >
                🪙 Coin Flip
              </button>

              <button
                onClick={() => router.push('/games/chess')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-4 rounded-xl font-bold transition-all"
              >
                ♟️ Chess
              </button>

              <button
                onClick={() => router.push('/games/checkers')}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 py-4 rounded-xl font-bold transition-all"
              >
                🔴 Checkers
              </button>

              <button
                onClick={() => router.push('/games/connect-four')}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 py-4 rounded-xl font-bold transition-all"
              >
                🔵 Connect Four
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="glass-card rounded-2xl p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Testing Instructions</h2>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-bold text-teal-400 mb-2">1. Switch Phantom to Devnet</h3>
              <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
                <li>Open Phantom wallet</li>
                <li>Click Settings → Change Network</li>
                <li>Select &quot;Devnet&quot;</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-teal-400 mb-2">2. Connect Wallet</h3>
              <p className="text-slate-300">Click &quot;Select Wallet&quot; above and connect your Phantom wallet</p>
            </div>

            <div>
              <h3 className="font-bold text-teal-400 mb-2">3. Request Test SOL</h3>
              <p className="text-slate-300">
                Click the airdrop button to get free devnet SOL for testing (1-5 SOL recommended)
              </p>
            </div>

            <div>
              <h3 className="font-bold text-teal-400 mb-2">4. Test a Game</h3>
              <p className="text-slate-300">
                Choose a game from Quick Actions and test the deposit/betting system with fake SOL
              </p>
            </div>

            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 mt-4">
              <p className="text-sm text-green-400">
                <strong>✅ Your Address:</strong> 4mDFAtYuNbSaqtFrMHzdtXv8jm8tq7YcqyjazXoPwudN
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
