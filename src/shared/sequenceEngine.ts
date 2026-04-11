import {
  BOARD_SIZE,
  CARD_TO_SPACE_IDS,
  TEAM_COLORS,
  createDeck,
  createInitialBoard,
  createSeedFromString,
  getCardsPerPlayer,
  getRequiredSequencesToWin,
  getTeamCountForPlayers,
  getTeamForSeat,
  isOneEyedJack,
  isSupportedPlayerCount,
  isTwoEyedJack,
  shuffleWithState,
} from './constants.js';
import {
  BoardSpace,
  Card,
  DeadCardUsedEvent,
  DrawForfeitedEvent,
  EngineResult,
  GameEvent,
  GameState,
  MoveType,
  Player,
  SequenceDirection,
  SequenceLine,
  TeamColor,
  TurnEndedEvent,
} from './types.js';

const DIRECTION_DEFINITIONS: Array<{ direction: SequenceDirection; dr: number; dc: number }> = [
  { direction: 'horizontal', dr: 0, dc: 1 },
  { direction: 'vertical', dr: 1, dc: 0 },
  { direction: 'diagonal-down', dr: 1, dc: 1 },
  { direction: 'diagonal-up', dr: 1, dc: -1 },
];

type LobbyPlayerInput = Pick<Player, 'id' | 'name' | 'connected' | 'isAI' | 'aiDifficulty'>;

type CandidateSequence = {
  direction: SequenceDirection;
  spaces: string[];
  key: string;
  usesCorner: boolean;
  nonCornerSpaces: string[];
  existingOverlapCount: number;
};

export interface LegalAction {
  type: MoveType;
  cardId: string;
  spaceId?: string;
}

export interface TableTalkDiscard {
  playerId: string;
  cardId: string;
}

export function createPlayer(input: LobbyPlayerInput): Player {
  return {
    id: input.id,
    name: input.name,
    team: 'red',
    hand: [],
    handLimit: 0,
    missedDraws: 0,
    isAI: input.isAI,
    aiDifficulty: input.aiDifficulty,
    connected: input.connected,
    seatIndex: 0,
  };
}

export function createRoomState(params: { roomId: string; host: LobbyPlayerInput; seed?: number }): GameState {
  const player = createPlayer(params.host);
  return normalizeLobbyState({
    roomId: params.roomId,
    status: 'waiting',
    players: [player],
    teams: ['red'],
    currentTurn: null,
    currentTurnIndex: 0,
    turnNumber: 1,
    board: createInitialBoard(),
    drawDeck: [],
    discardPiles: { [player.id]: [] },
    discardPile: [],
    sequences: [],
    winner: null,
    winningSequenceIds: [],
    requiredSequencesToWin: getRequiredSequencesToWin(1), // Default for room creation
    pendingDrawPlayerId: null,
    deadCardUsedThisTurn: false,
    seed: params.seed ?? createSeedFromString(params.roomId),
    randomState: params.seed ?? createSeedFromString(params.roomId),
    lastMove: null,
    chat: [],
    events: [],
  });
}

export function addPlayerToRoom(state: GameState, input: LobbyPlayerInput): EngineResult {
  if (state.status !== 'waiting') {
    return failure(state, 'Cannot add players after the game has started.');
  }

  if (state.players.length >= 12) {
    return failure(state, 'The table is already full.');
  }

  if (state.players.some((player) => player.id === input.id)) {
    return failure(state, 'Player is already seated in this room.');
  }

  const nextState = cloneState(state);
  nextState.players.push(createPlayer(input));
  nextState.discardPiles[input.id] = [];

  return success(normalizeLobbyState(nextState), []);
}

export function reconnectPlayer(state: GameState, playerId: string, connected: boolean): EngineResult {
  const nextState = cloneState(state);
  const player = nextState.players.find((entry) => entry.id === playerId);

  if (!player) {
    return failure(state, 'Player not found.');
  }

  player.connected = connected;
  return success(syncDerivedState(nextState), []);
}

