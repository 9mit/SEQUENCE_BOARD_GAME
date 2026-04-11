import assert from 'node:assert/strict';
import test from 'node:test';
import { CARD_TO_SPACE_IDS, parseCardCode } from '../constants.js';
import {
  addPlayerToRoom,
  createRoomState,
  declareDeadCard,
  drawCard,
  getValidTargetSpaces,
  isDeadCard,
  playCard,
  startGame,
} from '../gameLogic.js';
import { BoardSpace, Card, GameState, Player, TeamColor } from '../types.js';

function makeCard(code: string, id = code): Card {
  const parsed = parseCardCode(code);
  assert.ok(parsed, `Could not parse card code ${code}`);

  return {
    id,
    code,
    suit: parsed.suit,
    rank: parsed.rank,
    deckIndex: 0,
    order: 0,
  };
}

function createStartedGame(playerIds: string[]): GameState {
  assert.ok(playerIds.length >= 2);

  let state = createRoomState({
    roomId: 'ROOM01',
    host: { id: playerIds[0], name: playerIds[0], connected: true },
  });

  for (const playerId of playerIds.slice(1)) {
    const added = addPlayerToRoom(state, {
      id: playerId,
      name: playerId,
      connected: true,
    });
    assert.equal(added.ok, true, added.error);
    state = added.state;
  }

  const started = startGame(state);
  assert.equal(started.ok, true, started.error);
  return started.state;
}

function getPlayer(state: GameState, playerId: string): Player {
  const player = state.players.find((entry) => entry.id === playerId);
  assert.ok(player, `Missing player ${playerId}`);
  return player;
}

function getSpace(state: GameState, spaceId: string): BoardSpace {
  const [rowText, colText] = spaceId.split('-');
  const row = Number(rowText);
  const col = Number(colText);
  const space = state.board[row]?.[col];
  assert.ok(space, `Missing board space ${spaceId}`);
  return space;
}

function resetBoard(state: GameState): void {
  for (const space of state.board.flat()) {
    if (space.isCorner) {
      space.occupiedBy = null;
      space.chip = undefined;
      space.partOfSequence = false;
      space.sequenceIds = [];
      space.sequenceUseCount = 0;
      continue;
    }

    space.occupiedBy = null;
    space.chip = undefined;
    space.partOfSequence = false;
    space.sequenceIds = [];
    space.sequenceUseCount = 0;
  }

  state.sequences = [];
  state.winner = null;
  state.winningSequenceIds = [];
}

function setTurn(state: GameState, playerId: string): void {
  state.currentTurn = playerId;
  state.currentTurnIndex = state.players.findIndex((player) => player.id === playerId);
  state.pendingDrawPlayerId = null;
  state.deadCardUsedThisTurn = false;
  state.status = 'playing';
  state.turnNumber = 1;
}

function setHand(state: GameState, playerId: string, codes: string[]): void {
  const player = getPlayer(state, playerId);
  player.hand = codes.map((code, index) => makeCard(code, `${playerId}-${code}-${index}`));
  player.handLimit = codes.length;
}

function occupy(state: GameState, spaceId: string, playerId: string, team: TeamColor, partOfSequence = false): void {
  const space = getSpace(state, spaceId);
  space.occupiedBy = playerId;
  space.chip = team;
  space.partOfSequence = partOfSequence;
  space.sequenceIds = partOfSequence ? ['existing-seq'] : [];
  space.sequenceUseCount = partOfSequence ? 1 : 0;
}

test('dead cards can be exchanged once per turn and immediately replaced', () => {
  const state = createStartedGame(['p1', 'p2']);
  resetBoard(state);
  setTurn(state, 'p1');

  const deadCodes = Object.keys(CARD_TO_SPACE_IDS).slice(0, 2);
  for (const code of deadCodes) {
    for (const spaceId of CARD_TO_SPACE_IDS[code]) {
      occupy(state, spaceId, 'p2', 'blue');
    }
  }

  setHand(state, 'p1', deadCodes);
  state.drawDeck = [makeCard('QH', 'draw-qh')];

  const firstSwap = declareDeadCard(state, 'p1', getPlayer(state, 'p1').hand[0].id);
  assert.equal(firstSwap.ok, true, firstSwap.error);
  assert.equal(getPlayer(firstSwap.state, 'p1').hand.length, 2);
  assert.equal(firstSwap.state.deadCardUsedThisTurn, true);
  assert.equal(firstSwap.state.lastMove?.type, 'dead');

  const secondDeadCardId = getPlayer(firstSwap.state, 'p1').hand.find((card) => deadCodes.includes(card.code))?.id;
  assert.ok(secondDeadCardId);

  const secondSwap = declareDeadCard(firstSwap.state, 'p1', secondDeadCardId);
  assert.equal(secondSwap.ok, false);
  assert.match(secondSwap.error ?? '', /only exchange one dead card/i);
});

test('plays now automatically draw cards and move to next turn', () => {
  const state = createStartedGame(['p1', 'p2']);
  resetBoard(state);
  setTurn(state, 'p1');
  const initialHand = [...getPlayer(state, 'p1').hand];
  const initialCode = initialHand[0].code;
  const targetSpace = CARD_TO_SPACE_IDS[initialCode][0];

  const result = playCard(state, 'p1', initialHand[0].id, targetSpace);
  assert.equal(result.ok, true, result.error);
  assert.equal(result.state.pendingDrawPlayerId, null);
  assert.equal(result.state.currentTurn, 'p2');
  assert.equal(getPlayer(result.state, 'p1').hand.length, initialHand.length);
});

