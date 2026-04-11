export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type TeamColor = 'red' | 'blue' | 'green';
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type MoveType = 'place' | 'remove' | 'dead';
export type SequenceDirection = 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  code: string;
  deckIndex: number;
  order: number;
}

export interface Player {
  id: string;
  name: string;
  team: TeamColor;
  hand: Card[];
  handLimit: number;
  missedDraws: number;
  isAI?: boolean;
  aiDifficulty?: Difficulty;
  connected: boolean;
  seatIndex: number;
}

export interface BoardSpace {
  id: string;
  row: number;
  col: number;
  card: string;
  suit?: Suit;
  rank?: Rank;
  isCorner: boolean;
  occupiedBy: string | null;
  chip?: TeamColor;
  partOfSequence: boolean;
  sequenceIds: string[];
  sequenceUseCount: number;
}

export interface SequenceLine {
  id: string;
  team: TeamColor;
  spaces: string[];
  createdByPlayerId: string;
  direction: SequenceDirection;
  turnNumber: number;
  usesCorner: boolean;
  isWinningSequence: boolean;
}

export interface LastMove {
  playerId: string;
  cardId: string;
  cardCode: string;
  spaceId?: string;
  type: MoveType;
  createdSequenceIds: string[];
  forfeitedDrawPlayerId?: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface BaseGameEvent {
  id: string;
  type: string;
  turnNumber: number;
  timestamp: number;
}

export interface CardPlayedEvent extends BaseGameEvent {
  type: 'CARD_PLAYED';
  playerId: string;
  cardId: string;
  cardCode: string;
  moveType: MoveType;
  spaceId?: string;
}

export interface ChipPlacedEvent extends BaseGameEvent {
  type: 'CHIP_PLACED';
  playerId: string;
  team: TeamColor;
  spaceId: string;
}

export interface ChipRemovedEvent extends BaseGameEvent {
  type: 'CHIP_REMOVED';
  playerId: string;
  spaceId: string;
  removedPlayerId: string;
  removedTeam: TeamColor;
}

export interface SequenceCreatedEvent extends BaseGameEvent {
  type: 'SEQUENCE_CREATED';
  playerId: string;
  team: TeamColor;
  sequenceId: string;
  spaces: string[];
}

export interface TurnEndedEvent extends BaseGameEvent {
  type: 'TURN_ENDED';
  playerId: string;
  nextPlayerId: string | null;
  pendingDrawPlayerId: string | null;
}

export interface GameWonEvent extends BaseGameEvent {
  type: 'GAME_WON';
  team: TeamColor;
  sequenceIds: string[];
}

export interface DeadCardUsedEvent extends BaseGameEvent {
  type: 'DEAD_CARD_USED';
  playerId: string;
  cardId: string;
  cardCode: string;
  replacementCardId?: string;
  replacementCardCode?: string;
}

export interface CardDrawnEvent extends BaseGameEvent {
  type: 'CARD_DRAWN';
  playerId: string;
  cardId?: string;
  cardCode?: string;
  deckRecycled: boolean;
}

export interface DrawForfeitedEvent extends BaseGameEvent {
  type: 'DRAW_FORFEITED';
  playerId: string;
  newHandLimit: number;
}

export interface DeckRecycledEvent extends BaseGameEvent {
  type: 'DECK_RECYCLED';
  count: number;
}

export interface TableTalkLoggedEvent extends BaseGameEvent {
  type: 'TABLE_TALK_LOGGED';
  team: TeamColor;
  penalizedPlayerIds: string[];
}

export type GameEvent =
  | CardPlayedEvent
  | ChipPlacedEvent
  | ChipRemovedEvent
  | SequenceCreatedEvent
  | TurnEndedEvent
  | GameWonEvent
  | DeadCardUsedEvent
  | CardDrawnEvent
  | DrawForfeitedEvent
  | DeckRecycledEvent
  | TableTalkLoggedEvent;

export interface GameState {
  roomId: string;
  status: GameStatus;
  players: Player[];
  teams: TeamColor[];
  currentTurn: string | null;
  currentTurnIndex: number;
  turnNumber: number;
  board: BoardSpace[][];
  drawDeck: Card[];
  discardPiles: Record<string, Card[]>;
  discardPile: Card[];
  sequences: SequenceLine[];
  winner: TeamColor | null;
  winningSequenceIds: string[];
  requiredSequencesToWin: number;
  pendingDrawPlayerId: string | null;
  deadCardUsedThisTurn: boolean;
  seed: number;
  randomState: number;
  lastMove: LastMove | null;
  chat: ChatMessage[];
  events: GameEvent[];
}

export interface EngineResult {
  ok: boolean;
  state: GameState;
  events: GameEvent[];
  error?: string;
}