export function rebindDisconnectedPlayer(state: GameState, playerName: string, newPlayerId: string): EngineResult {
  const match = state.players.find(
    (player) => !player.connected && player.name.trim().toLowerCase() === playerName.trim().toLowerCase(),
  );

  if (!match) {
    return failure(state, 'No disconnected player matches that name.');
  }

  if (state.players.some((player) => player.id === newPlayerId)) {
    return failure(state, 'That player id is already in use.');
  }

  const nextState = cloneState(state);
  replacePlayerId(nextState, match.id, newPlayerId);

  const player = nextState.players.find((entry) => entry.id === newPlayerId);
  if (player) {
    player.connected = true;
  }

  return success(syncDerivedState(nextState), []);
}

export function startGame(state: GameState): EngineResult {
  if (state.status !== 'waiting') {
    return failure(state, 'The game has already started.');
  }

  if (!isSupportedPlayerCount(state.players.length)) {
    return failure(state, 'Sequence only supports 2, 3, 4, 6, 8, 9, 10, or 12 players.');
  }

  const nextState = cloneState(state);
  const cardsPerPlayer = getCardsPerPlayer(nextState.players.length);
  const teamCount = getTeamCountForPlayers(nextState.players.length);
  const dealtPlayers = rebalancePlayers(nextState.players, teamCount).map((player) => ({
    ...player,
    hand: [],
    handLimit: cardsPerPlayer,
    missedDraws: 0,
  }));

  const deckResult = createDeck(nextState.seed);
  const drawDeck = deckResult.deck;

  for (let round = 0; round < cardsPerPlayer; round += 1) {
    for (const player of dealtPlayers) {
      const nextCard = drawDeck.shift();
      if (nextCard) {
        player.hand.push(nextCard);
      }
    }
  }

  nextState.status = 'playing';
  nextState.players = dealtPlayers;
  nextState.teams = TEAM_COLORS.slice(0, teamCount);
  nextState.currentTurn = dealtPlayers[0]?.id ?? null;
  nextState.currentTurnIndex = dealtPlayers.length > 0 ? 0 : -1;
  nextState.turnNumber = 1;
  nextState.board = createInitialBoard();
  nextState.drawDeck = drawDeck;
  nextState.discardPiles = Object.fromEntries(dealtPlayers.map((player) => [player.id, []]));
  nextState.discardPile = [];
  nextState.sequences = [];
  nextState.winner = null;
  nextState.winningSequenceIds = [];
  nextState.requiredSequencesToWin = getRequiredSequencesToWin(teamCount);
  nextState.pendingDrawPlayerId = null;
  nextState.deadCardUsedThisTurn = false;
  nextState.randomState = deckResult.randomState;
  nextState.lastMove = null;
  nextState.events = [];

  return success(syncDerivedState(nextState), []);
}

export function getValidTargetSpaces(state: GameState, playerId: string, cardId: string): string[] {
  if (state.status !== 'playing' || state.currentTurn !== playerId) {
    return [];
  }

  const player = state.players.find((entry) => entry.id === playerId);
  const card = player?.hand.find((entry) => entry.id === cardId);

  if (!player || !card) {
    return [];
  }

  if (isTwoEyedJack(card)) {
    return state.board.flat().filter((space) => !space.isCorner && !space.occupiedBy).map((space) => space.id);
  }

  if (isOneEyedJack(card)) {
    return state.board
      .flat()
      .filter((space) => Boolean(space.occupiedBy) && space.chip !== player.team && !space.partOfSequence)
      .map((space) => space.id);
  }

  return (CARD_TO_SPACE_IDS[card.code] ?? []).filter((spaceId) => {
    const space = getSpace(state.board, spaceId);
    return Boolean(space && !space.occupiedBy);
  });
}

export function listLegalActions(state: GameState, playerId: string): LegalAction[] {
  if (state.status !== 'playing' || state.currentTurn !== playerId) {
    return [];
  }

  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    return [];
  }

  const actions: LegalAction[] = [];

  for (const card of player.hand) {
    if (!state.deadCardUsedThisTurn && isDeadCard(state.board, card)) {
      actions.push({ type: 'dead', cardId: card.id });
    }

    for (const spaceId of getValidTargetSpaces(state, playerId, card.id)) {
      actions.push({
        type: isOneEyedJack(card) ? 'remove' : 'place',
        cardId: card.id,
        spaceId,
      });
    }
  }

  return actions;
}

