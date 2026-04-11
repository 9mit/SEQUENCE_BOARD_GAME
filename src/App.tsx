import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Home from './components/Home';
import Room from './components/Room';
import Game from './components/Game';
import { GameState } from './shared/types';
import { Toaster, toast } from 'sonner';

const APP_URL = (import.meta as any).env.VITE_APP_URL || window.location.origin;
const socket: Socket = io(APP_URL);

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    socket.on('gameState', (state: GameState) => {
      setGameState(state);
      setRoomId(state.roomId);
    });

    socket.on('roomCreated', (id: string) => {
      setRoomId(id);
    });

    socket.on('playerAssigned', (id: string) => {
      setPlayerId(id);
    });

    socket.on('error', (msg: string) => {
      toast.error(msg);
    });

    return () => {
      socket.off('gameState');
      socket.off('roomCreated');
      socket.off('playerAssigned');
      socket.off('error');
    };
  }, []);

  return (
    <>
      <Toaster
        theme="dark"
        richColors
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(7, 16, 24, 0.96)',
            color: '#f4efe4',
            border: '1px solid rgba(145, 180, 197, 0.16)',
            backdropFilter: 'blur(20px)',
          },
        }}
      />
      {(() => {
        if (!roomId) {
          return <Home socket={socket} setPlayerName={setPlayerName} playerName={playerName} />;
        }

        if (gameState?.status === 'waiting') {
          return <Room socket={socket} gameState={gameState} playerName={playerName} playerId={playerId} />;
        }

        if (gameState?.status === 'playing' || gameState?.status === 'finished') {
          return <Game socket={socket} gameState={gameState} playerName={playerName} playerId={playerId} />;
        }

        return (
          <div className="page-shell flex min-h-dvh items-center justify-center px-4">
            <div className="premium-panel-strong flex flex-col items-center gap-4 rounded-[1.75rem] px-8 py-10 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[rgba(215,161,79,0.28)] border-t-[var(--primary)]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent-cool)]">Loading Table</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Syncing the latest game state.</p>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
