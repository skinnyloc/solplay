import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Network configuration
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const QUICKNODE_RPC_URL = process.env.NEXT_PUBLIC_QUICKNODE_RPC_URL;

// Initialize connection with retry logic
export const createConnection = (useMainnet = false): Connection => {
  const url = useMainnet && QUICKNODE_RPC_URL ? QUICKNODE_RPC_URL : RPC_URL;
  return new Connection(url, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
};

// Primary connection (Helius Devnet)
export const connection = createConnection(false);

// Fallback connection (QuickNode Mainnet)
export const mainnetConnection = QUICKNODE_RPC_URL ? createConnection(true) : connection;

// Convert SOL to lamports
export const solToLamports = (sol: number): number => {
  return Math.floor(sol * LAMPORTS_PER_SOL);
};

// Convert lamports to SOL
export const lamportsToSol = (lamports: number): number => {
  return lamports / LAMPORTS_PER_SOL;
};

// Temporary escrow wallet for testing (devnet)
// In production, this will be a PDA from the smart contract
export const TEMP_ESCROW_WALLET = new PublicKey(
  NETWORK === 'mainnet-beta'
    ? 'EscrowMainnet1111111111111111111111111111111' // Replace with actual mainnet escrow
    : 'Esc8xVt7kC8P9YnHkQZf4YRxQ5J7zqwVKxZy9mNaB9vA' // Devnet test escrow
);

// House wallet (receives fees)
export const HOUSE_WALLET = new PublicKey('GQ95MH74f2kF6Aqv5dy6PSKq3S1xfwQowwYYqVQPNTMe');

/**
 * Check if wallet has sufficient balance
 */
export async function checkBalance(walletAddress: PublicKey, requiredAmount: number): Promise<boolean> {
  try {
    const balance = await connection.getBalance(walletAddress);
    const requiredLamports = solToLamports(requiredAmount);
    return balance >= requiredLamports;
  } catch (error) {
    console.error('Error checking balance:', error);
    return false;
  }
}

/**
 * Get wallet balance in SOL
 */
export async function getBalance(walletAddress: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(walletAddress);
    return lamportsToSol(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
}

/**
 * Create deposit transaction to escrow PDA
 */
export async function createDepositTransaction(
  playerWallet: PublicKey,
  escrowPDA: PublicKey,
  amount: number // in SOL
): Promise<Transaction> {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: playerWallet,
        toPubkey: escrowPDA,
        lamports: solToLamports(amount),
      })
    );

    transaction.feePayer = playerWallet;

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    return transaction;
  } catch (error) {
    console.error('Error creating deposit transaction:', error);
    throw new Error('Failed to create transaction');
  }
}

/**
 * Send and confirm transaction with retry logic
 */
export async function sendAndConfirmTransaction(transaction: Transaction, wallet: any): Promise<string> {
  try {
    if (!wallet.signTransaction) {
      throw new Error('Wallet does not support signing transactions');
    }

    // Sign transaction
    const signed = await wallet.signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    console.log('Transaction sent:', signature);

    // Confirm transaction with timeout
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: transaction.recentBlockhash!,
        lastValidBlockHeight: transaction.lastValidBlockHeight!,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
    }

    console.log('Transaction confirmed:', signature);
    return signature;
  } catch (error: any) {
    console.error('Transaction error:', error);

    if (error.message?.includes('User rejected')) {
      throw new Error('Transaction canceled by user');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient SOL balance');
    } else if (error.message?.includes('blockhash not found')) {
      throw new Error('Transaction expired. Please try again.');
    } else {
      throw new Error(error.message || 'Transaction failed');
    }
  }
}

/**
 * Verify transaction on-chain
 */
export async function verifyTransaction(signature: string): Promise<boolean> {
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    return tx !== null;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
}

/**
 * Get transaction details
 */
export async function getTransactionDetails(signature: string) {
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) return null;

    return {
      signature,
      blockTime: tx.blockTime,
      slot: tx.slot,
      meta: tx.meta,
    };
  } catch (error) {
    console.error('Error getting transaction details:', error);
    return null;
  }
}

/**
 * Request SOL airdrop (devnet only)
 */
export async function requestAirdrop(walletAddress: PublicKey, amount: number = 1): Promise<string> {
  if (NETWORK !== 'devnet') {
    throw new Error('Airdrops only available on devnet');
  }

  try {
    const signature = await connection.requestAirdrop(walletAddress, solToLamports(amount));
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  } catch (error) {
    console.error('Airdrop error:', error);
    throw new Error('Airdrop failed. Rate limit may be exceeded.');
  }
}

/**
 * Get network info
 */
export function getNetworkInfo() {
  return {
    network: NETWORK,
    rpcUrl: RPC_URL,
    isDevnet: NETWORK === 'devnet',
    isMainnet: NETWORK === 'mainnet-beta',
  };
}

/**
 * Format wallet address (truncate)
 */
export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Create house fee transaction
 */
export async function createHouseFeeTransaction(
  playerWallet: PublicKey,
  amount: number // house fee in SOL
): Promise<Transaction> {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: playerWallet,
        toPubkey: HOUSE_WALLET,
        lamports: solToLamports(amount),
      })
    );

    transaction.feePayer = playerWallet;

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    return transaction;
  } catch (error) {
    console.error('Error creating house fee transaction:', error);
    throw new Error('Failed to create house fee transaction');
  }
}
