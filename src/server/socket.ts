import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { makeAIMove } from './ai.js';
import {
  addPlayerToRoom,
  createRoomState,
  declareDeadCard,
  drawCard,
  playCard,
  reconnectPlayer,
  rebindDisconnectedPlayer,
  startGame,
} from '../shared/gameLogic.js';
import { ChatMessage, Difficulty, GameState } from '../shared/types.js';

import { logger } from './logger.js';

const rooms = new Map<string, GameState>();
const connections = new Map<string, { roomId: string; playerId: string }>();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    logger.debug('Client connected', { socketId: socket.id });

    socket.on('createRoom', (data: { playerName: string }) => {
      const roomId = uuidv4().substring(0, 6).toUpperCase();
      const playerId = createPlayerId();
      const gameState = createRoomState({
        roomId,
        host: {
          id: playerId,
          name: data.playerName,
          connected: true,
        },
      });

      rooms.set(roomId, gameState);
      bindConnection(socket, roomId, playerId);
      socket.join(roomId);
      socket.emit('playerAssigned', playerId);
      socket.emit('roomCreated', roomId);
      emitGameState(io, roomId);
      logger.info('Room created', { roomId, hostName: data.playerName });
    });

    socket.on('createSinglePlayerRoom', (data: { playerName: string; difficulty: Difficulty }) => {
      const roomId = uuidv4().substring(0, 6).toUpperCase();
      const humanId = createPlayerId();
      const aiId = createPlayerId();

      const initialState = createRoomState({
        roomId,
        host: {
          id: humanId,
          name: data.playerName,
          connected: true,
        },
      });

      const withAi = addPlayerToRoom(initialState, {
        id: aiId,
        name: `AI (${data.difficulty})`,
        connected: true,
        isAI: true,
        aiDifficulty: data.difficulty,
      });

      if (!withAi.ok) {
        socket.emit('error', withAi.error);
        return;
      }

      const started = startGame(withAi.state);
      if (!started.ok) {
        socket.emit('error', started.error);
        return;
      }

      rooms.set(roomId, started.state);
      bindConnection(socket, roomId, humanId);
      socket.join(roomId);
      socket.emit('playerAssigned', humanId);
      socket.emit('roomCreated', roomId);
      emitGameState(io, roomId);
      void handleAIChain(io, roomId);
    });

    socket.on('joinRoom', (data: { roomId: string; playerName: string }) => {
      const roomId = data.roomId.toUpperCase();
      const existingState = rooms.get(roomId);

      if (!existingState) {
        socket.emit('error', 'Room not found');
        return;
      }

      const rejoinTarget = existingState.players.find(
        (player) => !player.connected && player.name.trim().toLowerCase() === data.playerName.trim().toLowerCase(),
      );

      if (rejoinTarget) {
        const newPlayerId = createPlayerId();
        const rebound = rebindDisconnectedPlayer(existingState, data.playerName, newPlayerId);
        if (!rebound.ok) {
          socket.emit('error', rebound.error);
          return;
        }

        rooms.set(roomId, rebound.state);
        bindConnection(socket, roomId, newPlayerId);
        socket.join(roomId);
        socket.emit('playerAssigned', newPlayerId);
        emitGameState(io, roomId);
        return;
      }

      if (existingState.status !== 'waiting') {
        socket.emit('error', 'Game already started');
        return;
      }

      if (existingState.players.some((player) => player.name.trim().toLowerCase() === data.playerName.trim().toLowerCase())) {
        socket.emit('error', 'A player with that name is already seated.');
        return;
      }

      const playerId = createPlayerId();
      const added = addPlayerToRoom(existingState, {
        id: playerId,
        name: data.playerName,
        connected: true,
      });

      if (!added.ok) {
        logger.warn('Failed to join room', { roomId, playerName: data.playerName, error: added.error });
        socket.emit('error', added.error);
        return;
      }

      logger.info('Player joined room', { roomId, playerName: data.playerName, playerId });
      rooms.set(roomId, added.state);
      bindConnection(socket, roomId, playerId);
      socket.join(roomId);
      socket.emit('playerAssigned', playerId);
      emitGameState(io, roomId);
    });

    socket.on('addAI', (data: { roomId: string; difficulty: Difficulty }) => {
      const connection = connections.get(socket.id);
      const roomId = data.roomId.toUpperCase();
      const gameState = rooms.get(roomId);

      if (!gameState || gameState.status !== 'waiting') return;
      if (!connection || connection.playerId !== gameState.players[0]?.id) return;

      const added = addPlayerToRoom(gameState, {
        id: createPlayerId(),
        name: `AI (${data.difficulty})`,
        connected: true,
        isAI: true,
        aiDifficulty: data.difficulty,
      });

      if (!added.ok) {
        socket.emit('error', added.error);
        return;
      }

      rooms.set(roomId, added.state);
      emitGameState(io, roomId);
    });

    socket.on('removePlayer', (data: { roomId: string; playerId: string }) => {
      const connection = connections.get(socket.id);
      const roomId = data.roomId.toUpperCase();
      const gameState = rooms.get(roomId);

      // Only host can remove players, and only during waiting status
      if (!gameState || gameState.status !== 'waiting') return;
      if (!connection || connection.playerId !== gameState.players[0]?.id) return;

      // Cannot remove the host
      if (data.playerId === gameState.players[0]?.id) return;

      // Remove player from the game state
      const updatedState: GameState = {
        ...gameState,
        players: gameState.players.filter(p => p.id !== data.playerId),
      };

      rooms.set(roomId, updatedState);
      emitGameState(io, roomId);
      logger.info('Player removed by host', { roomId, removedPlayerId: data.playerId });
    });

    socket.on('leaveRoom', (data: { roomId: string }) => {
      const connection = connections.get(socket.id);
      const roomId = data.roomId.toUpperCase();
      const gameState = rooms.get(roomId);

      if (!connection || connection.roomId !== roomId || !gameState) return;

      // If host leaves, delete the entire room
      if (gameState.players[0]?.id === connection.playerId) {
        rooms.delete(roomId);
        io.to(roomId).emit('roomClosed', { reason: 'Host left the room' });
        logger.info('Room deleted - host left', { roomId });
      } else {
        // Regular player leaves
        const updatedState: GameState = {
          ...gameState,
          players: gameState.players.filter(p => p.id !== connection.playerId),
        };
        rooms.set(roomId, updatedState);
        emitGameState(io, roomId);
        logger.info('Player left room', { roomId, playerId: connection.playerId });
      }

      // Disconnect the socket
      socket.leave(roomId);
      connections.delete(socket.id);
    });

    socket.on('deleteRoom', (data: { roomId: string }) => {
      const connection = connections.get(socket.id);
      const roomId = data.roomId.toUpperCase();
      const gameState = rooms.get(roomId);

      // Only host can delete the room
      if (!gameState || !connection || connection.playerId !== gameState.players[0]?.id) return;

      rooms.delete(roomId);
      io.to(roomId).emit('roomClosed', { reason: 'Host closed the room' });
      logger.info('Room deleted by host', { roomId });

      // Disconnect all sockets in the room
      io.to(roomId).disconnectSockets(true);
      
      // Clean up connections for this room
      for (const [connId, conn] of connections.entries()) {
        if (conn.roomId === roomId) {
          connections.delete(connId);
        }
      }
    });

    socket.on('startGame', (roomId: string) => {
      const connection = connections.get(socket.id);
      const gameState = rooms.get(roomId);

      if (!gameState || gameState.status !== 'waiting') return;
      if (!connection || connection.playerId !== gameState.players[0]?.id) return;

      const started = startGame(gameState);
      if (!started.ok) {
        socket.emit('error', started.error);
        return;
      }

      rooms.set(roomId, started.state);
      emitGameState(io, roomId);
      void handleAIChain(io, roomId);
    });

    socket.on('makeMove', (data: { roomId: string; cardId: string; spaceId?: string }) => {
      const connection = connections.get(socket.id);
      if (!connection || connection.roomId !== data.roomId) return;

      const gameState = rooms.get(data.roomId);
      if (!gameState) return;

      const result = data.spaceId
        ? playCard(gameState, connection.playerId, data.cardId, data.spaceId)
        : declareDeadCard(gameState, connection.playerId, data.cardId);

      if (!result.ok) {
        socket.emit('error', result.error);
        return;
      }

      rooms.set(data.roomId, result.state);
      emitGameState(io, data.roomId);
      void handleAIChain(io, data.roomId);
    });

    socket.on('drawCard', (roomId: string) => {
      const connection = connections.get(socket.id);
      if (!connection || connection.roomId !== roomId) return;

      const gameState = rooms.get(roomId);
      if (!gameState) return;

      const result = drawCard(gameState, connection.playerId);
      if (!result.ok) {
        socket.emit('error', result.error);
        return;
      }

      rooms.set(roomId, result.state);
      emitGameState(io, roomId);
      void handleAIChain(io, roomId);
    });

    socket.on('chatMessage', (data: { roomId: string; text: string }) => {
      const connection = connections.get(socket.id);
      const gameState = rooms.get(data.roomId);
      if (!connection || !gameState) return;

      const player = gameState.players.find((entry) => entry.id === connection.playerId);
      if (!player) return;

      // Basic sanitization and length limit
      const sanitizedText = data.text.trim().substring(0, 500).replace(/[<>]/g, '');
      if (!sanitizedText) return;

      const message: ChatMessage = {
        id: uuidv4(),
        senderId: player.id,
        senderName: player.name,
        text: sanitizedText,
        timestamp: Date.now(),
      };

      gameState.chat.push(message);
      io.to(data.roomId).emit('chatMessage', message);
      emitGameState(io, data.roomId);
      logger.debug('Chat message sent', { roomId: data.roomId, senderId: player.id });
    });

    socket.on('disconnect', () => {
      logger.debug('Client disconnected', { socketId: socket.id });
      const connection = connections.get(socket.id);
      if (!connection) return;

      const gameState = rooms.get(connection.roomId);
      if (!gameState) {
        logger.debug('Room already cleaned up or never existed', { roomId: connection.roomId });
        connections.delete(socket.id);
        return;
      }

      const result = reconnectPlayer(gameState, connection.playerId, false);
      if (result.ok) {
        logger.info('Player marked as disconnected', { roomId: connection.roomId, playerId: connection.playerId });
        rooms.set(connection.roomId, result.state);
        emitGameState(io, connection.roomId);
      }

      connections.delete(socket.id);
    });
  });

  // Room cleanup interval (every 30 minutes)
  const CLEANUP_INTERVAL = 30 * 60 * 1000;
  const ROOM_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours of inactivity

  setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [roomId, state] of rooms.entries()) {
      // Check if all players are disconnected and the room is old
      const allDisconnected = state.players.every(p => !p.connected || p.isAI);
      const isStale = state.chat.length > 0 
        ? now - state.chat[state.chat.length - 1].timestamp > ROOM_TIMEOUT
        : true; // If no chat, might need another way to track activity, but for now this is safe

      if (allDisconnected && isStale) {
        rooms.delete(roomId);
        cleanedCount++;
        
        // Cleanup connections for this room
        for (const [connId, conn] of connections.entries()) {
          if (conn.roomId === roomId) {
            connections.delete(connId);
          }
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info('Room cleanup completed', { cleanedCount, remainingRooms: rooms.size });
    }
  }, CLEANUP_INTERVAL);
}

