import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Card, GameState, TeamColor } from '../shared/types';
import { isDeadCard } from '../shared/gameLogic';
import Board from './Board';
import Hand from './Hand';
import Chat from './Chat';
import GameStats from './GameStats';
import HowToPlay from './HowToPlay';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, RefreshCw, BookOpen, Target, Sparkles, LogOut, Clock, WifiOff } from 'lucide-react';
import { useSound } from '../hooks/useSound';

interface Props {
  socket: Socket;
  gameState: GameState;
  playerName: string;
  playerId: string | null;
  deviceMode: 'mobile' | 'pc';
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

export default function Game({ socket, gameState, playerName, playerId, deviceMode }: Props) {
  const { playSound } = useSound();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const prevSequencesCount = useRef(gameState.sequences.length);
  const prevStatus = useRef(gameState.status);

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

  // Sound triggers for gameplay events
  useEffect(() => {
    // Check for new sequences
    if (gameState.sequences.length > prevSequencesCount.current) {
      playSound('SEQUENCE_COMPLETED');
    }
    prevSequencesCount.current = gameState.sequences.length;

    // Check for game end
    if (gameState.status === 'finished' && prevStatus.current !== 'finished') {
      playSound('VICTORY');
    }
    prevStatus.current = gameState.status;
  }, [gameState.sequences.length, gameState.status, playSound]);

  const handleSpaceClick = (spaceId: string) => {
    if (!isMyTurn || !selectedCardId) return;
    socket.emit('makeMove', { roomId: gameState.roomId, cardId: selectedCardId, spaceId });
    playSound('PLACE_COIN');
    setSelectedCardId(null);
  };

  const handleDeadCard = () => {
    if (!isMyTurn || !selectedCardId) return;
    socket.emit('makeMove', { roomId: gameState.roomId, cardId: selectedCardId });
    playSound('PLACE_COIN');
    setSelectedCardId(null);
  };

  const handleDrawCard = () => {
    if (!hasPendingDraw) return;
    socket.emit('drawCard', gameState.roomId);
  };

  const handleForfeit = () => {
    if (confirm('Are you sure you want to leave? Your team will forfeit the match.')) {
      socket.emit('forfeitMatch', { roomId: gameState.roomId });
    }
  };

  const disconnectedPlayers = gameState.players.filter(
    (p) => gameState.disconnectGraceTransitions[p.id] && !p.isAI
  );

  return (
    <div className={`relative flex flex-col bg-[#030712] selection:bg-[#c5a059]/30 ${deviceMode === 'mobile' ? 'w-full h-full' : 'w-screen min-h-screen overflow-x-hidden'}`}>
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

      <div className={`relative z-10 mx-auto max-w-[1700px] w-full px-2 py-2 sm:px-4 sm:py-3 lg:px-6 flex flex-col gap-2 sm:gap-4 ${deviceMode === 'mobile' ? 'h-full flex-grow overflow-hidden' : ''}`}>
        {/* Compact Header HUD */}
        <header className="premium-panel rounded-xl sm:rounded-[2rem] p-2 sm:p-4 shrink-0">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
             <div className="flex items-center gap-2 sm:gap-6">
              <div className="space-y-0 sm:space-y-1">
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.4em] text-[#c5a059] hidden sm:block">Active Encounter</span>
                <h1 className="font-display text-lg sm:text-3xl text-white leading-none flex items-baseline gap-2">
                  Sequence <span className="text-slate-700 font-sans font-light opacity-50 text-xs sm:text-base">/ {gameState.roomId.slice(0, 4)}</span>
                </h1>
              </div>
              <div className="status-pill h-fit px-2 py-0.5 sm:px-3 sm:py-1 border-white/5 bg-white/5 text-slate-400 text-[9px] sm:text-xs">
                <Users size={10} className="mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline">{gameState.players.length} Strategists</span>
                <span className="sm:hidden">{gameState.players.length}</span>
              </div>
            </div>
             <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
              {[
                { label: 'Tactician', value: playerName, active: isMyTurn, hideOnMobile: true },
                { label: 'Initiative', value: currentTurnPlayer?.name || 'Awaiting', active: true },
                { label: 'Supply', value: gameState.drawDeck.length, active: false },
              ].filter(s => !s.hideOnMobile || window.innerWidth > 640).map((stat, i) => (
                <div key={i} className={`rounded-lg sm:rounded-xl px-2 py-0.5 sm:px-4 sm:py-2 ring-1 flex flex-col justify-center min-w-[60px] sm:min-w-[100px] ${stat.active ? 'bg-amber-500/5 ring-[#c5a059]/30 shadow-lg' : 'bg-slate-900/30 ring-white/5'}`}>
                  <span className="text-[6px] sm:text-[8px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
                  <p className={`text-[9px] sm:text-sm font-bold truncate ${stat.active ? 'text-[#c5a059]' : 'text-white'}`}>{stat.value}</p>
                </div>
              ))}
              <button 
                onClick={() => setShowMobileInfo(!showMobileInfo)} 
                className={`button-secondary h-fit px-2 py-1 text-[9px] flex items-center gap-1 ${deviceMode === 'pc' ? 'xl:hidden' : 'xl:hidden'}`}
              >
                <Target size={10} /> Info
              </button>
              <button onClick={() => setShowHowToPlay(true)} className="button-secondary h-fit px-2 py-1 sm:px-4 sm:py-2.5 text-[9px] sm:text-xs min-w-[50px]"><BookOpen size={10} className="sm:size-14 mx-auto" /><span className="hidden sm:inline ml-1">Manual</span></button>
              <button onClick={handleForfeit} className="button-secondary h-fit px-2 py-1 sm:px-4 sm:py-2.5 text-[9px] sm:text-xs border-rose-500/20 text-rose-400 hover:bg-rose-500/10" title="Forfeit Match"><LogOut size={10} className="sm:size-14 mx-auto" /><span className="hidden sm:inline ml-1">Leave</span></button>
            </div>
         </div>
        </header>

         <main className={`flex-grow min-h-0 w-full ${deviceMode === 'mobile' ? 'overflow-hidden' : ''}`}>
          <div className={`flex flex-col h-full gap-2 sm:gap-6 w-[100%] ${deviceMode === 'pc' ? 'xl:grid xl:grid-cols-[1fr_360px]' : 'flex-col'}`}>
            <section className="flex flex-col gap-2 sm:gap-6 min-h-0 flex-grow w-full">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_320px] shrink-0">
               <div className="premium-panel rounded-xl p-2 sm:p-4 lg:p-6 space-y-1 sm:space-y-4">
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

                <div className="premium-panel rounded-xl p-2 sm:p-4 lg:p-6 space-y-1 sm:space-y-4 flex flex-col justify-between hidden sm:flex">
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

             {/* Central Board Stage - Squeeze to perfectly fit viewport */}
            <section className="premium-panel-strong rounded-xl sm:rounded-[2rem] p-1 sm:p-2 lg:p-4 relative flex flex-col items-center justify-center min-h-0 flex-grow overflow-hidden w-full pb-[calc(0.25rem+env(safe-area-inset-bottom))] sm:pb-2 lg:pb-4">
              <div className="absolute top-0 right-0 p-1 sm:p-4 hidden sm:flex gap-1 z-10 pointer-events-none">
                <span className="status-pill text-[6px] sm:text-[8px] border-[#c5a059]/30 bg-amber-500/5 text-[#c5a059]">Optimal Synthesis</span>
              </div>
             <div className="h-full aspect-square w-full max-h-full max-w-full mx-auto flex shrink-0 items-center justify-center">
                <div className="w-full h-full">
                  <Board
                    board={gameState.board}
                    onSpaceClick={handleSpaceClick}
                    sequences={gameState.sequences}
                    selectedCard={selectedCard ?? undefined}
                    myTeam={myPlayer?.team}
                    winningTeam={gameState.winner}
                  />
                </div>
              </div>
            </section>

             {/* Hand Control */}
            {myPlayer && (
              <section className="premium-panel rounded-xl sm:rounded-[1.5rem] p-2 sm:p-4 lg:p-6 shrink-0 overflow-visible w-full">
                <div className="flex items-center justify-between mb-1 sm:mb-4">
                  <div>
                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.4em] text-[#c5a059]">Strategic Reserve</span>
                    <h2 className="text-lg sm:text-xl font-display text-white">Command Hand</h2>
                  </div>
                  <div className="flex gap-2 items-center">
                    {(selectedDeadCard || hasPendingDraw) && (
                      <button 
                        onClick={selectedDeadCard ? handleDeadCard : handleDrawCard}
                        className="button-primary sm:hidden px-3 py-1.5 gap-1 text-[10px]"
                      >
                        <RefreshCw size={10} className="animate-spin-slow" />
                        {selectedDeadCard ? "Recycle" : "Draw"}
                      </button>
                    )}
                    <div className={`status-pill hidden sm:block ${myTeamStyle?.badge}`}>
                      {capitalize(myPlayer.team)} Team Command
                    </div>
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
 
          <aside className={`transition-transform duration-500 flex flex-col shrink-0 ${
            deviceMode === 'mobile' 
              ? `fixed inset-0 z-50 bg-[#030712]/95 backdrop-blur-xl p-4 ${showMobileInfo ? 'translate-y-0' : 'translate-y-full'}` 
              : `fixed inset-0 xl:relative xl:inset-auto z-50 xl:z-10 bg-[#030712]/95 xl:bg-transparent backdrop-blur-xl xl:backdrop-blur-none p-4 xl:p-0 w-full xl:w-auto h-[100dvh] xl:h-full ${showMobileInfo ? 'translate-y-0' : 'translate-y-full xl:translate-y-0'}`
          }`}>
            {/* Mobile Close Button */}
            <div className={`${deviceMode === 'pc' ? 'xl:hidden' : ''} flex justify-center pb-4`}>
              <button 
                onClick={() => setShowMobileInfo(false)}
                className="w-12 h-1.5 rounded-full bg-slate-800"
              />
            </div>
            
            <div className="flex-grow space-y-4 overflow-y-auto hide-scrollbar pb-[100px] xl:pb-0">
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

      {/* Disconnection Grace Period Overlay */}
      <AnimatePresence>
        {disconnectedPlayers.map((player) => (
          <ReconnectOverlay key={player.id} player={player} graceEnd={gameState.disconnectGraceTransitions[player.id] || 0} />
        ))}
      </AnimatePresence>
      </div>
    </div>
  );
}

function ReconnectOverlay({ player, graceEnd }: { player: any; graceEnd: number }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((graceEnd - Date.now()) / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((graceEnd - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [graceEnd]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
    >
      <div className="premium-panel-strong rounded-3xl p-8 max-w-sm w-full text-center space-y-6 ring-1 ring-amber-500/30">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full animate-pulse" />
            <WifiOff size={48} className="text-rose-500 relative" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display text-white">{player.name} Disconnected</h2>
          <p className="text-slate-400 text-sm">
            Waiting for strategic reconnection. If they do not return within the grace period, the match will forfeit.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 bg-slate-950/50 py-4 rounded-2xl border border-white/5">
          <Clock size={20} className="text-[#c5a059]" />
          <span className="text-3xl font-mono font-black text-[#c5a059] tabular-nums">
            {timeLeft}s
          </span>
        </div>
      </div>
    </motion.div>
  );
}
