/**
 * Chess Utility functions for parsing PGN and simulating historical statistics.
 */

export interface ChessGameMeta {
  gameId: string;
  white: string;
  black: string;
  whiteElo: number;
  blackElo: number;
  date: string;
  timeClass: string;
  timeControl: string;
  color: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  opening: string;
  baseOpening: string;
  movesCount: number;
  pgn: string;
}

// Map chess.com result codes to simplified outcome
export function parseGameResult(
  whiteUsername: string,
  blackUsername: string,
  playerColor: 'white' | 'black',
  whiteResult: string,
  blackResult: string
): 'win' | 'loss' | 'draw' {
  const isPlayerWhite = playerColor === 'white';
  const playerResult = isPlayerWhite ? whiteResult : blackResult;
  const opponentResult = isPlayerWhite ? blackResult : whiteResult;

  if (playerResult === 'win') {
    return 'win';
  }

  const drawCodes = [
    'agreed',
    'stalemate',
    'repetition',
    'insufficient',
    'timeout_vs_insufficient_material',
    '50moves',
    'draw'
  ];

  if (drawCodes.includes(playerResult) || drawCodes.includes(opponentResult)) {
    return 'draw';
  }

  // Any other code means the player lost (resigned, checkmated, timeout, abandoned, etc.)
  return 'loss';
}

// Parse PGN tags using RegExp
export function parsePgnTags(pgn: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const regex = /\[([A-Za-z0-9_]+)\s+"([^"]*)"\]/g;
  let match;
  while ((match = regex.exec(pgn)) !== null) {
    tags[match[1]] = match[2];
  }
  return tags;
}

// Base opening extractor
export function getBaseOpening(openingName: string): string {
  if (!openingName) return 'Unknown Opening';
  // Common split patterns in chess opening strings (e.g. "Sicilian Defense: Najdorf Variation")
  const splitters = [':', ' -', ','];
  let base = openingName;
  for (const s of splitters) {
    if (base.includes(s)) {
      base = base.split(s)[0];
    }
  }
  return base.trim();
}

// Count moves in PGN
export function countPgnMoves(pgn: string): number {
  // Strip tags
  const movesPart = pgn.replace(/\[.*?\]/g, '').trim();
  // Find all move numbers like "1.", "2.", "30."
  const matches = movesPart.match(/\d+\./g);
  return matches ? matches.length : 0;
}

// Seed mock/analytical details for a game to simulate accurate history
export function analyzeGameHeuristically(
  game: ChessGameMeta,
  hasBrilliant: boolean = false
) {
  const isWin = game.result === 'win';
  const isLoss = game.result === 'loss';
  const isDraw = game.result === 'draw';

  // Base accuracy on rating and game outcome
  let accuracy = 75; // average
  const elo = game.color === 'white' ? game.whiteElo : game.blackElo;

  // Higher rated players have higher baseline accuracy
  const eloBonus = Math.max(0, (elo - 800) / 100) * 1.5;
  
  if (isWin) {
    accuracy = 80 + Math.random() * 15 + eloBonus; // 80% to 95%+
  } else if (isLoss) {
    accuracy = 55 + Math.random() * 20 + eloBonus * 0.8; // 55% to 75%+
  } else {
    accuracy = 72 + Math.random() * 16 + eloBonus; // 72% to 88%
  }

  // Clamp accuracy
  accuracy = Math.min(99.4, Math.max(35.0, accuracy));

  const totalMoves = Math.max(10, game.movesCount);
  
  // Distribute moves based on accuracy
  // Move types: brilliant, great, excellent, good, best, book, inaccuracy, mistake, blunder
  let book = Math.min(totalMoves, 3 + Math.floor(Math.random() * 6));
  let remaining = totalMoves - book;

  let blunder = 0;
  let mistake = 0;
  let inaccuracy = 0;

  if (accuracy < 60) {
    blunder = Math.floor(Math.random() * 3) + 1;
    mistake = Math.floor(Math.random() * 4) + 1;
    inaccuracy = Math.floor(Math.random() * 5) + 2;
  } else if (accuracy < 75) {
    blunder = Math.random() > 0.6 ? 1 : 0;
    mistake = Math.floor(Math.random() * 2) + 1;
    inaccuracy = Math.floor(Math.random() * 4) + 1;
  } else if (accuracy < 88) {
    blunder = Math.random() > 0.85 ? 1 : 0;
    mistake = Math.random() > 0.6 ? 1 : 0;
    inaccuracy = Math.floor(Math.random() * 3);
  } else {
    blunder = 0;
    mistake = 0;
    inaccuracy = Math.random() > 0.7 ? 1 : 0;
  }

  // Adjust for remaining moves
  let badMovesCount = blunder + mistake + inaccuracy;
  if (remaining < badMovesCount) {
    remaining = badMovesCount + 2;
    book = Math.max(2, totalMoves - remaining);
  }

  let activeRemaining = totalMoves - book - badMovesCount;
  
  let brilliant = 0;
  if (hasBrilliant || (isWin && accuracy > 90 && Math.random() > 0.95)) {
    brilliant = 1;
  }

  let great = 0;
  if (accuracy > 85) {
    great = Math.floor(Math.random() * 3);
  }

  let best = Math.floor(activeRemaining * (accuracy / 100));
  let excellent = Math.floor((activeRemaining - best) * 0.6);
  let good = Math.max(0, activeRemaining - best - excellent - brilliant - great);

  // Re-adjust total
  const sum = book + brilliant + great + best + excellent + good + inaccuracy + mistake + blunder;
  const diff = totalMoves - sum;
  best += diff; // dump diff in best moves

  // Est performance rating
  let perfRating = elo;
  if (isWin) {
    perfRating = elo + 150 + Math.floor(accuracy * 4);
  } else if (isLoss) {
    perfRating = elo - 200 + Math.floor(accuracy * 2);
  } else {
    perfRating = elo - 25 + Math.floor((accuracy - 70) * 3);
  }

  return {
    accuracy: parseFloat(accuracy.toFixed(1)),
    opponentAccuracy: parseFloat((accuracy + (isWin ? -12 : isLoss ? 12 : 0) + (Math.random() * 8 - 4)).toFixed(1)),
    perfRating: Math.max(300, perfRating),
    moveStats: {
      brilliant,
      great,
      excellent,
      good,
      best,
      book,
      inaccuracy,
      mistake,
      blunder
    }
  };
}