export function isValidMove(gameState: GameState, player: Player, card: Card, space: BoardSpace): boolean {
  if (gameState.status !== 'playing') return false;
  if (gameState.currentTurn !== player.id) return false;
  if (!player.hand.some((entry) => entry.id === card.id)) return false;
  if (space.isCorner) return false;

  if (isTwoEyedJack(card)) {
    return !space.occupiedBy;
  }

  if (isOneEyedJack(card)) {
    return Boolean(space.occupiedBy) && space.chip !== player.team && !space.partOfSequence;
  }

  return !space.occupiedBy && space.rank === card.rank && space.suit === card.suit;
}

export function isPartOfSequence(_gameState: GameState, space: BoardSpace): boolean {
  return space.partOfSequence;
}

export function isDeadCard(board: BoardSpace[][], card: Card): boolean {
  if (isOneEyedJack(card) || isTwoEyedJack(card)) {
    return false;
  }

  const matchingSpaces = CARD_TO_SPACE_IDS[card.code] ?? [];
  return matchingSpaces.length > 0 && matchingSpaces.every((spaceId) => Boolean(getSpace(board, spaceId)?.occupiedBy));
}

export function checkSequences(board: BoardSpace[][], team: TeamColor): string[][] {
  const windows: string[][] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      for (const { dr, dc } of DIRECTION_DEFINITIONS) {
        const spaces: string[] = [];
        let valid = true;

        for (let step = 0; step < 5; step += 1) {
          const nextRow = row + dr * step;
          const nextCol = col + dc * step;
          if (!isOnBoard(nextRow, nextCol)) {
            valid = false;
            break;
          }

          const space = board[nextRow][nextCol];
          if (!space.isCorner && space.chip !== team) {
            valid = false;
            break;
          }

          spaces.push(space.id);
        }

        if (valid) {
          windows.push(spaces);
        }
      }
    }
  }

  return dedupeWindows(windows);
}

export function getWinner(gameState: GameState, preferredTeam?: TeamColor): TeamColor | null {
  const qualifyingTeams = gameState.teams.filter(
    (team) => gameState.sequences.filter((sequence) => sequence.team === team).length >= gameState.requiredSequencesToWin,
  );

  if (qualifyingTeams.length === 0) {
    return null;
  }

  if (preferredTeam && qualifyingTeams.includes(preferredTeam)) {
    return preferredTeam;
  }

  return [...qualifyingTeams].sort()[0] ?? null;
}

export function declareDeadCard(state: GameState, playerId: string, cardId: string): EngineResult {
  if (state.status !== 'playing') {
    return failure(state, 'The game is not active.');
  }

  if (state.currentTurn !== playerId) {
    return failure(state, 'It is not your turn.');
  }

  const nextState = cloneState(state);
  const player = nextState.players.find((entry) => entry.id === playerId);

  if (!player) {
    return failure(state, 'Player not found.');
  }

  if (nextState.deadCardUsedThisTurn) {
    return failure(state, 'You may only exchange one dead card per turn.');
  }

  const forfeitedEvents: GameEvent[] = [];
  forfeitPendingDrawIfNeeded(nextState, playerId, forfeitedEvents);

  const cardIndex = player.hand.findIndex((entry) => entry.id === cardId);
  if (cardIndex === -1) {
    return failure(state, 'That card is not in your hand.');
  }

  const card = player.hand[cardIndex];
  if (!isDeadCard(nextState.board, card)) {
    return failure(state, 'That card is not dead.');
  }

  player.hand.splice(cardIndex, 1);
  pushDiscard(nextState, playerId, card);

  nextState.deadCardUsedThisTurn = true;

  const events = [...forfeitedEvents];
  const replacement = drawCardIntoHand(nextState, playerId, events);

  appendEvent<DeadCardUsedEvent>(nextState, events, {
    type: 'DEAD_CARD_USED',
    playerId,
    cardId: card.id,
    cardCode: card.code,
    replacementCardId: replacement?.id,
    replacementCardCode: replacement?.code,
  });

  nextState.lastMove = {
    playerId,
    cardId: card.id,
    cardCode: card.code,
    type: 'dead',
    createdSequenceIds: [],
    forfeitedDrawPlayerId: forfeitedEvents.find((event) => event.type === 'DRAW_FORFEITED')?.playerId ?? null,
  };

  return success(syncDerivedState(nextState), events);
}

