export type Player = 'red' | 'yellow';
export type Cell = Player | null;

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  player: Player;
  column: number;
  row: number;
}

export class ConnectFourGame {
  board: Cell[][];
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  winningCells: Position[];
  moveHistory: Move[];
  gameState: 'playing' | 'won' | 'draw';

  constructor() {
    this.board = this.createEmptyBoard();
    this.currentPlayer = 'red';
    this.winner = null;
    this.winningCells = [];
    this.moveHistory = [];
    this.gameState = 'playing';
  }

  createEmptyBoard(): Cell[][] {
    // 6 rows x 7 columns
    return Array(6)
      .fill(null)
      .map(() => Array(7).fill(null));
  }

  dropPiece(column: number): number {
    if (column < 0 || column >= 7) return -1;
    if (this.gameState !== 'playing') return -1;

    // Find the lowest empty row in this column
    for (let row = 5; row >= 0; row--) {
      if (this.board[row][column] === null) {
        this.board[row][column] = this.currentPlayer;

        // Add to move history
        this.moveHistory.push({
          player: this.currentPlayer,
          column,
          row,
        });

        // Check for winner
        const result = this.checkWinner();
        if (result) {
          this.winner = result;
          this.gameState = result === 'draw' ? 'draw' : 'won';
        } else {
          // Switch players
          this.currentPlayer = this.currentPlayer === 'red' ? 'yellow' : 'red';
        }

        return row;
      }
    }

    return -1; // Column is full
  }

  checkWinner(): Player | 'draw' | null {
    // Check all positions for a win
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        const cell = this.board[row][col];
        if (cell === null) continue;

        // Check all 4 directions from this position
        // Horizontal
        if (this.checkDirection(row, col, 0, 1, cell)) {
          return cell;
        }
        // Vertical
        if (this.checkDirection(row, col, 1, 0, cell)) {
          return cell;
        }
        // Diagonal down-right
        if (this.checkDirection(row, col, 1, 1, cell)) {
          return cell;
        }
        // Diagonal down-left
        if (this.checkDirection(row, col, 1, -1, cell)) {
          return cell;
        }
      }
    }

    // Check for draw
    if (this.isBoardFull()) {
      return 'draw';
    }

    return null;
  }

  checkDirection(startRow: number, startCol: number, dRow: number, dCol: number, player: Player): boolean {
    const positions: Position[] = [];

    for (let i = 0; i < 4; i++) {
      const row = startRow + i * dRow;
      const col = startCol + i * dCol;

      // Check bounds
      if (row < 0 || row >= 6 || col < 0 || col >= 7) {
        return false;
      }

      // Check if cell matches player
      if (this.board[row][col] !== player) {
        return false;
      }

      positions.push({ row, col });
    }

    // Found 4 in a row!
    this.winningCells = positions;
    return true;
  }

  getValidMoves(): number[] {
    const validColumns: number[] = [];

    for (let col = 0; col < 7; col++) {
      // Check if top row is empty
      if (this.board[0][col] === null) {
        validColumns.push(col);
      }
    }

    return validColumns;
  }

  isColumnFull(column: number): boolean {
    if (column < 0 || column >= 7) return true;
    return this.board[0][column] !== null;
  }

  isBoardFull(): boolean {
    return this.board[0].every((cell) => cell !== null);
  }

  undoMove(): boolean {
    if (this.moveHistory.length === 0) return false;

    const lastMove = this.moveHistory.pop();
    if (!lastMove) return false;

    // Remove the piece
    this.board[lastMove.row][lastMove.column] = null;

    // Reset game state
    this.winner = null;
    this.winningCells = [];
    this.gameState = 'playing';

    // Switch back to previous player
    this.currentPlayer = lastMove.player;

    return true;
  }

  getBoardState(): Cell[][] {
    return JSON.parse(JSON.stringify(this.board));
  }

  loadBoardState(board: Cell[][]): void {
    this.board = JSON.parse(JSON.stringify(board));
  }

  getMoveHistory(): Move[] {
    return [...this.moveHistory];
  }
}
