'use client';

import { useState, useEffect } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { toast } from 'react-hot-toast';

type ChessPiece = {
  type: PieceSymbol;
  color: Color;
};

interface Move {
  from: Square;
  to: Square;
  san: string;
}

interface PromotionModalProps {
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
  color: Color;
}

// Chess piece Unicode symbols
const PIECE_SYMBOLS: Record<Color, Record<PieceSymbol, string>> = {
  w: {
    k: '♔',
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘',
    p: '♙',
  },
  b: {
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟',
  },
};

const PromotionModal = ({ onSelect, onCancel, color }: PromotionModalProps) => {
  const pieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; name: string }> = [
    { type: 'q', name: 'Queen' },
    { type: 'r', name: 'Rook' },
    { type: 'b', name: 'Bishop' },
    { type: 'n', name: 'Knight' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="glass-card rounded-2xl p-8 max-w-md">
        <h3 className="text-2xl font-bold mb-6 text-center">Choose Promotion</h3>
        <div className="grid grid-cols-4 gap-4">
          {pieces.map(({ type, name }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="glass-card-hover p-6 rounded-xl flex flex-col items-center gap-2"
            >
              <div className="text-6xl">{PIECE_SYMBOLS[color][type]}</div>
              <div className="text-sm font-semibold">{name}</div>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-6 w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-semibold transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export const ChessBoard = () => {
  const [game, setGame] = useState<Chess>(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [isCheck, setIsCheck] = useState(false);
  const [gameStatus, setGameStatus] = useState<'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned'>('playing');
  const [winner, setWinner] = useState<Color | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [showDrawOffer, setShowDrawOffer] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (!isTimerActive || gameStatus !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, gameStatus]);

  const handleTimeout = () => {
    toast.error('Time ran out! You forfeit the game.');
    setGameStatus('resigned');
    setWinner(game.turn() === 'w' ? 'b' : 'w');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLightSquare = (square: Square) => {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;
    return (file + rank) % 2 === 0;
  };

  const squareToCoords = (square: Square): { row: number; col: number } => {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;
    return { row: 7 - rank, col: file };
  };

  const coordsToSquare = (row: number, col: number): Square => {
    const file = String.fromCharCode('a'.charCodeAt(0) + col);
    const rank = (8 - row).toString();
    return (file + rank) as Square;
  };

  const handleSquareClick = (square: Square) => {
    const piece = game.get(square);

    // If selecting a piece
    if (!selectedSquare) {
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setValidMoves(moves.map((m) => m.to as Square));
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // If selecting a different piece of same color
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      setValidMoves(moves.map((m) => m.to as Square));
      return;
    }

    // Attempt to make a move
    attemptMove(selectedSquare, square);
  };

  const attemptMove = (from: Square, to: Square) => {
    try {
      // Check if this is a pawn promotion move
      const piece = game.get(from);
      if (
        piece &&
        piece.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))
      ) {
        setPendingPromotion({ from, to });
        setShowPromotionModal(true);
        return;
      }

      // Make the move
      const move = game.move({ from, to });

      if (move) {
        executeMove(move);
      } else {
        toast.error('Invalid move!');
      }
    } catch (error) {
      toast.error('Invalid move!');
    }

    setSelectedSquare(null);
    setValidMoves([]);
  };

  const handlePromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;

    try {
      const move = game.move({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: piece,
      });

      if (move) {
        executeMove(move);
      }
    } catch (error) {
      toast.error('Invalid move!');
    }

    setShowPromotionModal(false);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setValidMoves([]);
  };

  const executeMove = (move: any) => {
    setLastMove({ from: move.from, to: move.to });
    setMoveHistory((prev) => [...prev, { from: move.from, to: move.to, san: move.san }]);

    // Check game status
    setIsCheck(game.inCheck());

    if (game.isCheckmate()) {
      setGameStatus('checkmate');
      setWinner(game.turn() === 'w' ? 'b' : 'w');
      toast.success(`Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`);
    } else if (game.isStalemate()) {
      setGameStatus('stalemate');
      toast('Stalemate! Game is a draw.', { icon: '🤝' });
    } else if (game.isDraw()) {
      setGameStatus('draw');
      toast('Draw!', { icon: '🤝' });
    } else if (game.inCheck()) {
      toast('Check!', { icon: '⚠️' });
    }

    // Reset timer for next turn
    setTimeLeft(300);

    // Force re-render
    setGame(new Chess(game.fen()));

    // Save FEN to state (for later server sync)
    console.log('Current FEN:', game.fen());
  };

  const handleResign = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      setGameStatus('resigned');
      setWinner(game.turn() === 'w' ? 'b' : 'w');
      toast('You resigned. Game over.', { icon: '🏳️' });
    }
  };

  const handleDrawOffer = () => {
    setShowDrawOffer(true);
    toast('Draw offer sent to opponent.', { icon: '🤝' });
  };

  const handleDrawAccept = () => {
    setGameStatus('draw');
    setShowDrawOffer(false);
    toast.success('Draw accepted!');
  };

  const handleDrawDecline = () => {
    setShowDrawOffer(false);
    toast('Draw offer declined.', { icon: '❌' });
  };

  const renderBoard = () => {
    const board = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = coordsToSquare(row, col);
        const piece = game.get(square);
        const isLight = isLightSquare(square);
        const isSelected = selectedSquare === square;
        const isValidMove = validMoves.includes(square);
        const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
        const isKingInCheck = isCheck && piece?.type === 'k' && piece.color === game.turn();

        board.push(
          <div
            key={square}
            onClick={() => handleSquareClick(square)}
            className={`
              relative flex items-center justify-center cursor-pointer transition-all duration-200
              ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
              ${isSelected ? 'ring-4 ring-teal-500 ring-inset' : ''}
              ${isValidMove ? 'ring-4 ring-green-500/50 ring-inset' : ''}
              ${isLastMoveSquare ? 'bg-yellow-400/40' : ''}
              ${isKingInCheck ? 'ring-4 ring-red-500 ring-inset animate-pulse' : ''}
              hover:brightness-110
            `}
          >
            {piece && (
              <div
                className={`text-5xl select-none transition-transform duration-200 hover:scale-110 ${
                  piece.color === 'w' ? 'text-white drop-shadow-lg' : 'text-slate-900'
                }`}
              >
                {PIECE_SYMBOLS[piece.color][piece.type]}
              </div>
            )}

            {isValidMove && !piece && <div className="w-4 h-4 bg-green-500 rounded-full opacity-60"></div>}

            {isValidMove && piece && (
              <div className="absolute inset-0 border-4 border-red-500 rounded-sm opacity-50"></div>
            )}

            {/* Square label (for debugging) */}
            <div className="absolute bottom-0 right-0 text-[8px] opacity-30 pointer-events-none">
              {square}
            </div>
          </div>
        );
      }
    }
    return board;
  };

  return (
    <div className="flex gap-6">
      {/* Promotion Modal */}
      {showPromotionModal && pendingPromotion && (
        <PromotionModal
          color={game.get(pendingPromotion.from)?.color || 'w'}
          onSelect={handlePromotion}
          onCancel={() => {
            setShowPromotionModal(false);
            setPendingPromotion(null);
            setSelectedSquare(null);
            setValidMoves([]);
          }}
        />
      )}

      {/* Draw Offer Notification */}
      {showDrawOffer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="glass-card rounded-2xl p-8 max-w-md">
            <h3 className="text-2xl font-bold mb-4">Draw Offer</h3>
            <p className="text-slate-300 mb-6">Your opponent offers a draw. Do you accept?</p>
            <div className="flex gap-4">
              <button
                onClick={handleDrawAccept}
                className="flex-1 bg-green-500 hover:bg-green-600 py-3 rounded-lg font-semibold transition-all"
              >
                Accept
              </button>
              <button
                onClick={handleDrawDecline}
                className="flex-1 bg-red-500 hover:bg-red-600 py-3 rounded-lg font-semibold transition-all"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Board */}
      <div className="flex flex-col items-center">
        {/* Status Bar */}
        <div className="glass-card rounded-2xl p-4 mb-4 w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Current Turn</p>
              <p className="text-xl font-bold capitalize">{game.turn() === 'w' ? 'White' : 'Black'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Time Left</p>
              <p className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-teal-400'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>

          {isCheck && gameStatus === 'playing' && (
            <div className="mt-3 p-3 bg-red-500/20 border border-red-500 rounded-lg text-center font-bold text-red-400">
              CHECK!
            </div>
          )}

          {gameStatus === 'checkmate' && (
            <div className="mt-3 p-3 bg-green-500/20 border border-green-500 rounded-lg text-center">
              <p className="font-bold text-green-400 text-xl">CHECKMATE!</p>
              <p className="text-sm">{winner === 'w' ? 'White' : 'Black'} wins!</p>
            </div>
          )}

          {gameStatus === 'stalemate' && (
            <div className="mt-3 p-3 bg-blue-500/20 border border-blue-500 rounded-lg text-center font-bold text-blue-400">
              STALEMATE - Draw
            </div>
          )}

          {gameStatus === 'draw' && (
            <div className="mt-3 p-3 bg-blue-500/20 border border-blue-500 rounded-lg text-center font-bold text-blue-400">
              DRAW
            </div>
          )}
        </div>

        {/* Chess Board */}
        <div
          className="grid grid-cols-8 gap-0 shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700"
          style={{ width: 'min(90vw, 600px)', height: 'min(90vw, 600px)' }}
        >
          {renderBoard()}
        </div>

        {/* Controls */}
        {gameStatus === 'playing' && (
          <div className="flex gap-3 mt-4 w-full">
            <button
              onClick={handleResign}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500 text-red-400 py-3 rounded-lg font-semibold transition-all"
            >
              Resign
            </button>
            <button
              onClick={handleDrawOffer}
              className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500 text-blue-400 py-3 rounded-lg font-semibold transition-all"
            >
              Offer Draw
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-sm text-slate-400">
          Click a piece to see valid moves • {isCheck && 'You must move out of check!'}
        </div>
      </div>

      {/* Move History Sidebar */}
      <div className="glass-card rounded-2xl p-6 w-64">
        <h3 className="text-xl font-bold mb-4">Move History</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
          {moveHistory.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No moves yet</p>
          ) : (
            moveHistory.map((move, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg ${
                  index === moveHistory.length - 1 ? 'bg-teal-500/20 border border-teal-500' : 'bg-slate-800/50'
                }`}
              >
                <span className="text-slate-400 text-sm">
                  {Math.floor(index / 2) + 1}
                  {index % 2 === 0 ? '.' : '...'}
                </span>
                <span className="ml-2 font-mono font-bold">{move.san}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
