'use client';

import { useState, useEffect } from 'react';
import { ConnectFourGame, Player, Cell, Position } from '@/lib/connectFour';
import { toast } from 'react-hot-toast';

export const ConnectFourBoard = () => {
  const [game, setGame] = useState<ConnectFourGame>(new ConnectFourGame());
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [droppingDisc, setDroppingDisc] = useState<{ col: number; row: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleColumnClick = async (col: number) => {
    if (isDropping || game.gameState !== 'playing') return;
    if (game.isColumnFull(col)) {
      toast('Column is full!', { icon: '⚠️' });
      return;
    }

    setIsDropping(true);

    // Drop the piece
    const row = game.dropPiece(col);

    if (row === -1) {
      setIsDropping(false);
      return;
    }

    // Animate the drop
    setDroppingDisc({ col, row });
    await new Promise((resolve) => setTimeout(resolve, 400));
    setDroppingDisc(null);

    // Check for game end before state update
    const gameEnded = game.gameState !== 'playing';
    const gameWinner = game.winner;

    // Force re-render by creating new game instance with same state
    setGame((prev) => {
      const newGame = new ConnectFourGame();
      newGame.board = prev.board;
      newGame.currentPlayer = prev.currentPlayer;
      newGame.winner = prev.winner;
      newGame.winningCells = prev.winningCells;
      newGame.moveHistory = prev.moveHistory;
      newGame.gameState = prev.gameState;
      return newGame;
    });

    // Save game state for later sync
    console.log('Connect Four State:', JSON.stringify(game.getBoardState()));

    // Check for game end
    if (gameEnded) {
      if (gameWinner === 'draw') {
        toast("It's a draw!", { icon: '🤝' });
      } else {
        toast(`${gameWinner === 'red' ? 'Red' : 'Yellow'} wins!`, { icon: '🏆' });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }

    setIsDropping(false);
  };

  const isWinningCell = (row: number, col: number): boolean => {
    return game.winningCells.some((pos) => pos.row === row && pos.col === col);
  };

  const resetGame = () => {
    setGame(new ConnectFourGame());
    setShowConfetti(false);
    setHoveredCol(null);
    setDroppingDisc(null);
    setIsDropping(false);
  };

  const undoMove = () => {
    const success = game.undoMove();
    if (success) {
      setGame((prev) => {
        const newGame = new ConnectFourGame();
        newGame.board = prev.board;
        newGame.currentPlayer = prev.currentPlayer;
        newGame.winner = prev.winner;
        newGame.winningCells = prev.winningCells;
        newGame.moveHistory = prev.moveHistory;
        newGame.gameState = prev.gameState;
        return newGame;
      });
      toast('Move undone', { icon: '↩️' });
    } else {
      toast('No moves to undo!', { icon: '⚠️' });
    }
  };

  return (
    <div className="flex gap-6">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#ef4444', '#fbbf24', '#14b8a6', '#8b5cf6'][Math.floor(Math.random() * 4)],
              }}
            />
          ))}
        </div>
      )}

      {/* Main Game Area */}
      <div className="flex flex-col items-center">
        {/* Status Display */}
        <div className="glass-card rounded-2xl p-4 mb-4 w-full">
          <div className="text-center">
            {game.gameState === 'playing' ? (
              <>
                <p className="text-sm text-slate-400">Current Turn</p>
                <p className="text-xl font-bold capitalize flex items-center justify-center gap-2">
                  <span
                    className={`w-4 h-4 rounded-full ${
                      game.currentPlayer === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                    }`}
                  ></span>
                  {game.currentPlayer}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-400">Game Over</p>
                <p className="text-xl font-bold capitalize mb-3">
                  {game.winner === 'draw' ? (
                    <span className="text-slate-300">It&apos;s a Draw! 🤝</span>
                  ) : (
                    <span className={game.winner === 'red' ? 'text-red-400' : 'text-yellow-400'}>
                      {game.winner} Wins! 🏆
                    </span>
                  )}
                </p>
                <button
                  onClick={resetGame}
                  className="bg-teal-500 hover:bg-teal-600 px-6 py-2 rounded-lg font-semibold transition-all"
                >
                  Play Again
                </button>
              </>
            )}
          </div>
        </div>

        {/* Game Board */}
        <div className="relative">
          {/* Board Container */}
          <div
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4 shadow-2xl border-4 border-blue-900"
            style={{ width: 'min(90vw, 560px)' }}
          >
            {/* Column Numbers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {Array(7)
                .fill(0)
                .map((_, col) => {
                  const isFullCol = game.isColumnFull(col);
                  return (
                    <button
                      key={`col-${col}`}
                      onClick={() => handleColumnClick(col)}
                      onMouseEnter={() => setHoveredCol(col)}
                      onMouseLeave={() => setHoveredCol(null)}
                      disabled={isDropping || game.gameState !== 'playing' || isFullCol}
                      className={`h-12 flex flex-col items-center justify-center rounded-lg transition-all duration-200 ${
                        isFullCol
                          ? 'bg-slate-700 cursor-not-allowed opacity-50'
                          : hoveredCol === col && game.gameState === 'playing'
                          ? 'bg-teal-500 scale-110 cursor-pointer'
                          : 'bg-slate-800/50 hover:bg-slate-700 cursor-pointer'
                      }`}
                    >
                      <span className="text-lg font-bold text-white">{col + 1}</span>
                      {hoveredCol === col && !isFullCol && game.gameState === 'playing' && (
                        <div
                          className={`w-8 h-8 rounded-full mt-1 ${
                            game.currentPlayer === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                          } opacity-70 animate-bounce`}
                        ></div>
                      )}
                    </button>
                  );
                })}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-2">
              {Array(6)
                .fill(0)
                .map((_, row) =>
                  Array(7)
                    .fill(0)
                    .map((_, col) => {
                      const cell = game.board[row][col];
                      const isWinning = isWinningCell(row, col);
                      const isDroppingHere = droppingDisc?.col === col && droppingDisc?.row === row;

                      return (
                        <div
                          key={`${row}-${col}`}
                          className={`
                            aspect-square rounded-full transition-all duration-300 relative
                            ${cell ? '' : 'bg-slate-900/30'}
                            ${isWinning ? 'animate-pulse ring-4 ring-teal-400' : ''}
                          `}
                          style={{
                            backgroundColor: cell === 'red' ? '#ef4444' : cell === 'yellow' ? '#fbbf24' : undefined,
                            boxShadow: cell
                              ? `0 4px 6px rgba(0, 0, 0, 0.4), inset 0 -3px 5px rgba(0, 0, 0, 0.3), inset 0 3px 5px rgba(255, 255, 255, 0.3)`
                              : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
                            animation: isDroppingHere ? 'dropBounce 0.4s ease-out' : undefined,
                          }}
                        >
                          {isWinning && cell && (
                            <div className="absolute inset-0 rounded-full bg-white/30 animate-ping"></div>
                          )}
                        </div>
                      );
                    })
                )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-slate-400">
          Click column numbers to drop your disc • Connect 4 in a row to win
        </div>
      </div>

      {/* Sidebar */}
      <div className="glass-card rounded-2xl p-6 w-72">
        <h3 className="text-xl font-bold mb-4">Game Info</h3>

        <div className="space-y-4">
          {/* Move History */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-2">Move History</h4>
            <div className="bg-slate-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
              {game.moveHistory.length === 0 ? (
                <p className="text-xs text-slate-500 text-center">No moves yet</p>
              ) : (
                <div className="space-y-1">
                  {game.moveHistory.map((move, idx) => (
                    <div
                      key={idx}
                      className={`text-xs font-mono p-2 rounded flex items-center gap-2 ${
                        move.player === 'red' ? 'bg-red-500/10' : 'bg-yellow-400/10'
                      }`}
                    >
                      <span className="font-bold text-slate-500">#{idx + 1}</span>
                      <span
                        className={`w-3 h-3 rounded-full ${
                          move.player === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                        }`}
                      ></span>
                      <span>Column {move.column + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Game Controls */}
          <div className="space-y-2">
            <button
              onClick={undoMove}
              disabled={game.moveHistory.length === 0 || game.gameState !== 'playing'}
              className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              <span>↩️</span>
              Undo Move
            </button>
            <button
              onClick={resetGame}
              className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold transition-all"
            >
              New Game
            </button>
          </div>

          {/* Game Stats */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-2">Statistics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                <span className="text-slate-400">Moves played:</span>
                <span className="font-bold">{game.moveHistory.length}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                <span className="text-slate-400">Valid columns:</span>
                <span className="font-bold">{game.getValidMoves().length}</span>
              </div>
            </div>
          </div>

          {/* Rules */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-2">Rules</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Drop discs into columns</li>
              <li>• Connect 4 in a row to win</li>
              <li>• Horizontal, vertical, or diagonal</li>
              <li>• First to 4 wins!</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes dropBounce {
          0% {
            transform: translateY(-400%) scale(0.8);
            opacity: 0.5;
          }
          70% {
            transform: translateY(0%) scale(1.05);
          }
          85% {
            transform: translateY(-8%) scale(0.98);
          }
          100% {
            transform: translateY(0%) scale(1);
            opacity: 1;
          }
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: fall 3s linear forwards;
        }

        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
