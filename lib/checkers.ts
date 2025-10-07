export type PieceColor = 'red' | 'black';

export interface Piece {
  color: PieceColor;
  isKing: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures?: Position[]; // Captured pieces positions
  isMultiJump?: boolean;
}

export class CheckersGame {
  board: (Piece | null)[][];
  currentPlayer: PieceColor;
  capturedPieces: { red: number; black: number };
  lastMove: Move | null;
  gameState: 'playing' | 'won' | 'draw';
  winner: PieceColor | null;

  constructor() {
    this.board = this.createInitialBoard();
    this.currentPlayer = 'red';
    this.capturedPieces = { red: 0, black: 0 };
    this.lastMove = null;
    this.gameState = 'playing';
    this.winner = null;
  }

  createInitialBoard(): (Piece | null)[][] {
    const board: (Piece | null)[][] = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));

    // Place black pieces (top 3 rows)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { color: 'black', isKing: false };
        }
      }
    }

    // Place red pieces (bottom 3 rows)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { color: 'red', isKing: false };
        }
      }
    }

    return board;
  }

  getPiece(pos: Position): Piece | null {
    if (!this.isValidPosition(pos)) return null;
    return this.board[pos.row][pos.col];
  }

  isValidPosition(pos: Position): boolean {
    return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
  }

  isDarkSquare(pos: Position): boolean {
    return (pos.row + pos.col) % 2 === 1;
  }

  getValidMoves(pos: Position): Move[] {
    const piece = this.getPiece(pos);
    if (!piece || piece.color !== this.currentPlayer) return [];

    // Check for mandatory captures first
    const captures = this.getMandatoryCaptures();
    if (captures.length > 0) {
      // Only return capture moves from this position
      const captureMoves = this.getCaptureMoves(pos);
      return captureMoves.length > 0 ? captureMoves : [];
    }

    // Otherwise, return regular moves
    return this.getRegularMoves(pos);
  }

  getRegularMoves(pos: Position): Move[] {
    const piece = this.getPiece(pos);
    if (!piece) return [];

    const moves: Move[] = [];
    const directions = this.getMoveDirections(piece);

    for (const [dRow, dCol] of directions) {
      const newPos: Position = { row: pos.row + dRow, col: pos.col + dCol };

      if (this.isValidPosition(newPos) && !this.getPiece(newPos)) {
        moves.push({ from: pos, to: newPos });
      }
    }

    return moves;
  }

  getCaptureMoves(pos: Position, currentPath: Position[] = []): Move[] {
    const piece = this.getPiece(pos);
    if (!piece) return [];

    const moves: Move[] = [];
    const directions = this.getMoveDirections(piece);

    for (const [dRow, dCol] of directions) {
      const jumpedPos: Position = { row: pos.row + dRow, col: pos.col + dCol };
      const landPos: Position = { row: pos.row + dRow * 2, col: pos.col + dCol * 2 };

      const jumpedPiece = this.getPiece(jumpedPos);

      // Check if we can capture
      if (
        this.isValidPosition(landPos) &&
        jumpedPiece &&
        jumpedPiece.color !== piece.color &&
        !this.getPiece(landPos) &&
        !currentPath.some((p) => p.row === jumpedPos.row && p.col === jumpedPos.col)
      ) {
        const newPath = [...currentPath, jumpedPos];

        // Check for multi-jumps
        const furtherJumps = this.getCaptureMoves(landPos, newPath);

        if (furtherJumps.length > 0) {
          // Continue the multi-jump chain
          moves.push(...furtherJumps);
        } else {
          // End of jump chain
          moves.push({
            from: pos,
            to: landPos,
            captures: newPath,
            isMultiJump: newPath.length > 1,
          });
        }
      }
    }

    return moves;
  }

  getMoveDirections(piece: Piece): [number, number][] {
    const directions: [number, number][] = [];

    if (piece.color === 'red' || piece.isKing) {
      directions.push([-1, -1], [-1, 1]); // Move up
    }

    if (piece.color === 'black' || piece.isKing) {
      directions.push([1, -1], [1, 1]); // Move down
    }

    return directions;
  }

  getMandatoryCaptures(): Position[] {
    const positions: Position[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const pos: Position = { row, col };
        const piece = this.getPiece(pos);

        if (piece && piece.color === this.currentPlayer) {
          const captures = this.getCaptureMoves(pos);
          if (captures.length > 0) {
            positions.push(pos);
          }
        }
      }
    }

    return positions;
  }

  makeMove(from: Position, to: Position): boolean {
    const piece = this.getPiece(from);
    if (!piece || piece.color !== this.currentPlayer) return false;

    const validMoves = this.getValidMoves(from);
    const move = validMoves.find((m) => m.to.row === to.row && m.to.col === to.col);

    if (!move) return false;

    // Execute the move
    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = null;

    // Handle captures
    if (move.captures && move.captures.length > 0) {
      for (const capturedPos of move.captures) {
        const capturedPiece = this.getPiece(capturedPos);
        if (capturedPiece) {
          this.capturedPieces[capturedPiece.color]++;
          this.board[capturedPos.row][capturedPos.col] = null;
        }
      }
    }

    // Check for king promotion
    if ((piece.color === 'red' && to.row === 0) || (piece.color === 'black' && to.row === 7)) {
      this.board[to.row][to.col]!.isKing = true;
    }

    this.lastMove = move;

    // Check for win condition
    if (this.hasWon(this.currentPlayer)) {
      this.gameState = 'won';
      this.winner = this.currentPlayer;
      return true;
    }

    // Switch players
    this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';

    return true;
  }

  hasWon(player: PieceColor): boolean {
    const opponent: PieceColor = player === 'red' ? 'black' : 'red';

    // Check if opponent has any pieces left
    let opponentPieces = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.getPiece({ row, col });
        if (piece && piece.color === opponent) {
          opponentPieces++;
        }
      }
    }

    if (opponentPieces === 0) return true;

    // Check if opponent has any valid moves
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const pos: Position = { row, col };
        const piece = this.getPiece(pos);
        if (piece && piece.color === opponent) {
          // Temporarily switch to check opponent's moves
          const originalPlayer = this.currentPlayer;
          this.currentPlayer = opponent;
          const moves = this.getValidMoves(pos);
          this.currentPlayer = originalPlayer;

          if (moves.length > 0) return false;
        }
      }
    }

    return true; // No valid moves = win for current player
  }

  getAllValidMoves(): Move[] {
    const moves: Move[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const pos: Position = { row, col };
        const piece = this.getPiece(pos);
        if (piece && piece.color === this.currentPlayer) {
          moves.push(...this.getValidMoves(pos));
        }
      }
    }

    return moves;
  }

  getBoardState(): (Piece | null)[][] {
    return JSON.parse(JSON.stringify(this.board));
  }

  loadBoardState(board: (Piece | null)[][]): void {
    this.board = JSON.parse(JSON.stringify(board));
  }
}
