import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = async (): Promise<Socket> => {
  // Initialize Socket.IO server endpoint first
  await fetch('/api/socket');

  if (!socket) {
    socket = io({
      path: '/api/socket',
      addTrailingSlash: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Helper functions for common socket operations
export const joinGame = (gameId: string) => {
  if (socket) {
    socket.emit('join-game', gameId);
  }
};

export const leaveGame = (gameId: string) => {
  if (socket) {
    socket.emit('leave-game', gameId);
  }
};

export const sendChessMove = (gameId: string, move: string, fen: string) => {
  if (socket) {
    socket.emit('chess-move', { gameId, move, fen });
  }
};

export const sendCheckersMove = (gameId: string, from: any, to: any, boardState: any) => {
  if (socket) {
    socket.emit('checkers-move', { gameId, from, to, boardState });
  }
};

export const sendConnectFourMove = (gameId: string, column: number, boardState: any) => {
  if (socket) {
    socket.emit('connect-four-move', { gameId, column, boardState });
  }
};

export const sendChatMessage = (gameId: string, message: string, sender: string) => {
  if (socket) {
    socket.emit('send-message', {
      gameId,
      message,
      sender,
      timestamp: Date.now(),
    });
  }
};

export const resignGame = (gameId: string, player: string) => {
  if (socket) {
    socket.emit('resign', { gameId, player });
  }
};

export const offerDraw = (gameId: string, player: string) => {
  if (socket) {
    socket.emit('offer-draw', { gameId, player });
  }
};

export const acceptDraw = (gameId: string) => {
  if (socket) {
    socket.emit('accept-draw', { gameId });
  }
};

export const declineDraw = (gameId: string) => {
  if (socket) {
    socket.emit('decline-draw', { gameId });
  }
};

export const requestSync = (gameId: string) => {
  if (socket) {
    socket.emit('request-sync', { gameId });
  }
};

export const sendSync = (gameId: string, gameState: any) => {
  if (socket) {
    socket.emit('send-sync', { gameId, gameState });
  }
};
