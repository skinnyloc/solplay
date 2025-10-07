'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
  createDepositTransaction,
  sendAndConfirmTransaction,
  checkBalance,
  getBalance,
  TEMP_ESCROW_WALLET,
  formatAddress,
  getNetworkInfo,
  requestAirdrop,
} from '@/lib/solana';
import { toast } from 'react-hot-toast';

interface DepositConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  betAmount: number;
  gameType: string;
  gameId: string;
  onConfirm: (signature: string) => void;
}

type DepositStatus = 'idle' | 'checking' | 'confirming' | 'confirmed' | 'failed';

export const DepositConfirmation = ({
  isOpen,
  onClose,
  betAmount,
  gameType,
  gameId,
  onConfirm,
}: DepositConfirmationProps) => {
  const wallet = useWallet();
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('idle');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [txSignature, setTxSignature] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isRequestingAirdrop, setIsRequestingAirdrop] = useState(false);

  const houseFeeRate = 0.03;
  const houseFee = betAmount * houseFeeRate;
  const totalRequired = betAmount + 0.00001; // Add small amount for transaction fee
  const networkInfo = getNetworkInfo();

  useEffect(() => {
    if (isOpen && wallet.publicKey) {
      fetchBalance();
    }
  }, [isOpen, wallet.publicKey]);

  const fetchBalance = async () => {
    if (!wallet.publicKey) return;

    try {
      const balance = await getBalance(wallet.publicKey);
      setWalletBalance(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleRequestAirdrop = async () => {
    if (!wallet.publicKey || !networkInfo.isDevnet) return;

    setIsRequestingAirdrop(true);
    try {
      await requestAirdrop(wallet.publicKey, 1);
      toast('Airdrop successful! You received 1 SOL', { icon: '✅' });
      await fetchBalance();
    } catch (error: any) {
      toast(error.message || 'Airdrop failed', { icon: '❌' });
    } finally {
      setIsRequestingAirdrop(false);
    }
  };

  const handleDeposit = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast('Wallet not connected', { icon: '⚠️' });
      return;
    }

    setDepositStatus('checking');
    setErrorMessage('');

    try {
      // Check balance
      const hasSufficient = await checkBalance(wallet.publicKey, totalRequired);
      if (!hasSufficient) {
        setDepositStatus('failed');
        setErrorMessage(`Insufficient balance. You need at least ${totalRequired.toFixed(4)} SOL`);
        toast('Insufficient balance', { icon: '⚠️' });
        return;
      }

      setDepositStatus('confirming');

      // Create transaction
      const transaction = await createDepositTransaction(wallet.publicKey, TEMP_ESCROW_WALLET, betAmount);

      // Send transaction
      const signature = await sendAndConfirmTransaction(transaction, wallet);

      setTxSignature(signature);
      setDepositStatus('confirmed');
      toast('Deposit confirmed!', { icon: '✅' });

      // Notify parent component
      onConfirm(signature);

      // Wait 2 seconds then close
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Deposit error:', error);
      setDepositStatus('failed');
      setErrorMessage(error.message || 'Transaction failed');
      toast(error.message || 'Transaction failed', { icon: '❌' });
    }
  };

  const handleClose = () => {
    if (depositStatus === 'confirming') {
      const confirm = window.confirm(
        'Transaction in progress. Closing this window may cause issues. Are you sure?'
      );
      if (!confirm) return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass-card rounded-2xl p-6 max-w-lg w-full mx-4 border-2 border-teal-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Confirm Deposit</h2>
          <button
            onClick={handleClose}
            disabled={depositStatus === 'confirming'}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        {/* Network Badge */}
        <div className="mb-4 flex justify-center">
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              networkInfo.isDevnet ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
            }`}
          >
            {networkInfo.isDevnet ? '🧪 DEVNET (Test Mode)' : '🌐 MAINNET'}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Transaction Details</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Game:</span>
                <span className="font-semibold capitalize">{gameType}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">You are depositing:</span>
                <span className="font-bold text-teal-400 text-lg">{betAmount.toFixed(4)} SOL</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">House fee (3%):</span>
                <span className="text-orange-400 font-semibold">{houseFee.toFixed(5)} SOL</span>
              </div>

              <div className="border-t border-slate-700 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total required:</span>
                  <span className="font-semibold">{totalRequired.toFixed(5)} SOL</span>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Your balance:</span>
                <span className={`font-semibold ${walletBalance >= totalRequired ? 'text-green-400' : 'text-red-400'}`}>
                  {walletBalance.toFixed(4)} SOL
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Escrow address:</span>
                <span className="font-mono text-slate-300">{formatAddress(TEMP_ESCROW_WALLET.toBase58(), 6)}</span>
              </div>

              {wallet.publicKey && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Your wallet:</span>
                  <span className="font-mono text-slate-300">{formatAddress(wallet.publicKey.toBase58(), 6)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Airdrop button (devnet only) */}
          {networkInfo.isDevnet && walletBalance < totalRequired && (
            <button
              onClick={handleRequestAirdrop}
              disabled={isRequestingAirdrop}
              className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {isRequestingAirdrop ? 'Requesting...' : '🚰 Request Test SOL (Devnet)'}
            </button>
          )}

          {/* Status Messages */}
          {depositStatus === 'checking' && (
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-400">Checking balance...</p>
            </div>
          )}

          {depositStatus === 'confirming' && (
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-3 text-center animate-pulse">
              <p className="text-sm text-yellow-400 font-bold">⚠️ Confirming transaction...</p>
              <p className="text-xs text-slate-400 mt-1">Please approve the transaction in your wallet</p>
            </div>
          )}

          {depositStatus === 'confirmed' && (
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-center">
              <p className="text-sm text-green-400 font-bold">✅ Deposit confirmed!</p>
              {txSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}${networkInfo.isDevnet ? '?cluster=devnet' : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-400 hover:underline mt-1 block"
                >
                  View on Explorer →
                </a>
              )}
            </div>
          )}

          {depositStatus === 'failed' && errorMessage && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-center">
              <p className="text-sm text-red-400 font-bold">❌ {errorMessage}</p>
            </div>
          )}

          {/* Warning */}
          {depositStatus === 'confirming' && (
            <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-3">
              <p className="text-xs text-orange-400 text-center">
                <strong>⚠️ Important:</strong> Do not close this window during the transaction!
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {depositStatus === 'idle' || depositStatus === 'failed' ? (
            <>
              <button
                onClick={handleClose}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={walletBalance < totalRequired}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Transaction
              </button>
            </>
          ) : depositStatus === 'confirmed' ? (
            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-semibold transition-all"
            >
              Done
            </button>
          ) : (
            <div className="w-full bg-slate-700 py-3 rounded-xl font-semibold text-center">
              {depositStatus === 'checking' ? 'Checking...' : 'Processing...'}
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Funds will be held in escrow until the game is completed.
            <br />
            Winner receives 97% of the prize pool.
          </p>
        </div>
      </div>
    </div>
  );
};
