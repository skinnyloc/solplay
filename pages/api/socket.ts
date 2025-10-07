import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/types/socket';
import { Server as SocketIOServer } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    console.log('Socket.IO already initialized');
    res.end();
    return;
  }

  console.log('Initializing Socket.IO server...');

  const httpServer: NetServer = res.socket.server as any;
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  res.socket.server.io = io;

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

  console.log('Socket.IO server initialized successfully');
  res.end();
};

export default SocketHandler;
