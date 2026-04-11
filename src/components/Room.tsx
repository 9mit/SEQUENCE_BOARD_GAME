import { Socket } from 'socket.io-client';
import { GameState } from '../shared/types';
import { SUPPORTED_PLAYER_COUNTS } from '../shared/constants';
import { Users, Copy, Play, Bot, Crown, X, ArrowRight, LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useState } from 'react';

interface Props {
  socket: Socket;
  gameState: GameState;
  playerName: string;
  playerId: string | null;
}

export default function Room({ socket, gameState, playerName, playerId }: Props) {
  const isHost = gameState.players[0]?.id === playerId;
  const canStart = SUPPORTED_PLAYER_COUNTS.includes(gameState.players.length as (typeof SUPPORTED_PLAYER_COUNTS)[number]);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(gameState.roomId);
    toast.success('Access code copied to clipboard');
  };

  const handleStart = () => {
    socket.emit('startGame', gameState.roomId);
  };

  const handleAddAI = (difficulty: string) => {
    socket.emit('addAI', { roomId: gameState.roomId, difficulty });
  };

  const handleRemovePlayer = (playerId: string, playerName: string) => {
    setRemovingPlayerId(playerId);
    socket.emit('removePlayer', { roomId: gameState.roomId, playerId });
    toast.success(`${playerName} removed from the game`);
    setRemovingPlayerId(null);
  };

  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const shareLink = `${baseUrl}?join=${gameState.roomId}`;
    navigator.clipboard.writeText(shareLink);
    toast.success('Share link copied to clipboard!');
  };

  return (
    <div className="relative min-h-screen bg-[#030712] selection:bg-amber-500/30 selection:text-white">
      {/* Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-blue-900/10 blur-[150px] opacity-50" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gold-900/10 blur-[120px] opacity-40" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          
          {/* Main Stage */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="premium-panel-strong rounded-[1.5rem] sm:rounded-[2.5rem] p-6 lg:p-12 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 sm:p-8">
                <div className="status-pill border-amber-500/20 bg-amber-500/5 text-[#c5a059]">
                  <Users size={14} className="mr-2" />
                  {gameState.players.length} / 12 Seats
                </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#c5a059]">Private Assembly</span>
                  <h1 className="font-display text-3xl leading-tight text-white sm:text-5xl lg:text-6xl">
                    Prepare for <span className="text-gradient">Engagement.</span>
                  </h1>
                </div>

                <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-3xl bg-slate-900/50 p-8 ring-1 ring-white/10 space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Access Key</span>
                    <div className="flex items-center justify-between gap-3">
                       <code className="font-mono text-2xl sm:text-4xl font-bold tracking-[0.2em] text-white">
                        {gameState.roomId}
                      </code>
                      <button
                        onClick={copyRoomCode}
                        className="button-secondary px-6 py-2.5 text-xs h-fit whitespace-nowrap"
                      >
                        <Copy size={14} />
                        <span className="hidden sm:inline">Code</span>
                      </button>
                    </div>
                    {isHost && (
                      <button
                        onClick={generateShareLink}
                        className="button-secondary w-full py-3 text-xs gap-2"
                      >
                        <ArrowRight size={14} />
                        <span>Share Link</span>
                      </button>
                    )}
                  </div>

                  <div className="rounded-3xl bg-slate-900/30 p-8 ring-1 ring-white/5 space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Table Brief</span>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Host</span>
                        <span className="text-white font-medium">{gameState.players[0]?.name || playerName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Required</span>
                        <span className="text-white font-medium">2+ Strategic Minds</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl text-white">The Roster</h2>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Auto-balanced Teams</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {gameState.players.map((player, idx) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative flex items-center justify-between rounded-2xl bg-slate-900/40 p-4 ring-1 ring-white/5 hover:bg-slate-900/60 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-2.5 w-2.5 rounded-full shadow-lg ${
                            player.team === 'red' ? 'bg-rose-500 shadow-rose-500/40' : 
                            player.team === 'blue' ? 'bg-blue-500 shadow-blue-500/40' : 
                            'bg-emerald-500 shadow-emerald-500/40'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{player.name}</span>
                              {idx === 0 && <Crown size={12} className="text-[#c5a059]" />}
                              {player.id === playerId && <span className="text-[10px] text-slate-500">(You)</span>}
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-500">{player.team} Team</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-2">
                            {player.isAI && <span className="status-pill text-[9px] px-2 py-0.5 border-emerald-500/20 bg-emerald-500/5 text-emerald-400">AI Rival</span>}
                            {!player.connected && <span className="status-pill text-[9px] px-2 py-0.5 border-rose-500/20 bg-rose-500/5 text-rose-400">Offline</span>}
                          </div>
                          
                          {/* Remove Button - Only for Host, not for themselves */}
                          {isHost && player.id !== playerId && (
                            <button
                              onClick={() => handleRemovePlayer(player.id, player.name)}
                              disabled={removingPlayerId === player.id}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 disabled:opacity-50"
                              title={`Remove ${player.name}`}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Sidebar Control */}
           <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="premium-panel rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 space-y-6 sm:space-y-8">
             <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#c5a059]">Control Deck</span>
                <h3 className="font-display text-2xl text-white">
                  {isHost ? "Authorize Launch" : "Synchronizing Status"}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  {isHost 
                    ? "Ensure the roster is balanced. Add AI combatants if required to complete the table."
                    : "The host is currently finalizing the engagement parameters. Prepare your strategy."}
                </p>
              </div>

              {isHost ? (
                <div className="space-y-6">
                  <div className="space-y-4 rounded-3xl bg-slate-900/50 p-6 ring-1 ring-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      <Bot size={14} />
                      Deploy AI Units
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['easy', 'medium', 'hard'].map((level) => (
                        <button
                          key={level}
                          onClick={() => handleAddAI(level)}
                          className="rounded-xl border border-white/5 bg-slate-800 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-all hover:border-amber-500/50 hover:text-white"
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      disabled={!canStart}
                      onClick={handleStart}
                      className="button-primary w-full py-5 gap-3 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                    >
                      <Play size={18} fill="currentColor" />
                      <span>Launch Engagement</span>
                    </button>
                    {!canStart && (
                      <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest leading-relaxed">
                        Validation Error<br/>
                        Required: 2, 3, 4, 6, 8, 9, 10, or 12 Players
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 rounded-2xl bg-slate-900/50 p-6 ring-1 ring-white/5 text-sm text-slate-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#c5a059]/30 border-t-[#c5a059]" />
                  <span>Awaiting Host Authorization...</span>
                </div>
              )}
            </div>
            
            <div className="px-4 text-center">
              <p className="text-[10px] text-slate-700 uppercase tracking-[0.3em]">Session ID: {gameState.roomId}</p>
            </div>
          </motion.aside>

        </div>
      </main>
    </div>
  );
}
