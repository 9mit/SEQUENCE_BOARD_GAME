import validator from 'validator';

// Input validation and sanitization utilities
export function validatePlayerName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new Error('Player name must be a string');
  }

  const trimmed = name.trim();

  // Length check
  if (trimmed.length < 1) {
    throw new Error('Player name cannot be empty');
  }

  if (trimmed.length > 50) {
    throw new Error('Player name cannot exceed 50 characters');
  }

  // Prevent only whitespace
  if (!/\S/.test(trimmed)) {
    throw new Error('Player name must contain non-whitespace characters');
  }

  // Sanitize: remove potential XSS vectors
  const sanitized = validator.escape(trimmed);

  return sanitized;
}

export function validateRoomId(roomId: unknown): string {
  if (typeof roomId !== 'string') {
    throw new Error('Room ID must be a string');
  }

  const normalized = roomId.toUpperCase().trim();

  // Room IDs should be alphanumeric, 6 characters
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    throw new Error('Invalid room ID format');
  }

  return normalized;
}

export function validateCardId(cardId: unknown): string {
  if (typeof cardId !== 'string') {
    throw new Error('Card ID must be a string');
  }

  const trimmed = cardId.trim();

  // Card IDs should follow pattern: "SUIT_VALUE" e.g., "H_A", "D_K"
  if (!/^[CDHS]_[A-Z0-9]+$/.test(trimmed)) {
    throw new Error('Invalid card ID format');
  }

  return trimmed;
}

export function validateSpaceId(spaceId: unknown): string {
  if (typeof spaceId !== 'string') {
    throw new Error('Space ID must be a string');
  }

  const trimmed = spaceId.trim();

  // Space IDs should be numeric coordinates or "FREE"
  if (!/^(\d{1,2}_\d{1,2}|FREE)$/.test(trimmed)) {
    throw new Error('Invalid space ID format');
  }

  return trimmed;
}

export function validateDifficulty(difficulty: unknown): string {
  if (typeof difficulty !== 'string') {
    throw new Error('Difficulty must be a string');
  }

  const valid = ['easy', 'medium', 'hard'];

  if (!valid.includes(difficulty.toLowerCase())) {
    throw new Error('Invalid difficulty level');
  }

  return difficulty.toLowerCase();
}

export function validateChatMessage(text: unknown): string {
  if (typeof text !== 'string') {
    throw new Error('Chat message must be a string');
  }

  const trimmed = text.trim();

  // Length check
  if (trimmed.length === 0) {
    throw new Error('Chat message cannot be empty');
  }

  if (trimmed.length > 500) {
    throw new Error('Chat message cannot exceed 500 characters');
  }

  // Sanitize: escape HTML tags
  const sanitized = validator.escape(trimmed);

  return sanitized;
}

export function validatePlayerId(playerId: unknown): string {
  if (typeof playerId !== 'string') {
    throw new Error('Player ID must be a string');
  }

  const trimmed = playerId.trim();

  // Player IDs should follow UUID format with prefix
  if (!/^player-[a-zA-Z0-9-]+$/.test(trimmed)) {
    throw new Error('Invalid player ID format');
  }

  return trimmed;
}