function createPlayerId(): string {
  return `player-${uuidv4()}`;
}

function bindConnection(socket: Socket, roomId: string, playerId: string): void {
  connections.set(socket.id, { roomId, playerId });
}

function emitGameState(io: Server, roomId: string): void {
  const gameState = rooms.get(roomId);
  if (!gameState) return;
  io.to(roomId).emit('gameState', gameState);
}

async function handleAIChain(io: Server, roomId: string): Promise<void> {
  for (let step = 0; step < 24; step += 1) {
    const state = rooms.get(roomId);
    if (!state || state.status !== 'playing') {
      return;
    }

    if (state.pendingDrawPlayerId) {
      const pendingPlayer = state.players.find((player) => player.id === state.pendingDrawPlayerId);
      if (pendingPlayer?.isAI) {
        const drawResult = drawCard(state, pendingPlayer.id);
        if (!drawResult.ok) {
          return;
        }

        rooms.set(roomId, drawResult.state);
        emitGameState(io, roomId);
        continue;
      }
    }

    const currentPlayer = state.players.find((player) => player.id === state.currentTurn);
    if (!currentPlayer?.isAI) {
      return;
    }

    const decision = makeAIMove(state, currentPlayer);
    if (!decision) {
      return;
    }

    const result = decision.type === 'dead'
      ? declareDeadCard(state, currentPlayer.id, decision.cardId)
      : playCard(state, currentPlayer.id, decision.cardId, decision.spaceId);

    if (!result.ok) {
      return;
    }

    rooms.set(roomId, result.state);
    emitGameState(io, roomId);
  }
}