export function playCard(state: GameState, playerId: string, cardId: string, spaceId: string): EngineResult {
  if (state.status !== 'playing') {
    return failure(state, 'The game is not active.');
  }

  if (state.currentTurn !== playerId) {
    return failure(state, 'It is not your turn.');
  }

  const nextState = cloneState(state);
  const player = nextState.players.find((entry) => entry.id === playerId);

  if (!player) {
    return failure(state, 'Player not found.');
  }

  const forfeitedEvents: GameEvent[] = [];
  forfeitPendingDrawIfNeeded(nextState, playerId, forfeitedEvents);

  const cardIndex = player.hand.findIndex((entry) => entry.id === cardId);
  if (cardIndex === -1) {
    return failure(state, 'That card is not in your hand.');
  }

  const card = player.hand[cardIndex];
  const space = getSpace(nextState.board, spaceId);
  if (!space) {
    return failure(state, 'That board space does not exist.');
  }

  if (!isValidMove(nextState, player, card, space)) {
    return failure(state, 'That move is not legal.');
  }

  player.hand.splice(cardIndex, 1);
  pushDiscard(nextState, playerId, card);

  const events = [...forfeitedEvents];
  let moveType: MoveType = 'place';

  appendEvent(nextState, events, {
    type: 'CARD_PLAYED',
    playerId,
    cardId: card.id,
    cardCode: card.code,
    moveType: isOneEyedJack(card) ? 'remove' : 'place',
    spaceId,
  });

  if (isOneEyedJack(card)) {
    moveType = 'remove';
    const removedPlayerId = space.occupiedBy!;
    const removedTeam = space.chip as TeamColor;

    space.occupiedBy = null;
    space.chip = undefined;
    space.partOfSequence = false;
    space.sequenceIds = [];
    space.sequenceUseCount = 0;

    appendEvent(nextState, events, {
      type: 'CHIP_REMOVED',
      playerId,
      spaceId,
      removedPlayerId,
      removedTeam,
    });
  } else {
    space.occupiedBy = playerId;
    space.chip = player.team;

    appendEvent(nextState, events, {
      type: 'CHIP_PLACED',
      playerId,
      team: player.team,
      spaceId,
    });
  }

  const newSequenceIds = moveType === 'place' ? createSequencesFromMove(nextState, player, spaceId, events) : [];
  const winner = moveType === 'place' ? getWinner(nextState, player.team) : getWinner(nextState);

  if (winner) {
    nextState.status = 'finished';
    nextState.winner = winner;
    nextState.winningSequenceIds = nextState.sequences.filter((sequence) => sequence.team === winner).map((sequence) => sequence.id);
    nextState.currentTurn = null;
    nextState.currentTurnIndex = -1;
    nextState.pendingDrawPlayerId = null;
    markWinningSequences(nextState, winner);

    appendEvent(nextState, events, {
      type: 'GAME_WON',
      team: winner,
      sequenceIds: [...nextState.winningSequenceIds],
    });
  } else {
    // Automatic drawing implementation ("each card is incremented after playing")
    drawCardIntoHand(nextState, playerId, events);

    nextState.pendingDrawPlayerId = null;
    nextState.deadCardUsedThisTurn = false;
    nextState.turnNumber += 1;
    nextState.currentTurn = getNextActivePlayerId(nextState, playerId);
    nextState.currentTurnIndex = getPlayerIndex(nextState.players, nextState.currentTurn);

    if (!nextState.currentTurn && isLockedBoard(nextState)) {
      nextState.status = 'finished';
    }

    appendEvent<TurnEndedEvent>(nextState, events, {
      type: 'TURN_ENDED',
      playerId,
      nextPlayerId: nextState.currentTurn,
      pendingDrawPlayerId: null,
    });
  }

  nextState.lastMove = {
    playerId,
    cardId: card.id,
    cardCode: card.code,
    spaceId,
    type: moveType,
    createdSequenceIds: newSequenceIds,
    forfeitedDrawPlayerId: forfeitedEvents.find((event) => event.type === 'DRAW_FORFEITED')?.playerId ?? null,
  };

  if (!nextState.winner && !nextState.pendingDrawPlayerId && nextState.players.every((entry) => entry.hand.length === 0)) {
    nextState.status = 'finished';
    nextState.currentTurn = null;
    nextState.currentTurnIndex = -1;
  }

  return success(syncDerivedState(nextState), events);
}

