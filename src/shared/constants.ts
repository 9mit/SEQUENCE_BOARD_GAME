import { BoardSpace, Card, Rank, Suit, TeamColor } from './types.js';

export const BOARD_SIZE = 10;
export const SUPPORTED_PLAYER_COUNTS = [2, 3, 4, 6, 8, 9, 10, 12] as const;
export const TEAM_COLORS: TeamColor[] = ['red', 'blue', 'green'];
export const BOARD_SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
export const BOARD_RANKS: Exclude<Rank, 'J'>[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Q', 'K', 'A'];
export const FULL_DECK_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const CORNER_IDS = new Set(['0-0', '0-9', '9-0', '9-9']);

const SUIT_TO_CODE: Record<Suit, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
};

const CODE_TO_SUIT: Record<string, Suit> = {
  H: 'hearts',
  D: 'diamonds',
  C: 'clubs',
  S: 'spades',
};

export function cardToCode(rank: Rank | Exclude<Rank, 'J'>, suit: Suit): string {
  return `${rank}${SUIT_TO_CODE[suit]}`;
}

export function parseCardCode(code: string): { rank: Rank; suit: Suit } | null {
  const match = /^(10|[2-9JQKA])([HDCS])$/.exec(code);
  if (!match) return null;

  return {
    rank: match[1] as Rank,
    suit: CODE_TO_SUIT[match[2]],
  };
}

export function createSeedFromString(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = Math.abs(hash % 2147483646) + 1;
  return normalized;
}

export function nextRandomState(state: number): number {
  const normalized = normalizeSeed(state);
  return (normalized * 48271) % 2147483647;
}

export function randomUnit(state: number): { value: number; state: number } {
  const nextState = nextRandomState(state);
  return {
    value: nextState / 2147483647,
    state: nextState,
  };
}

export function shuffleWithState<T>(items: T[], startingState: number): { items: T[]; randomState: number } {
  const copy = [...items];
  let randomState = normalizeSeed(startingState);

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const roll = randomUnit(randomState);
    randomState = roll.state;
    const swapIndex = Math.floor(roll.value * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return { items: copy, randomState };
}

export function normalizeSeed(seed: number): number {
  const normalized = Math.abs(Math.trunc(seed)) % 2147483647;
  return normalized === 0 ? 1 : normalized;
}

export function isSupportedPlayerCount(playerCount: number): playerCount is (typeof SUPPORTED_PLAYER_COUNTS)[number] {
  return SUPPORTED_PLAYER_COUNTS.includes(playerCount as (typeof SUPPORTED_PLAYER_COUNTS)[number]);
}

export function getTeamCountForPlayers(playerCount: number): number {
  if (playerCount <= 0) return 0;
  if (playerCount === 1) return 1;
  if (playerCount === 2) return 2;
  if (playerCount === 3) return 3;
  return playerCount % 3 === 0 ? 3 : 2;
}

export function getRequiredSequencesToWin(teamCount: number): number {
  // Per official Sequence rules from game specification:
  // Two-Faction Dynamics: 2 sequences required to win
  // Three-Faction Dynamics: 1 sequence required to win (board is more crowded)
  if (teamCount === 2) return 2;
  if (teamCount === 3) return 1;
  // Fallback for unexpected team counts
  return teamCount === 3 ? 1 : 2;
}

export function getCardsPerPlayer(playerCount: number): number {
  if (playerCount === 2) return 7;
  if (playerCount >= 3 && playerCount <= 4) return 6;
  if (playerCount === 6) return 5;
  if (playerCount >= 8 && playerCount <= 9) return 4;
  if (playerCount >= 10 && playerCount <= 12) return 3;
  throw new Error(`Unsupported player count: ${playerCount}`);
}

export function getTeamForSeat(seatIndex: number, teamCount: number): TeamColor {
  return TEAM_COLORS[seatIndex % teamCount];
}

export function isTwoEyedJack(card: Pick<Card, 'rank' | 'suit'>): boolean {
  return card.rank === 'J' && (card.suit === 'hearts' || card.suit === 'diamonds');
}

export function isOneEyedJack(card: Pick<Card, 'rank' | 'suit'>): boolean {
  return card.rank === 'J' && (card.suit === 'spades' || card.suit === 'clubs');
}

/**
 * Official Sequence Board Layout
 * - 10x10 grid with 4 corner wild spaces
 * - Each non-corner card appears exactly twice (verified)
 * - No Jacks on board (in deck instead)
 * - Balanced for strategic gameplay
 */
export const BOARD_LAYOUT: string[][] = [
  ['corner', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', 'corner'],
  ['2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', '10S', 'QC'],
  ['3D', '2H', '10H', 'QH', 'KH', 'AH', '2D', '3D', '10C', 'KC'],
  ['4D', '3H', '9H', '8H', '7H', '6H', '5H', '4H', '8C', 'AC'],
  ['5D', '4H', 'KD', 'QD', '10D', '9D', '8D', '7D', '7C', '6D'],
  ['6D', '5H', 'AD', '2C', '3C', '4C', '5C', '6C', '6C', '5D'],
  ['7D', '6H', '2H', '10C', '9C', '8C', '7C', '8C', '9C', '4D'],
  ['8D', '7H', 'KS', 'QS', '10S', '9S', '8S', '7S', '6S', '3D'],
  ['9D', '8H', '9H', '10H', 'QH', 'KH', 'AH', '2D', '4D', '2D'],
  ['corner', '10S', 'QS', 'KS', 'AS', '2S', '3S', '4S', '5S', 'corner'],
];

export const CARD_TO_SPACE_IDS: Record<string, string[]> = BOARD_LAYOUT.reduce<Record<string, string[]>>((lookup, row, rowIndex) => {
  row.forEach((code, colIndex) => {
    if (code === 'corner') return;
    if (!lookup[code]) {
      lookup[code] = [];
    }
    lookup[code].push(`${rowIndex}-${colIndex}`);
  });
  return lookup;
}, {});

export function createInitialBoard(): BoardSpace[][] {
  return BOARD_LAYOUT.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const parsed = cell === 'corner' ? null : parseCardCode(cell);
      return {
        id: `${rowIndex}-${colIndex}`,
        row: rowIndex,
        col: colIndex,
        card: cell,
        suit: parsed?.suit,
        rank: parsed?.rank,
        isCorner: cell === 'corner',
        occupiedBy: null,
        chip: undefined,
        partOfSequence: false,
        sequenceIds: [],
        sequenceUseCount: 0,
      };
    }),
  );
}

export function createDeck(startingState: number): { deck: Card[]; randomState: number } {
  const cards: Card[] = [];
  let order = 0;

  for (let deckIndex = 0; deckIndex < 2; deckIndex += 1) {
    for (const suit of BOARD_SUITS) {
      for (const rank of FULL_DECK_RANKS) {
        cards.push({
          id: `${deckIndex}-${order}-${cardToCode(rank, suit)}`,
          suit,
          rank,
          code: cardToCode(rank, suit),
          deckIndex,
          order,
        });
        order += 1;
      }
    }
  }

  const shuffled = shuffleWithState(cards, startingState);
  return {
    deck: shuffled.items,
    randomState: shuffled.randomState,
  };
}
