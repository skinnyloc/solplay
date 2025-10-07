'use client';

import { useState, useEffect } from 'react';
import { CheckersGame, Position, Piece, PieceColor } from '@/lib/checkers';
import { toast } from 'react-hot-toast';

export const CheckersBoard = () => {
  const [game, setGame] = useState<CheckersGame>(new CheckersGame());
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [mandatoryCaptures, setMandatoryCaptures] = useState<Position[]>([]);
  const [animatingPiece, setAnimatingPiece] = useState<Position | null>(null);
  const [fadingPieces, setFadingPieces] = useState<Position[]>([]);

  // Update mandatory captures whenever game state changes
  useEffect(() => {
    const captures = game.getMandatoryCaptures();
    setMandatoryCaptures(captures);
  }, [game]);

  const isDarkSquare = (row: number, col: number) => {
    return (row + col) % 2 === 1;
  };

  const isSelected = (row: number, col: number): boolean => {
    return selectedSquare?.row === row && selectedSquare?.col === col;
  };

  const isValidMove = (row: number, col: number): boolean => {
    return validMoves.some((move) => move.row === row && move.col === col);
  };

  const isMandatoryCapture = (row: number, col: number): boolean => {
    return mandatoryCaptures.some((pos) => pos.row === row && pos.col === col);
  };

  const handleSquareClick = (row: number, col: number) => {
    // Only dark squares are playable
    if (!isDarkSquare(row, col)) return;

    const clickedPos: Position = { row, col };
    const piece = game.getPiece(clickedPos);

    // If no piece selected yet
    if (!selectedSquare) {
      if (piece && piece.color === game.currentPlayer) {
        // Check if this piece has mandatory captures
        if (mandatoryCaptures.length > 0 && !isMandatoryCapture(row, col)) {
          toast.error('You must capture! Select a piece that can capture.', { icon: '⚠️' });
          return;
        }

        setSelectedSquare(clickedPos);
        const moves = game.getValidMoves(clickedPos);
        setValidMoves(moves.map((m) => m.to));
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare.row === row && selectedSquare.col === col) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // If selecting a different piece of same color
    if (piece && piece.color === game.currentPlayer) {
      // Check mandatory captures
      if (mandatoryCaptures.length > 0 && !isMandatoryCapture(row, col)) {
        toast.error('You must capture! Select a piece that can capture.', { icon: '⚠️' });
        return;
      }

      setSelectedSquare(clickedPos);
      const moves = game.getValidMoves(clickedPos);
      setValidMoves(moves.map((m) => m.to));
      return;
    }

    // Attempt to make a move
    if (isValidMove(row, col)) {
      attemptMove(selectedSquare, clickedPos);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const attemptMove = async (from: Position, to: Position) => {
    // Get the move details before making it
    const moves = game.getValidMoves(from);
    const move = moves.find((m) => m.to.row === to.row && m.to.col === to.col);

    if (!move) {
      toast.error('Invalid move!');
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Animate the move
    setAnimatingPiece(from);

    // If there are captures, fade out captured pieces
    if (move.captures && move.captures.length > 0) {
      setFadingPieces(move.captures);
      setTimeout(() => setFadingPieces([]), 300);

      if (move.isMultiJump) {
        toast.success('Multi-jump!', { icon: '🔥' });
      }
    }

    // Wait for animation
    await new Promise((resolve) => setTimeout(resolve, 300));
    setAnimatingPiece(null);

    // Make the move
    const success = game.makeMove(from, to);

    if (success) {
      // Check if piece was promoted
      const movedPiece = game.getPiece(to);
      if (movedPiece?.isKing && !game.getPiece(from)?.isKing) {
        toast.success('Crowned! 👑');
      }

      // Check for win
      if (game.gameState === 'won') {
        toast.success(`${game.winner === 'red' ? 'Red' : 'Black'} wins!`, { icon: '🏆' });
      }

      // Force re-render
      setGame(new CheckersGame());
      setGame((prev) => {
        const newGame = new CheckersGame();
        newGame.board = game.board;
        newGame.currentPlayer = game.currentPlayer;
        newGame.capturedPieces = game.capturedPieces;
        newGame.lastMove = game.lastMove;
        newGame.gameState = game.gameState;
        newGame.winner = game.winner;
        return newGame;
      });

      // Save game state (for later sync)
      console.log('Board State:', JSON.stringify(game.getBoardState()));
    } else {
      toast.error('Invalid move!');
    }

    setSelectedSquare(null);
    setValidMoves([]);
  };

  const renderPiece = (piece: Piece, row: number, col: number) => {
    const isFading = fadingPieces.some((pos) => pos.row === row && pos.col === col);
    const isAnimating = animatingPiece?.row === row && animatingPiece?.col === col;

    return (
      <div
        className={`relative w-16 h-16 flex items-center justify-center transition-all duration-300 ${
          isFading ? 'opacity-0 scale-50' : 'opacity-100'
        } ${isAnimating ? 'scale-110' : ''}`}
      >
        {/* Checker piece */}
        <div
          className={`
            w-12 h-12 rounded-full shadow-lg transition-transform duration-200 hover:scale-110
            ${piece.color === 'red' ? 'bg-red-500 border-4 border-red-700' : 'bg-slate-900 border-4 border-slate-700'}
          `}
        >
          {piece.isKing && (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-yellow-400 drop-shadow-lg">
              ♔
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-6">
      {/* Main Board */}
      <div className="flex flex-col items-center">
        {/* Status Bar */}
        <div className="glass-card rounded-2xl p-4 mb-4 w-full">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-slate-400">Current Turn</p>
              <p className="text-xl font-bold capitalize flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full ${
                    game.currentPlayer === 'red' ? 'bg-red-500' : 'bg-slate-900 border-2 border-white'
                  }`}
                ></span>
                {game.currentPlayer}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Captured</p>
              <div className="flex gap-3">
                <span className="font-bold text-red-400">{game.capturedPieces.red}</span>
                <span className="text-slate-500">-</span>
                <span className="font-bold text-slate-300">{game.capturedPieces.black}</span>
              </div>
            </div>
          </div>

          {mandatoryCaptures.length > 0 && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-center font-bold text-red-400 animate-pulse">
              ⚠️ CAPTURE AVAILABLE! You must capture!
            </div>
          )}

          {game.gameState === 'won' && game.winner && (
            <div className="mt-3 p-3 bg-green-500/20 border border-green-500 rounded-lg text-center">
              <p className="font-bold text-green-400 text-xl">
                {game.winner === 'red' ? '🔴 RED' : '⚫ BLACK'} WINS!
              </p>
            </div>
          )}
        </div>

        {/* Checkers Board */}
        <div
          className="grid grid-cols-8 gap-0 shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700"
          style={{ width: 'min(90vw, 600px)', height: 'min(90vw, 600px)' }}
        >
          {Array(8)
            .fill(0)
            .map((_, row) =>
              Array(8)
                .fill(0)
                .map((_, col) => {
                  const isDark = isDarkSquare(row, col);
                  const piece = game.getPiece({ row, col });
                  const selected = isSelected(row, col);
                  const validMove = isValidMove(row, col);
                  const mandatoryPiece = isMandatoryCapture(row, col);

                  // Check if this move is a capture
                  const moveDetail = selectedSquare
                    ? game.getValidMoves(selectedSquare).find((m) => m.to.row === row && m.to.col === col)
                    : null;
                  const isCapture = moveDetail?.captures && moveDetail.captures.length > 0;

                  return (
                    <div
                      key={`${row}-${col}`}
                      onClick={() => handleSquareClick(row, col)}
                      className={`
                        relative flex items-center justify-center transition-all duration-200
                        ${isDark ? 'bg-slate-800 cursor-pointer hover:bg-slate-700' : 'bg-slate-300'}
                        ${selected ? 'ring-4 ring-teal-500 ring-inset' : ''}
                        ${validMove ? 'ring-4 ring-green-500/50 ring-inset' : ''}
                        ${mandatoryPiece ? 'ring-4 ring-red-500 ring-inset animate-pulse' : ''}
                      `}
                    >
                      {piece && renderPiece(piece, row, col)}

                      {validMove && !piece && (
                        <div
                          className={`w-4 h-4 rounded-full opacity-60 ${isCapture ? 'bg-red-500' : 'bg-green-500'}`}
                        ></div>
                      )}

                      {validMove && piece && (
                        <div className="absolute inset-0 border-4 border-red-500 rounded-sm opacity-50"></div>
                      )}
                    </div>
                  );
                })
            )}
        </div>

        <div className="mt-4 text-center text-sm text-slate-400">
          Click a checker to see valid moves •{' '}
          {mandatoryCaptures.length > 0 ? 'Captures are mandatory!' : 'Jump over opponents to capture'}
        </div>
      </div>

      {/* Sidebar */}
      <div className="glass-card rounded-2xl p-6 w-64">
        <h3 className="text-xl font-bold mb-4">Game Info</h3>

        <div className="space-y-4">
          {/* Captured Pieces */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-2">Captured Pieces</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  Red
                </span>
                <span className="font-bold">{game.capturedPieces.red}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-slate-900 rounded-full border border-white"></span>
                  Black
                </span>
                <span className="font-bold">{game.capturedPieces.black}</span>
              </div>
            </div>
          </div>

          {/* Rules Reminder */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-2">Rules</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Move diagonally forward</li>
              <li>• Jump over opponents to capture</li>
              <li>• Multi-jumps are possible</li>
              <li>• Captures are mandatory</li>
              <li>• Reach end to become King 👑</li>
              <li>• Kings move in all diagonal directions</li>
            </ul>
          </div>

          {/* Game Status */}
          {game.gameState === 'won' && (
            <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg text-center">
              <p className="font-bold text-green-400 mb-2">Game Over!</p>
              <p className="text-sm capitalize">{game.winner} wins!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