export function drawCard(state: GameState, playerId: string): EngineResult {
  if (state.status !== 'playing') {
    return failure(state, 'The game is not active.');
  }

  if (state.pendingDrawPlayerId !== playerId) {
    return failure(state, 'You do not have a pending draw.');
  }

  const nextState = cloneState(state);
  const player = nextState.players.find((entry) => entry.id === playerId);
  if (!player) {
    return failure(state, 'Player not found.');
  }

  const events: GameEvent[] = [];
  drawCardIntoHand(nextState, playerId, events);
  nextState.pendingDrawPlayerId = null;

  if (nextState.status === 'playing' && !nextState.currentTurn) {
    nextState.currentTurn = getNextActivePlayerId(nextState, playerId) ?? (player.hand.length > 0 ? playerId : null);
    nextState.currentTurnIndex = getPlayerIndex(nextState.players, nextState.currentTurn);
  }

  if (!nextState.currentTurn && nextState.players.every((entry) => entry.hand.length === 0)) {
    nextState.status = 'finished';
  }

  return success(syncDerivedState(nextState), events);
}

export function applyTableTalkPenalty(state: GameState, team: TeamColor, discards: TableTalkDiscard[]): EngineResult {
  const nextState = cloneState(state);
  const teamPlayers = nextState.players.filter((player) => player.team === team && player.hand.length > 0);

  if (teamPlayers.length === 0) {
    return failure(state, 'That team has no cards to discard.');
  }

  if (discards.length !== teamPlayers.length) {
    return failure(state, 'Each player on the penalized team must discard exactly one card.');
  }

  const events: GameEvent[] = [];

  for (const player of teamPlayers) {
    const discard = discards.find((entry) => entry.playerId === player.id);
    if (!discard) {
      return failure(state, 'Missing a discard selection for one or more penalized players.');
    }

    const cardIndex = player.hand.findIndex((card) => card.id === discard.cardId);
    if (cardIndex === -1) {
      return failure(state, 'A selected penalty card is not in that player hand.');
    }

    const [card] = player.hand.splice(cardIndex, 1);
    pushDiscard(nextState, player.id, card);
  }

  appendEvent(nextState, events, {
    type: 'TABLE_TALK_LOGGED',
    team,
    penalizedPlayerIds: teamPlayers.map((player) => player.id),
  });

  if (!nextState.winner && nextState.players.every((player) => player.hand.length === 0) && !nextState.pendingDrawPlayerId) {
    nextState.status = 'finished';
    nextState.currentTurn = null;
    nextState.currentTurnIndex = -1;
  }

  return success(syncDerivedState(nextState), events);
}

