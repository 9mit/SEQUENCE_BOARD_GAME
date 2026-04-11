import { isOneEyedJack, isTwoEyedJack } from '../shared/constants.js';
import { listLegalActions, playCard } from '../shared/gameLogic.js';
import { BoardSpace, GameState, Player, TeamColor } from '../shared/types.js';

export type AIDecision =
  | { type: 'dead'; cardId: string }
  | { type: 'play'; cardId: string; spaceId: string };

export function makeAIMove(gameState: GameState, player: Player): AIDecision | null {
  const actions = listLegalActions(gameState, player.id);
  if (actions.length === 0) {
    return null;
  }

  const deadAction = actions.find((action) => action.type === 'dead');
  if (deadAction) {
    return {
      type: 'dead',
      cardId: deadAction.cardId,
    };
  }

  const difficulty = player.aiDifficulty ?? inferDifficultyFromName(player.name);
  const playActions = actions.filter((action) => action.type !== 'dead');
  if (playActions.length === 0) {
    return null;
  }

  if (difficulty === 'easy') {
    const chosen = playActions[0];
    return {
      type: 'play',
      cardId: chosen.cardId,
      spaceId: chosen.spaceId!,
    };
  }

  let bestAction = playActions[0];
  let bestScore = -Infinity;

  for (const action of playActions) {
    const score = evaluateAction(gameState, player, action.cardId, action.spaceId!, difficulty);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return {
    type: 'play',
    cardId: bestAction.cardId,
    spaceId: bestAction.spaceId!,
  };
}

function evaluateAction(
  gameState: GameState,
  player: Player,
  cardId: string,
  spaceId: string,
  difficulty: 'medium' | 'hard',
): number {
  const card = player.hand.find((entry) => entry.id === cardId);
  const originalSpace = getSpace(gameState.board, spaceId);
  if (!card || !originalSpace) {
    return -Infinity;
  }

  const previousMySequences = gameState.sequences.filter((sequence) => sequence.team === player.team).length;
  const actionResult = playCard(gameState, player.id, cardId, spaceId);
  if (!actionResult.ok) {
    return -Infinity;
  }

  const nextState = actionResult.state;
  const nextMySequences = nextState.sequences.filter((sequence) => sequence.team === player.team).length;
  const createdSequenceCount = nextMySequences - previousMySequences;

  let score = 0;

  // Immediate win condition
  if (nextState.winner === player.team) {
    score += 100000;
  }

  // Sequence creation reward
  score += createdSequenceCount * 2500;

  if (isOneEyedJack(card)) {
    score += evaluateRemoval(gameState, originalSpace, player.team, nextState);
  } else {
    const placedSpace = getSpace(nextState.board, spaceId);
    
    // Center control bonus
    const centerBonus = evaluateCenterControl(placedSpace, difficulty);
    score += centerBonus;
    
    // Placement evaluation
    score += evaluatePlacement(nextState.board, placedSpace, player.team);
    score += evaluateBlockPressure(gameState.board, originalSpace.row, originalSpace.col, player.team, difficulty);

    // Two-eyed jack preservation (don't waste on weak plays)
    if (isTwoEyedJack(card)) {
      // Only slightly penalize if placement score is good
      if (score < 500) {
        score -= 500; // Preserve jack for better use
      }
    }

    // Fork detection bonus for hard difficulty
    if (difficulty === 'hard') {
      const forkScore = evaluateForkPotential(nextState.board, placedSpace, player.team);
      score += forkScore;
    }
  }

  return score;
}

function evaluateRemoval(gameState: GameState, space: BoardSpace, myTeam: TeamColor, nextState: GameState): number {
  if (!space.chip) {
    return 0;
  }

  let score = 120;
  score += countLongestLine(gameState.board, space.row, space.col, space.chip) * 40;

  // Prioritize removing threats based on opponent's proximity to victory
  const targetTeamSequences = nextState.sequences.filter((sequence) => sequence.team === space.chip).length;
  const requiredSequences = nextState.requiredSequencesToWin;
  
  if (targetTeamSequences >= requiredSequences - 1) {
    // Opposing team is one move away from winning - HIGH PRIORITY
    score += 1000;
  } else if (targetTeamSequences > 0) {
    // Opposing team has sequences - moderate priority
    score += targetTeamSequences * 75;
  }

  return score;
}

function evaluateCenterControl(space: BoardSpace | undefined, difficulty: 'medium' | 'hard'): number {
  if (!space || space.isCorner) {
    return 0;
  }

  // Center 4x4 grid is premium real estate
  const isCentralArea = space.row >= 3 && space.row <= 6 && space.col >= 3 && space.col <= 6;
  if (isCentralArea) {
    return difficulty === 'hard' ? 150 : 75;
  }

  // Inner ring around center
  const isInnerRing = space.row >= 2 && space.row <= 7 && space.col >= 2 && space.col <= 7;
  if (isInnerRing) {
    return difficulty === 'hard' ? 50 : 25;
  }

  return 0;
}

function evaluateForkPotential(board: BoardSpace[][], space: BoardSpace | undefined, team: TeamColor): number {
  if (!space || space.isCorner) {
    return 0;
  }

  // Count how many different 5-chip lines could be completed from this position
  let forkCount = 0;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dr, dc] of directions) {
    const potentialLine = countPotentialLine(board, space.row, space.col, team);
    if (potentialLine >= 4) {
      forkCount++;
    }
  }

  // Having 2+ potential lines creates a fork (multiple winning threats)
  return forkCount >= 2 ? 200 : forkCount === 1 ? 50 : 0;
}

