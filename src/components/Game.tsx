import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Card, GameState, TeamColor } from '../shared/types';
import { isDeadCard } from '../shared/gameLogic';
import Board from './Board';
import Hand from './Hand';
import Chat from './Chat';
import GameStats from './GameStats';
import HowToPlay from './HowToPlay';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, RefreshCw, BookOpen, Target, Sparkles } from 'lucide-react';

interface Props {
  socket: Socket;
  gameState: GameState;
  playerName: string;
  playerId: string | null;
}

const TEAM_STYLES: Record<TeamColor, { dot: string; text: string; badge: string; glow: string; ring: string }> = {
  red: {
    dot: 'bg-rose-500',
    text: 'text-rose-400',
    badge: 'border-rose-500/20 bg-rose-500/5 text-rose-200',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    ring: 'ring-rose-500/30',
  },
  blue: {
    dot: 'bg-blue-500',
    text: 'text-blue-400',
    badge: 'border-blue-500/20 bg-blue-500/5 text-blue-200',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    ring: 'ring-blue-500/30',
  },
  green: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    badge: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    ring: 'ring-emerald-500/30',
  },
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function describeCard(card?: Card | null) {
  if (!card) return 'Awaiting Selection';
  return `${card.rank} of ${capitalize(card.suit)}`;
}