function createSequencesFromMove(state: GameState, player: Player, placedSpaceId: string, events: GameEvent[]): string[] {
  const selectedCandidates = selectCandidateSequences(state, player.team, placedSpaceId);
  const createdSequenceIds: string[] = [];

  for (const candidate of selectedCandidates) {
    const sequenceId = `seq-${state.turnNumber}-${state.sequences.length + 1}`;
    const sequence: SequenceLine = {
      id: sequenceId,
      team: player.team,
      spaces: candidate.spaces,
      createdByPlayerId: player.id,
      direction: candidate.direction,
      turnNumber: state.turnNumber,
      usesCorner: candidate.usesCorner,
      isWinningSequence: false,
    };

    state.sequences.push(sequence);
    createdSequenceIds.push(sequenceId);

    for (const sequenceSpaceId of candidate.nonCornerSpaces) {
      const boardSpace = getSpace(state.board, sequenceSpaceId);
      if (!boardSpace) continue;

      boardSpace.partOfSequence = true;
      boardSpace.sequenceIds.push(sequenceId);
      boardSpace.sequenceUseCount += 1;
    }

    appendEvent(state, events, {
      type: 'SEQUENCE_CREATED',
      playerId: player.id,
      team: player.team,
      sequenceId,
      spaces: [...candidate.spaces],
    });
  }

  return createdSequenceIds;
}

function selectCandidateSequences(state: GameState, team: TeamColor, placedSpaceId: string): CandidateSequence[] {
  const placedSpace = getSpace(state.board, placedSpaceId);
  if (!placedSpace) {
    return [];
  }

  const candidates = buildCandidateSequences(state, team, placedSpace)
    .filter((candidate) => candidate.existingOverlapCount <= 1)
    .sort((left, right) => left.key.localeCompare(right.key));

  let best: CandidateSequence[] = [];

  const backtrack = (index: number, chosen: CandidateSequence[], useCounts: Map<string, number>) => {
    if (index >= candidates.length) {
      if (isBetterSelection(chosen, best)) {
        best = [...chosen];
      }
      return;
    }

    backtrack(index + 1, chosen, useCounts);

    const candidate = candidates[index];
    if (!canSelectCandidate(state, candidate, chosen, useCounts)) {
      return;
    }

    const nextUseCounts = new Map(useCounts);
    for (const sequenceSpaceId of candidate.nonCornerSpaces) {
      nextUseCounts.set(sequenceSpaceId, (nextUseCounts.get(sequenceSpaceId) ?? 0) + 1);
    }

    chosen.push(candidate);
    backtrack(index + 1, chosen, nextUseCounts);
    chosen.pop();
  };

  backtrack(0, [], new Map<string, number>());
  return best;
}

function canSelectCandidate(
  state: GameState,
  candidate: CandidateSequence,
  chosen: CandidateSequence[],
  useCounts: Map<string, number>,
): boolean {
  for (const selected of chosen) {
    if (sharedNonCornerCount(candidate, selected) > 1) {
      return false;
    }
  }

  for (const sequenceSpaceId of candidate.nonCornerSpaces) {
    const boardSpace = getSpace(state.board, sequenceSpaceId);
    const currentUses = boardSpace?.sequenceUseCount ?? 0;
    const pendingUses = useCounts.get(sequenceSpaceId) ?? 0;

    if (currentUses + pendingUses + 1 > 2) {
      return false;
    }
  }

  return true;
}

function buildCandidateSequences(state: GameState, team: TeamColor, placedSpace: BoardSpace): CandidateSequence[] {
  const candidates = new Map<string, CandidateSequence>();

  for (const { direction, dr, dc } of DIRECTION_DEFINITIONS) {
    for (let offset = 0; offset < 5; offset += 1) {
      const startRow = placedSpace.row - dr * offset;
      const startCol = placedSpace.col - dc * offset;
      const spaces: string[] = [];
      const nonCornerSpaces: string[] = [];
      let valid = true;
      let usesCorner = false;
      let existingOverlapCount = 0;

      for (let step = 0; step < 5; step += 1) {
        const row = startRow + dr * step;
        const col = startCol + dc * step;
        if (!isOnBoard(row, col)) {
          valid = false;
          break;
        }

        const space = state.board[row][col];
        if (!space.isCorner && space.chip !== team) {
          valid = false;
          break;
        }

        spaces.push(space.id);
        if (space.isCorner) {
          usesCorner = true;
        } else {
          nonCornerSpaces.push(space.id);
          if (space.partOfSequence) {
            existingOverlapCount += 1;
          }
        }
      }

      if (!valid) {
        continue;
      }

      const key = `${direction}:${spaces.join('|')}`;
      candidates.set(key, {
        direction,
        spaces,
        key,
        usesCorner,
        nonCornerSpaces,
        existingOverlapCount,
      });
    }
  }

  return [...candidates.values()];
}