function evaluatePlacement(board: BoardSpace[][], space: BoardSpace | undefined, team: TeamColor): number {
  if (!space) {
    return 0;
  }

  let score = 0;
  score += countLongestLine(board, space.row, space.col, team) * 60;
  score += countPotentialLine(board, space.row, space.col, team) * 25;
  return score;
}

function evaluateBlockPressure(
  board: BoardSpace[][],
  row: number,
  col: number,
  myTeam: TeamColor,
  difficulty: 'medium' | 'hard',
): number {
  let score = 0;

  for (const team of ['red', 'blue', 'green'] as TeamColor[]) {
    if (team === myTeam) continue;

    const pressure = countPotentialLine(board, row, col, team);
    score += pressure * (difficulty === 'hard' ? 18 : 10);
  }

  return score;
}

function countLongestLine(board: BoardSpace[][], row: number, col: number, team: TeamColor): number {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  let best = 0;

  for (const [dr, dc] of directions) {
    let line = 1;

    for (let step = 1; step < 5; step += 1) {
      const nextRow = row + dr * step;
      const nextCol = col + dc * step;
      if (!isOnBoard(nextRow, nextCol)) break;

      const space = board[nextRow][nextCol];
      if (space.isCorner || space.chip === team) {
        line += 1;
      } else {
        break;
      }
    }

    for (let step = 1; step < 5; step += 1) {
      const nextRow = row - dr * step;
      const nextCol = col - dc * step;
      if (!isOnBoard(nextRow, nextCol)) break;

      const space = board[nextRow][nextCol];
      if (space.isCorner || space.chip === team) {
        line += 1;
      } else {
        break;
      }
    }

    best = Math.max(best, line);
  }

  return best;
}

function countPotentialLine(board: BoardSpace[][], row: number, col: number, team: TeamColor): number {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  let best = 0;

  for (const [dr, dc] of directions) {
    for (let offset = 0; offset < 5; offset += 1) {
      const startRow = row - dr * offset;
      const startCol = col - dc * offset;
      let valid = true;
      let count = 0;

      for (let step = 0; step < 5; step += 1) {
        const nextRow = startRow + dr * step;
        const nextCol = startCol + dc * step;
        if (!isOnBoard(nextRow, nextCol)) {
          valid = false;
          break;
        }

        const space = board[nextRow][nextCol];
        if (space.isCorner || space.chip === team) {
          count += 1;
          continue;
        }

        if (space.chip && space.chip !== team) {
          valid = false;
          break;
        }
      }

      if (valid) {
        best = Math.max(best, count);
      }
    }
  }

  return best;
}

function getSpace(board: BoardSpace[][], spaceId: string): BoardSpace | undefined {
  const [rowText, colText] = spaceId.split('-');
  const row = Number(rowText);
  const col = Number(colText);

  if (!isOnBoard(row, col)) {
    return undefined;
  }

  return board[row][col];
}

function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < 10 && col >= 0 && col < 10;
}

function inferDifficultyFromName(name: string): 'easy' | 'medium' | 'hard' {
  const lowered = name.toLowerCase();
  if (lowered.includes('hard')) return 'hard';
  if (lowered.includes('medium')) return 'medium';
  return 'easy';
}