// Generate an interactive position for a Brilliant Move
export interface BrilliantMovePosition {
  fenBefore: string;
  fenAfter: string;
  sanMove: string;
  explanation: string;
  evalBefore: number;
  evalAfter: number;
}

// A pool of typical tactically brilliant patterns to seed realistic positions
const brilliantMovePatterns: BrilliantMovePosition[] = [
  {
    fenBefore: 'r1bqk2r/ppp2ppp/2n5/1B1pP3/3Pn3/2b2N2/PP3PPP/R1BQK2R w KQkq - 0 9',
    fenAfter: 'r1bqk2r/ppp2ppp/2n5/1B1pP3/3Pn3/2P2N2/P4PPP/R1BQK2R b KQkq - 0 9',
    sanMove: 'bxc3',
    evalBefore: -1.5,
    evalAfter: 0.1,
    explanation: 'A brilliant defensive exchange that damages the pawn structure but eliminates the dangerous bishop and stabilizes the center.'
  },
  {
    fenBefore: 'r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
    fenAfter: 'r1bqk2r/ppppbppp/2n2N2/4p3/2B1P3/5N2/PPPP1PPP/R1BQK2R b KQkq - 0 5',
    sanMove: 'Nd5',
    evalBefore: 0.0,
    evalAfter: 1.4,
    explanation: 'A brilliant positional piece sacrifice. Moving the knight to d5 opens lines for the white rook and targets the weak f7 square.'
  },
  {
    fenBefore: 'r3k2r/ppqn1ppp/2pbpn2/3p4/2PP4/1P1BPN2/PB3PPP/R2QK2R w KQkq - 3 10',
    fenAfter: 'r3k2r/ppqn1ppp/2pbpn2/3P4/3P4/1P1BPN2/PB3PPP/R2QK2R b KQkq - 0 10',
    sanMove: 'cxd5',
    evalBefore: 0.2,
    evalAfter: -0.8,
    explanation: 'A brilliant central breakthrough that isolates white\'s d4 pawn and creates strong counterplay on the c-file.'
  },
  {
    fenBefore: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R b KQkq - 2 4',
    fenAfter: 'r1bqkb1r/pppp1ppp/2n2N2/4p3/4P3/3P1N2/PPP2PPP/R1BQKB1R b KQkq - 0 4',
    sanMove: 'Nxe4',
    evalBefore: -0.1,
    evalAfter: 1.8,
    explanation: 'A fantastic central piece sacrifice that completely exposes the white king\'s castling defense.'
  },
  {
    fenBefore: '2r1r1k1/pp3ppp/2n5/1B1p4/3P4/BP2PN2/P4PPP/R3K2R b KQ - 2 15',
    fenAfter: '2r1r1k1/pp3ppp/8/1B1p4/3P4/BPn1PN2/P4PPP/R3K2R w KQ - 0 16',
    sanMove: 'Nxd4',
    evalBefore: -1.2,
    evalAfter: 2.1,
    explanation: 'A beautiful knight sacrifice in the center, winning the key d4 pawn and trapping the opponent\'s white-squared bishop.'
  }
];

export function getRandomBrilliantMove(): BrilliantMovePosition {
  const index = Math.floor(Math.random() * brilliantMovePatterns.length);
  return brilliantMovePatterns[index];
}