function drawCardIntoHand(state: GameState, playerId: string, events: GameEvent[]): Card | null {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    return null;
  }

  const recycled = recycleDeckIfNeeded(state, events);
  const nextCard = state.drawDeck.shift() ?? null;

  if (!nextCard) {
    appendEvent(state, events, {
      type: 'CARD_DRAWN',
      playerId,
      deckRecycled: recycled,
    });
    return null;
  }

  player.hand.push(nextCard);

  appendEvent(state, events, {
    type: 'CARD_DRAWN',
    playerId,
    cardId: nextCard.id,
    cardCode: nextCard.code,
    deckRecycled: recycled,
  });

  return nextCard;
}

function recycleDeckIfNeeded(state: GameState, events: GameEvent[]): boolean {
  if (state.drawDeck.length > 0) {
    return false;
  }

  const discarded = state.players.flatMap((player) => state.discardPiles[player.id] ?? []);
  if (discarded.length === 0) {
    return false;
  }

  const shuffled = shuffleWithState(discarded, state.randomState);
  state.drawDeck = shuffled.items;
  state.randomState = shuffled.randomState;
  state.discardPiles = Object.fromEntries(state.players.map((player) => [player.id, []]));
  state.discardPile = [];

  appendEvent(state, events, {
    type: 'DECK_RECYCLED',
    count: discarded.length,
  });

  return true;
}

function forfeitPendingDrawIfNeeded(state: GameState, actingPlayerId: string, events: GameEvent[]): void {
  if (!state.pendingDrawPlayerId || state.pendingDrawPlayerId === actingPlayerId) {
    return;
  }

  const player = state.players.find((entry) => entry.id === state.pendingDrawPlayerId);
  if (!player) {
    state.pendingDrawPlayerId = null;
    return;
  }

  player.handLimit = Math.max(0, player.handLimit - 1);
  player.missedDraws += 1;

  appendEvent<DrawForfeitedEvent>(state, events, {
    type: 'DRAW_FORFEITED',
    playerId: player.id,
    newHandLimit: player.handLimit,
  });

  state.pendingDrawPlayerId = null;
}

