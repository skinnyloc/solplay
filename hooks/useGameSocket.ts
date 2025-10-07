import { useEffect, useState, useCallback } from 'react';
import { initSocket, getSocket } from '@/lib/socket';
import { ConnectionStatus } from '@/types/socket';
import { toast } from 'react-hot-toast';

interface UseGameSocketOptions {
  gameId: string;
  onOpponentMove?: (data: any) => void;
  onOpponentJoined?: () => void;
  onOpponentDisconnected?: () => void;
  onOpponentReconnected?: () => void;
  onSyncRequest?: () => void;
  onReceiveSync?: (gameState: any) => void;
  gameType: 'chess' | 'checkers' | 'connect-four' | 'coin-flip';
}

export const useGameSocket = ({
  gameId,
  onOpponentMove,
  onOpponentJoined,
  onOpponentDisconnected,
  onOpponentReconnected,
  onSyncRequest,
  onReceiveSync,
  gameType,
}: UseGameSocketOptions) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [disconnectTimer, setDisconnectTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      try {
        const socket = await initSocket();

        if (!mounted) return;

        // Join game room
        socket.emit('join-game', gameId);

        // Connection status handlers
        const handleConnect = () => {
          setConnectionStatus('connected');
          toast('Connected to game server', { icon: '✅' });
        };

        const handleDisconnect = () => {
          setConnectionStatus('disconnected');
          toast('Disconnected from game server', { icon: '⚠️' });
        };

        const handleConnecting = () => {
          setConnectionStatus('connecting');
        };

        // Game event handlers
        const handleOpponentJoined = () => {
          setOpponentConnected(true);
          if (onOpponentJoined) onOpponentJoined();
          toast('Opponent joined!', { icon: '👥' });
        };

        const handleOpponentDisconnected = () => {
          // Start 30 second grace period
          const timer = setTimeout(() => {
            setOpponentConnected(false);
            if (onOpponentDisconnected) onOpponentDisconnected();
            toast('Opponent disconnected', { icon: '❌' });
          }, 30000);

          setDisconnectTimer(timer);
          toast('Opponent connection lost. Waiting 30s...', { icon: '⏳' });
        };

        const handleOpponentReconnected = () => {
          // Cancel disconnect timer
          if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            setDisconnectTimer(null);
          }

          setOpponentConnected(true);
          if (onOpponentReconnected) onOpponentReconnected();
          toast('Opponent reconnected!', { icon: '✅' });
        };

        // Game-specific move handlers
        const handleOpponentMove = (data: any) => {
          if (onOpponentMove) onOpponentMove(data);
        };

        // Sync handlers
        const handleSyncRequest = () => {
          if (onSyncRequest) onSyncRequest();
        };

        const handleReceiveSync = (data: { gameState: any }) => {
          if (onReceiveSync) onReceiveSync(data.gameState);
        };

        // Register event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('reconnecting', handleConnecting);
        socket.on('opponent-joined', handleOpponentJoined);
        socket.on('disconnect', handleOpponentDisconnected);
        socket.on('opponent-reconnected', handleOpponentReconnected);
        socket.on('sync-request', handleSyncRequest);
        socket.on('receive-sync', handleReceiveSync);

        // Game-specific event listeners
        if (gameType === 'chess') {
          socket.on('opponent-chess-move', handleOpponentMove);
        } else if (gameType === 'checkers') {
          socket.on('opponent-checkers-move', handleOpponentMove);
        } else if (gameType === 'connect-four') {
          socket.on('opponent-connect-four-move', handleOpponentMove);
        }

        // Set initial connection status
        if (socket.connected) {
          setConnectionStatus('connected');
        }

        // Cleanup
        return () => {
          socket.off('connect', handleConnect);
          socket.off('disconnect', handleDisconnect);
          socket.off('reconnecting', handleConnecting);
          socket.off('opponent-joined', handleOpponentJoined);
          socket.off('disconnect', handleOpponentDisconnected);
          socket.off('opponent-reconnected', handleOpponentReconnected);
          socket.off('sync-request', handleSyncRequest);
          socket.off('receive-sync', handleReceiveSync);

          if (gameType === 'chess') {
            socket.off('opponent-chess-move', handleOpponentMove);
          } else if (gameType === 'checkers') {
            socket.off('opponent-checkers-move', handleOpponentMove);
          } else if (gameType === 'connect-four') {
            socket.off('opponent-connect-four-move', handleOpponentMove);
          }

          if (disconnectTimer) {
            clearTimeout(disconnectTimer);
          }
        };
      } catch (error) {
        console.error('Socket setup error:', error);
        setConnectionStatus('disconnected');
      }
    };

    setupSocket();

    return () => {
      mounted = false;
    };
  }, [gameId, gameType, onOpponentMove, onOpponentJoined, onOpponentDisconnected, onOpponentReconnected, onSyncRequest, onReceiveSync, disconnectTimer]);

  // Helper methods
  const sendMove = useCallback(
    (moveData: any) => {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        toast('Not connected to server!', { icon: '⚠️' });
        return false;
      }

      if (gameType === 'chess') {
        socket.emit('chess-move', { gameId, ...moveData });
      } else if (gameType === 'checkers') {
        socket.emit('checkers-move', { gameId, ...moveData });
      } else if (gameType === 'connect-four') {
        socket.emit('connect-four-move', { gameId, ...moveData });
      }

      return true;
    },
    [gameId, gameType]
  );

  const requestSync = useCallback(() => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('request-sync', { gameId });
    }
  }, [gameId]);

  const sendSync = useCallback(
    (gameState: any) => {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('send-sync', { gameId, gameState });
      }
    },
    [gameId]
  );

  return {
    connectionStatus,
    opponentConnected,
    sendMove,
    requestSync,
    sendSync,
  };
};