test('deck exhaustion shuffles all discard piles back into the draw deck', () => {
  const state = createStartedGame(['p1', 'p2']);
  resetBoard(state);
  setTurn(state, 'p1');
  setHand(state, 'p1', ['JH']);
  setHand(state, 'p2', ['JD']);
  state.drawDeck = [];
  state.discardPiles = {
    p1: [makeCard('2H', 'discard-1')],
    p2: [makeCard('3H', 'discard-2')],
  };
  state.discardPile = [...state.discardPiles.p1, ...state.discardPiles.p2];

  const played = playCard(state, 'p1', getPlayer(state, 'p1').hand[0].id, '4-4');
  assert.equal(played.ok, true, played.error);
  
  assert.equal(getPlayer(played.state, 'p1').hand.length, 1);
  assert.equal(played.state.discardPile.length, 0);
  assert.equal(played.state.drawDeck.length, 2);
  assert.ok(played.state.events.some((event) => event.type === 'DECK_RECYCLED'));
});

test('a single move can create two sequences while only reusing one shared chip', () => {
  const state = createStartedGame(['p1', 'p2']);
  resetBoard(state);
  setTurn(state, 'p1');
  setHand(state, 'p1', ['JH']);

  for (const col of [0, 1, 2, 3, 5, 6, 7, 8]) {
    occupy(state, `4-${col}`, 'p1', 'red');
  }

  const result = playCard(state, 'p1', getPlayer(state, 'p1').hand[0].id, '4-4');
  assert.equal(result.ok, true, result.error);
  assert.equal(result.state.sequences.length, 2);
  assert.equal(result.state.lastMove?.createdSequenceIds.length, 2);
  assert.equal(result.state.winner, 'red'); // 2 sequences win 2-team games
  assert.equal(getSpace(result.state, '4-4').sequenceUseCount, 2);

  for (const space of result.state.board.flat()) {
    assert.ok(space.sequenceUseCount <= 2);
  }
});

test('one-eyed jacks cannot remove chips that belong to completed sequences', () => {
  const state = createStartedGame(['p1', 'p2']);
  resetBoard(state);
  setTurn(state, 'p1');
  setHand(state, 'p1', ['JS']);

  occupy(state, '4-4', 'p2', 'blue', true);
  state.sequences = [
    {
      id: 'existing-seq',
      team: 'blue',
      spaces: ['4-0', '4-1', '4-2', '4-3', '4-4'],
      createdByPlayerId: 'p2',
      direction: 'horizontal',
      turnNumber: 0,
      usesCorner: false,
      isWinningSequence: false,
    },
  ];

  const result = playCard(state, 'p1', getPlayer(state, 'p1').hand[0].id, '4-4');
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /not legal/i);
});

test('three-team games require only 1 completed sequence to win', () => {
  const state = createStartedGame(['p1', 'p2', 'p3']);
  resetBoard(state);
  setTurn(state, 'p1');
  setHand(state, 'p1', ['JH']);

  for (const col of [2, 3, 4, 5]) {
    occupy(state, `2-${col}`, 'p1', 'red');
  }

  const result = playCard(state, 'p1', getPlayer(state, 'p1').hand[0].id, '2-6');
  assert.equal(result.ok, true, result.error);
  assert.equal(result.state.requiredSequencesToWin, 1, 'Three-team game should require 1 sequence');
  assert.equal(result.state.sequences.length, 1, 'One sequence should be created');
  assert.equal(result.state.winner, 'red', 'Red team should have won with 1 sequence in 3-team game');
});

test('two-team games require 2 completed sequences to win', () => {
  const state = createStartedGame(['p1', 'p2']);
  resetBoard(state);
  assert.equal(state.requiredSequencesToWin, 2, 'Two-team game should require 2 sequences');
});

test('full boards still allow one-eyed jack removals but block placements', () => {
  const state = createStartedGame(['p1', 'p2']);
  resetBoard(state);
  setTurn(state, 'p1');

  let flip = false;
  for (const space of state.board.flat()) {
    if (space.isCorner) continue;
    occupy(state, space.id, flip ? 'p1' : 'p2', flip ? 'red' : 'blue');
    flip = !flip;
  }

  const occupiedCardCode = getSpace(state, '1-1').card;
  assert.notEqual(occupiedCardCode, 'corner');

  setHand(state, 'p1', ['JH', 'JS', occupiedCardCode]);
  const twoEyedId = getPlayer(state, 'p1').hand.find((card) => card.code === 'JH')!.id;
  const oneEyedId = getPlayer(state, 'p1').hand.find((card) => card.code === 'JS')!.id;
  const regularCard = getPlayer(state, 'p1').hand.find((card) => card.code === occupiedCardCode)!;

  assert.deepEqual(getValidTargetSpaces(state, 'p1', twoEyedId), []);
  assert.ok(getValidTargetSpaces(state, 'p1', oneEyedId).length > 0);
  assert.equal(isDeadCard(state.board, regularCard), true);
});
