'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { ConnectionStatus as StatusType } from '@/types/socket';

export const ConnectionStatus = () => {
  const [status, setStatus] = useState<StatusType>('connecting');
  const [showReconnect, setShowReconnect] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      setStatus('disconnected');
      setShowReconnect(true);
      return;
    }

    const handleConnect = () => {
      setStatus('connected');
      setShowReconnect(false);
    };

    const handleDisconnect = () => {
      setStatus('disconnected');
      setShowReconnect(true);
    };

    const handleConnecting = () => {
      setStatus('connecting');
      setShowReconnect(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnecting', handleConnecting);

    // Set initial status
    if (socket.connected) {
      setStatus('connected');
    } else {
      setStatus('connecting');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnecting', handleConnecting);
    };
  }, []);

  const handleReconnect = () => {
    const socket = getSocket();
    if (socket) {
      socket.connect();
    } else {
      window.location.reload();
    }
  };

  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      textColor: 'text-green-400',
      pulse: false,
    },
    connecting: {
      color: 'bg-yellow-500',
      text: 'Connecting...',
      textColor: 'text-yellow-400',
      pulse: true,
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'Disconnected',
      textColor: 'text-red-400',
      pulse: true,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
          {config.pulse && (
            <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping opacity-75`}></div>
          )}
        </div>
        <span className={`text-xs font-medium ${config.textColor}`}>{config.text}</span>
      </div>

      {showReconnect && (
        <button
          onClick={handleReconnect}
          className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md font-semibold transition-all"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};
