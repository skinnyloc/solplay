/**
 * Demo Escrow System
 * Simulates Solana smart contract escrow without real transactions
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Generate a realistic-looking dummy escrow PDA address
 * In production, this would be derived from the actual smart contract
 */
export function generateDummyEscrowPDA(gameId: string): string {
  // Create a deterministic but realistic-looking address based on game ID
  const seed = `escrow_${gameId}`;
  const hash = hashString(seed);

  // Format to look like a real Solana address (base58)
  return `ESCROW${hash.substring(0, 38)}DEMO`;
}

/**
 * Simulate deposit - in production this would be a real Solana transaction
 */
export async function simulateDeposit(
  playerWallet: string,
  wagerAmount: number,
  gameId: string
): Promise<{ success: boolean; txSignature: string; message: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate fake transaction signature
  const txSignature = `SIM_TX_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return {
    success: true,
    txSignature,
    message: `Deposited ${wagerAmount} SOL (DEMO MODE - not actually transferred)`,
  };
}

/**
 * Simulate payout - in production this would be a real Solana transaction
 */
export async function simulatePayout(
  winnerWallet: string,
  loserWallet: string,
  wagerAmount: number,
  gameId: string
): Promise<{
  success: boolean;
  winnerPayout: number;
  houseFee: number;
  winnerTxSignature: string;
  houseTxSignature: string;
  message: string;
}> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Calculate payouts
  const totalPot = wagerAmount * 2;
  const houseFee = totalPot * 0.03; // 3%
  const winnerPayout = totalPot - houseFee;

  // Generate fake transaction signatures
  const winnerTxSignature = `SIM_PAYOUT_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const houseTxSignature = `SIM_HOUSE_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return {
    success: true,
    winnerPayout,
    houseFee,
    winnerTxSignature,
    houseTxSignature,
    message: `Winner received ${winnerPayout.toFixed(4)} SOL (DEMO MODE - not actually transferred)`,
  };
}

/**
 * Simulate refund for cancelled games
 */
export async function simulateRefund(
  playerWallet: string,
  wagerAmount: number,
  gameId: string
): Promise<{ success: boolean; txSignature: string; message: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const txSignature = `SIM_REFUND_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return {
    success: true,
    txSignature,
    message: `Refunded ${wagerAmount} SOL (DEMO MODE - not actually transferred)`,
  };
}

/**
 * Check if a wallet has sufficient balance (simulated)
 * In production, this would check actual on-chain balance
 */
export async function checkSimulatedBalance(walletAddress: string): Promise<number> {
  // For demo, always return a high balance so testing works
  return 100; // 100 SOL (fake)
}

/**
 * Simple string hashing for deterministic dummy addresses
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

/**
 * Demo mode indicator
 */
export const IS_DEMO_MODE = true;

/**
 * Helper to display demo mode warnings in UI
 */
export function getDemoModeMessage(action: 'deposit' | 'payout' | 'refund'): string {
  const messages = {
    deposit: '⚠️ DEMO MODE: No real SOL will be transferred',
    payout: '⚠️ DEMO MODE: Payout is simulated',
    refund: '⚠️ DEMO MODE: Refund is simulated',
  };
  return messages[action];
}