function pushDiscard(state: GameState, playerId: string, card: Card): void {
  if (!state.discardPiles[playerId]) {
    state.discardPiles[playerId] = [];
  }

  state.discardPiles[playerId].push(card);
  state.discardPile = state.players.flatMap((player) => state.discardPiles[player.id] ?? []);
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function normalizeLobbyState(state: GameState): GameState {
  const teamCount = Math.max(1, Math.min(getTeamCountForPlayers(state.players.length), 3));
  state.players = rebalancePlayers(state.players, teamCount);
  state.teams = TEAM_COLORS.slice(0, teamCount);
  state.requiredSequencesToWin = getRequiredSequencesToWin(teamCount || 2);
  state.discardPiles = Object.fromEntries(state.players.map((player) => [player.id, state.discardPiles[player.id] ?? []]));
  state.discardPile = state.players.flatMap((player) => state.discardPiles[player.id] ?? []);
  state.currentTurn = null;
  state.currentTurnIndex = 0;
  return state;
}

function syncDerivedState(state: GameState): GameState {
  state.discardPiles = Object.fromEntries(state.players.map((player) => [player.id, state.discardPiles[player.id] ?? []]));
  state.discardPile = state.players.flatMap((player) => state.discardPiles[player.id] ?? []);
  state.currentTurnIndex = getPlayerIndex(state.players, state.currentTurn);
  return state;
}

function rebalancePlayers(players: Player[], teamCount: number): Player[] {
  return players.map((player, seatIndex) => ({
    ...player,
    seatIndex,
    team: getTeamForSeat(seatIndex, Math.max(1, teamCount)),
  }));
}

function replacePlayerId(state: GameState, previousId: string, nextId: string): void {
  const player = state.players.find((entry) => entry.id === previousId);
  if (player) {
    player.id = nextId;
  }

  if (state.currentTurn === previousId) {
    state.currentTurn = nextId;
  }

  if (state.pendingDrawPlayerId === previousId) {
    state.pendingDrawPlayerId = nextId;
  }

  if (state.lastMove?.playerId === previousId) {
    state.lastMove.playerId = nextId;
  }

  for (const sequence of state.sequences) {
    if (sequence.createdByPlayerId === previousId) {
      sequence.createdByPlayerId = nextId;
    }
  }

  for (const message of state.chat) {
    if (message.senderId === previousId) {
      message.senderId = nextId;
    }
  }

  for (const space of state.board.flat()) {
    if (space.occupiedBy === previousId) {
      space.occupiedBy = nextId;
    }
  }

  if (state.discardPiles[previousId]) {
    state.discardPiles[nextId] = state.discardPiles[previousId];
    delete state.discardPiles[previousId];
  }

  state.events = state.events.map((event) => {
    const copy = { ...event } as GameEvent & { playerId?: string; removedPlayerId?: string };
    if ('playerId' in copy && copy.playerId === previousId) {
      copy.playerId = nextId;
    }
    if ('removedPlayerId' in copy && copy.removedPlayerId === previousId) {
      copy.removedPlayerId = nextId;
    }
    return copy;
  });
}

function appendEvent<T extends GameEvent>(
  state: GameState,
  events: GameEvent[],
  event: Record<string, unknown> & { type: T['type'] },
): T {
  const index = state.events.length + events.length + 1;
  const completeEvent = {
    ...event,
    id: `evt-${state.turnNumber}-${index}`,
    timestamp: state.turnNumber * 1000 + index,
    turnNumber: state.turnNumber,
  } as T;

  events.push(completeEvent);
  return completeEvent;
}

function success(state: GameState, events: GameEvent[]): EngineResult {
  state.events.push(...events);
  return {
    ok: true,
    state,
    events,
  };
}

function failure(state: GameState, error: string): EngineResult {
  return {
    ok: false,
    state,
    events: [],
    error,
  };
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

function getPlayerIndex(players: Player[], playerId: string | null): number {
  if (!playerId) {
    return -1;
  }

  return players.findIndex((player) => player.id === playerId);
}

function getNextActivePlayerId(state: GameState, afterPlayerId: string): string | null {
  if (state.players.length === 0) {
    return null;
  }

  const startingIndex = getPlayerIndex(state.players, afterPlayerId);
  if (startingIndex === -1) {
    return state.players.find((player) => player.hand.length > 0)?.id ?? null;
  }

  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(startingIndex + offset) % state.players.length];
    if (player.hand.length > 0) {
      return player.id;
    }
  }

  return null;
}

function isLockedBoard(state: GameState): boolean {
  for (const space of state.board.flat()) {
    if (space.isCorner) {
      continue;
    }

    if (!space.occupiedBy) {
      return false;
    }

    if (!space.partOfSequence) {
      return false;
    }
  }

  return true;
}

function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function sharedNonCornerCount(left: CandidateSequence, right: CandidateSequence): number {
  const rightSpaces = new Set(right.nonCornerSpaces);
  return left.nonCornerSpaces.filter((spaceId) => rightSpaces.has(spaceId)).length;
}

function isBetterSelection(candidate: CandidateSequence[], currentBest: CandidateSequence[]): boolean {
  if (candidate.length !== currentBest.length) {
    return candidate.length > currentBest.length;
  }

  const candidateKey = candidate.map((entry) => entry.key).join('~');
  const bestKey = currentBest.map((entry) => entry.key).join('~');
  return candidateKey < bestKey;
}

function dedupeWindows(windows: string[][]): string[][] {
  const seen = new Set<string>();
  const deduped: string[][] = [];

  for (const window of windows) {
    const key = window.join('|');
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(window);
  }

  return deduped;
}

function markWinningSequences(state: GameState, winner: TeamColor): void {
  const winningIds = new Set(state.winningSequenceIds);
  state.sequences = state.sequences.map((sequence) => ({
    ...sequence,
    isWinningSequence: sequence.team === winner && winningIds.has(sequence.id),
  }));
}