export default function Game({ socket, gameState, playerName, playerId }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  const myPlayer = gameState.players.find((player) => player.id === playerId);
  const isMyTurn = gameState.currentTurn === playerId;
  const hasPendingDraw = gameState.pendingDrawPlayerId === playerId;
  const currentTurnPlayer = gameState.players.find((player) => player.id === gameState.currentTurn) ?? null;
  const selectedCard = myPlayer?.hand.find((card) => card.id === selectedCardId) ?? null;
  const selectedDeadCard = Boolean(isMyTurn && selectedCard && isDeadCard(gameState.board, selectedCard));
  const sequenceTarget = gameState.requiredSequencesToWin;
  const myTeamStyle = myPlayer ? TEAM_STYLES[myPlayer.team] : null;

  useEffect(() => {
    if (!isMyTurn) {
      setSelectedCardId(null);
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (selectedCardId && !myPlayer?.hand.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(null);
    }
  }, [myPlayer, selectedCardId]);

  const handleSpaceClick = (spaceId: string) => {
    if (!isMyTurn || !selectedCardId) return;
    socket.emit('makeMove', { roomId: gameState.roomId, cardId: selectedCardId, spaceId });
    setSelectedCardId(null);
  };

  const handleDeadCard = () => {
    if (!isMyTurn || !selectedCardId) return;
    socket.emit('makeMove', { roomId: gameState.roomId, cardId: selectedCardId });
    setSelectedCardId(null);
  };

  const handleDrawCard = () => {
    if (!hasPendingDraw) return;
    socket.emit('drawCard', gameState.roomId);
  };

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-x-hidden selection:bg-[#c5a059]/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[30rem] h-[30rem] bg-gold-900/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[10%] w-[40rem] h-[40rem] bg-blue-900/5 blur-[150px] rounded-full" />
      </div>

      <AnimatePresence>
        {gameState.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="max-w-xl w-full text-center space-y-8"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-[#c5a059]/20 blur-3xl rounded-full" />
                <Trophy className="relative w-24 h-24 text-[#c5a059] mx-auto animate-bounce-slow" />
              </div>
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-[0.5em] text-[#c5a059]">Engagement Concluded</span>
                <h1 className="font-display text-6xl text-white">
                  {gameState.winner ? <><span className="text-gold-gradient">{capitalize(gameState.winner)} Team</span> triumphs</> : "Stalemate"}
                </h1>
                <p className="text-slate-400 text-lg max-w-sm mx-auto leading-relaxed">
                  The board has been settled. Your tactical maneuvers have reached their conclusion.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="button-primary px-12 py-5 text-base w-full sm:w-auto"
              >
                Assemble New Table
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />

      <div className="relative z-10 mx-auto max-w-[1600px] px-2 py-2 sm:px-6 sm:py-4 lg:px-8 flex flex-col min-h-screen gap-4 sm:gap-6">
        {/* Compact Header HUD */}
        <header className="premium-panel rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 lg:p-6 shrink-0">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-3 sm:gap-6">
              <div className="space-y-0.5 sm:space-y-1">
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.4em] text-[#c5a059]">Active Encounter</span>
                <h1 className="font-display text-xl sm:text-3xl text-white leading-none">
                  Sequence <span className="text-slate-700 font-sans font-light opacity-50 text-sm sm:text-base">/ {gameState.roomId.slice(0, 4)}</span>
                </h1>
              </div>
              <div className="status-pill h-fit px-2 py-0.5 sm:px-3 sm:py-1 border-white/5 bg-white/5 text-slate-400 text-[10px] sm:text-xs">
                <Users size={10} className="mr-1.5" />
                <span className="hidden sm:inline">{gameState.players.length} Strategists</span>
                <span className="sm:hidden">{gameState.players.length}</span>
              </div>
            </div>
             <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {[
                { label: 'Tactician', value: playerName, active: isMyTurn, hideOnMobile: true },
                { label: 'Initiative', value: currentTurnPlayer?.name || 'Awaiting', active: true },
                { label: 'Supply', value: gameState.drawDeck.length, active: false },
              ].filter(s => !s.hideOnMobile || window.innerWidth > 640).map((stat, i) => (
                <div key={i} className={`rounded-lg sm:rounded-xl px-2 py-1 sm:px-4 sm:py-2 ring-1 flex flex-col justify-center min-w-[70px] sm:min-w-[100px] ${stat.active ? 'bg-amber-500/5 ring-[#c5a059]/30 shadow-lg' : 'bg-slate-900/30 ring-white/5'}`}>
                  <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
                  <p className={`text-[10px] sm:text-sm font-bold truncate ${stat.active ? 'text-[#c5a059]' : 'text-white'}`}>{stat.value}</p>
                </div>
              ))}
              <button 
                onClick={() => setShowMobileInfo(!showMobileInfo)} 
                className="button-secondary h-fit px-3 py-2 text-[10px] sm:hidden"
              >
                <Target size={12} /> Info
              </button>
              <button onClick={() => setShowHowToPlay(true)} className="button-secondary h-fit px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs">
                <BookOpen size={12} className="sm:size-14" />
                <span className="hidden sm:inline">Manual</span>
              </button>
            </div>
         </div>
        </header>

         <main className="flex-grow min-h-0 overflow-y-auto sm:overflow-visible hide-scrollbar pb-24 sm:pb-0">
          <div className="grid h-full gap-4 sm:gap-6 xl:grid-cols-[1fr_360px]">
            <section className="flex flex-col gap-4 sm:gap-6 min-h-0">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_320px] shrink-0">
               <div className="premium-panel rounded-2xl p-4 lg:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Tactical Dominance</span>
                    <Target size={14} className="text-[#c5a059]" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {gameState.teams.map((team) => {
                      const style = TEAM_STYLES[team];
                      const score = gameState.sequences.filter((s) => s.team === team).length;
                      return (
                        <div key={team} className={`rounded-xl p-3 ring-1 ${style.ring} ${style.badge}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`h-1.5 w-1.5 rounded-full ${style.dot} ${style.glow}`} />
                            <span className="text-[9px] font-black uppercase tracking-widest">{team}</span>
                          </div>
                          <div className="text-xl font-display text-white">{score} / {sequenceTarget}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="premium-panel rounded-2xl p-4 lg:p-6 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Action Focus</span>
                    <Sparkles size={14} className="text-[#c5a059]" />
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3 ring-1 ring-white/5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Selected Unit</span>
                    <p className="mt-0.5 text-base font-bold text-white truncate">{describeCard(selectedCard)}</p>
                  </div>

                  <div className="mt-2">
                    {(selectedDeadCard || hasPendingDraw) ? (
                      <button 
                        onClick={selectedDeadCard ? handleDeadCard : handleDrawCard}
                        className="button-primary w-full py-3 gap-2 text-xs"
                      >
                        <RefreshCw size={12} className="animate-spin-slow" />
                        {selectedDeadCard ? "Recycle Dead Card" : "Draw Supply"}
                      </button>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic text-center">
                        {isMyTurn ? "Execute your maneuver." : "Awaiting rival..."}
                      </div>
                    )}
                  </div>
                </div>
              </div>

             {/* Central Board Stage - Scales to fit remaining height */}
            <section className="premium-panel-strong rounded-2xl sm:rounded-[2.5rem] p-2 sm:p-4 lg:p-6 relative flex flex-col justify-center min-h-0 flex-grow">
              <div className="absolute top-0 right-0 p-3 sm:p-6 flex gap-2">
                <span className="status-pill text-[7px] sm:text-[8px] border-[#c5a059]/30 bg-amber-500/5 text-[#c5a059]">Optimal Synthesis</span>
              </div>
             <div className="w-full max-w-[80vh] mx-auto aspect-square">
                <Board
                  board={gameState.board}
                  onSpaceClick={handleSpaceClick}
                  sequences={gameState.sequences}
                  selectedCard={selectedCard ?? undefined}
                  myTeam={myPlayer?.team}
                  winningTeam={gameState.winner}
                />
              </div>
            </section>

             {/* Hand Control */}
            {myPlayer && (
              <section className="premium-panel rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 lg:p-6 shrink-0">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div>
                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.4em] text-[#c5a059]">Strategic Reserve</span>
                    <h2 className="text-lg sm:text-xl font-display text-white">Command Hand</h2>
                  </div>
                 <div className={`status-pill hidden sm:block ${myTeamStyle?.badge}`}>
                    {capitalize(myPlayer.team)} Team Command
                  </div>
                </div>
                <Hand
                  hand={myPlayer.hand}
                  selectedCardId={selectedCardId}
                  onSelectCard={setSelectedCardId}
                  isMyTurn={isMyTurn}
                />
              </section>
            )}
            </section>
 
          <aside className={`fixed inset-0 sm:relative sm:inset-auto z-50 sm:z-10 bg-[#030712]/95 sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none transition-transform duration-500 ${showMobileInfo ? 'translate-y-0' : 'translate-y-full sm:translate-y-0'} flex flex-col h-full overflow-hidden p-4 sm:p-0`}>
            {/* Mobile Close Button */}
            <div className="sm:hidden flex justify-center pb-4">
              <button 
                onClick={() => setShowMobileInfo(false)}
                className="w-12 h-1.5 rounded-full bg-slate-800"
              />
            </div>
            
            <div className="flex-grow space-y-4 sm:space-y-6 overflow-y-auto hide-scrollbar pb-20 sm:pb-0">
              <section className="shrink-0 overflow-hidden rounded-2xl">
                <GameStats gameState={gameState} myPlayer={myPlayer} myTeam={myPlayer?.team} />
              </section>
 
              <section className="premium-panel rounded-2xl p-4 lg:p-6 space-y-4 shrink-0 max-h-[300px] overflow-y-auto hide-scrollbar">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Engagement Roster</span>
                  <span className="text-[9px] text-slate-600">{gameState.players.length} Strategists</span>
                </div>
                <div className="space-y-2">
                  {gameState.players.map((player) => {
                    const style = TEAM_STYLES[player.team];
                    const active = currentTurnPlayer?.id === player.id;
                    return (
                      <div key={player.id} className={`rounded-xl p-3 transition-all border ${active ? 'bg-amber-500/5 border-[#c5a059]/30' : 'bg-slate-900/30 border-white/5'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${style.dot} ${style.glow}`} />
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-white truncate max-w-[120px]">
                                {player.name} {player.id === playerId && "(You)"}
                              </p>
                              <p className={`text-[8px] font-black uppercase tracking-widest ${style.text}`}>{player.team}</p>
                            </div>
                          </div>
                          {player.isAI && <span className="status-pill text-[7px] px-1.5 py-0 border-emerald-500/20 bg-emerald-500/5 text-emerald-400">AI</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
 
              <section className="premium-panel rounded-2xl overflow-hidden flex-grow flex flex-col min-h-[300px] sm:min-h-[200px]">
                <Chat socket={socket} roomId={gameState.roomId} chat={gameState.chat} myId={playerId || ''} />
              </section>
            </div>
          </aside>
       </div>
      </main>
      </div>
    </div>
  );
}
