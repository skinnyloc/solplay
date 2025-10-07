import { Server as NetServer, Socket } from 'net';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface SocketEvents {
  // Connection
  'join-game': (gameId: string) => void;
  'opponent-joined': (data: { playerId: string }) => void;

  // Chess
  'chess-move': (data: { gameId: string; move: string; fen: string }) => void;
  'opponent-chess-move': (data: { move: string; fen: string }) => void;

  // Checkers
  'checkers-move': (data: { gameId: string; from: any; to: any; boardState: any }) => void;
  'opponent-checkers-move': (data: { from: any; to: any; boardState: any }) => void;

  // Connect Four
  'connect-four-move': (data: { gameId: string; column: number; boardState: any }) => void;
  'opponent-connect-four-move': (data: { column: number; boardState: any }) => void;

  // Coin Flip
  'coin-flip-ready': (data: { gameId: string }) => void;
  'opponent-ready': () => void;

  // Chat
  'send-message': (data: { gameId: string; message: string; sender: string; timestamp: number }) => void;
  'receive-message': (data: { message: string; sender: string; timestamp: number }) => void;

  // Game events
  resign: (data: { gameId: string; player: string }) => void;
  'opponent-resigned': (data: { player: string }) => void;
  'offer-draw': (data: { gameId: string; player: string }) => void;
  'draw-offered': (data: { player: string }) => void;
  'accept-draw': (data: { gameId: string }) => void;
  'draw-accepted': () => void;
  'decline-draw': (data: { gameId: string }) => void;
  'draw-declined': () => void;

  // Sync
  'request-sync': (data: { gameId: string }) => void;
  'sync-request': () => void;
  'send-sync': (data: { gameId: string; gameState: any }) => void;
  'receive-sync': (data: { gameState: any }) => void;

  // Reconnection
  reconnect: (data: { gameId: string; playerId: string }) => void;
  'opponent-reconnected': (data: { playerId: string }) => void;
}
