import { NextRequest } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export const dynamic = 'force-dynamic';

// Extend the response socket to include Socket.IO server
interface ExtendedSocket {
  server: NetServer & {
    io?: SocketIOServer;
  };
}

export async function GET(req: NextRequest) {
  const res = new Response('Socket.IO endpoint');

  // Get the underlying Node.js socket
  const socket = (res as any).socket as ExtendedSocket;

  if (!socket?.server) {
    console.log('Socket.IO: Server not available');
    return new Response('Socket.IO not available', { status: 503 });
  }

  if (socket.server.io) {
    console.log('Socket.IO: Already initialized');
    return new Response('Socket.IO already running', { status: 200 });
  }

  console.log('Socket.IO: Initializing server...');

  const io = new SocketIOServer(socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('✅ Player connected:', socket.id);

    // Join game room
    socket.on('join-game', (gameId: string) => {
      console.log(`Player ${socket.id} joining game ${gameId}`);
      socket.join(gameId);
      socket.to(gameId).emit('opponent-joined', { playerId: socket.id });
    });

    // Handle chess moves
    socket.on('chess-move', (data) => {
      const { gameId, move, fen } = data;
      console.log(`Chess move in game ${gameId}:`, move);
      socket.to(gameId).emit('opponent-chess-move', { move, fen });
    });

    // Handle checkers moves
    socket.on('checkers-move', (data) => {
      const { gameId, from, to, boardState } = data;
      console.log(`Checkers move in game ${gameId}`);
      socket.to(gameId).emit('opponent-checkers-move', { from, to, boardState });
    });

    // Handle connect four moves
    socket.on('connect-four-move', (data) => {
      const { gameId, column, boardState } = data;
      console.log(`Connect Four move in game ${gameId}: column ${column}`);
      socket.to(gameId).emit('opponent-connect-four-move', { column, boardState });
    });

    // Handle coin flip events
    socket.on('coin-flip-ready', (data) => {
      const { gameId } = data;
      socket.to(gameId).emit('opponent-ready');
    });

    // Handle chat messages
    socket.on('send-message', (data) => {
      const { gameId, message, sender, timestamp } = data;
      console.log(`Chat in game ${gameId}: ${message}`);
      socket.to(gameId).emit('receive-message', { message, sender, timestamp });
    });

    // Handle game events
    socket.on('resign', (data) => {
      const { gameId, player } = data;
      console.log(`Player ${player} resigned from game ${gameId}`);
      socket.to(gameId).emit('opponent-resigned', { player });
    });

    socket.on('offer-draw', (data) => {
      const { gameId, player } = data;
      console.log(`Draw offered in game ${gameId} by ${player}`);
      socket.to(gameId).emit('draw-offered', { player });
    });

    socket.on('accept-draw', (data) => {
      const { gameId } = data;
      console.log(`Draw accepted in game ${gameId}`);
      socket.to(gameId).emit('draw-accepted');
    });

    socket.on('decline-draw', (data) => {
      const { gameId } = data;
      console.log(`Draw declined in game ${gameId}`);
      socket.to(gameId).emit('draw-declined');
    });

    // Handle player disconnect
    socket.on('disconnect', () => {
      console.log('❌ Player disconnected:', socket.id);
    });

    // Handle player reconnection
    socket.on('reconnect', (data) => {
      const { gameId, playerId } = data;
      console.log(`Player ${playerId} reconnected to game ${gameId}`);
      socket.join(gameId);
      socket.to(gameId).emit('opponent-reconnected', { playerId });
    });

    // Request game state sync
    socket.on('request-sync', (data) => {
      const { gameId } = data;
      console.log(`Sync requested for game ${gameId}`);
      socket.to(gameId).emit('sync-request');
    });

    // Send game state sync
    socket.on('send-sync', (data) => {
      const { gameId, gameState } = data;
      socket.to(gameId).emit('receive-sync', { gameState });
    });
  });

  console.log('Socket.IO: Server initialized successfully');

  return new Response('Socket.IO initialized', { status: 200 });
}
