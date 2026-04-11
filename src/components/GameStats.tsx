import { GameState, Player, TeamColor } from '../shared/types';
import { AlertCircle, Shield, TrendingUp, Zap, Heart, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  gameState: GameState;
  myPlayer: Player | undefined;
  myTeam: TeamColor | undefined;
}

const TEAM_COLOR_MAP: Record<TeamColor, string> = {
  red: 'text-rose-400',
  blue: 'text-blue-400',
  green: 'text-emerald-400',
};

export default function GameStats({ gameState, myPlayer, myTeam }: Props) {
  // Calculate hand penalties
  const handPenalties = gameState.players.map((player) => ({
    player,
    penalty: (player.handLimit ?? 0) < (gameState.players.length > 3 ? 3 : 6) ? player.handLimit : 0,
  }));

  // Count jack cards in play
  const jacksInPlay = gameState.sequences.reduce((count, seq) => {
    // Count how many complete sequences protect chips
    return count + seq.spaces.length;
  }, 0);

  // Analyze board control
  const boardControl = gameState.teams.map((team) => {
    const teamChips = gameState.board
      .flat()
      .filter((space) => space.chip === team && !space.isCorner)
      .length;
    return { team, chips: teamChips };
  });

  const totalChips = boardControl.reduce((sum, t) => sum + t.chips, 0);
  const centerChips = gameState.board
    .slice(3, 7)
    .flatMap((row) => row.slice(3, 7))
    .filter((space) => space.chip && !space.isCorner);

  // Risk assessment
  const getRiskLevel = (team: TeamColor) => {
    const sequences = gameState.sequences.filter((s) => s.team === team);
    const completedCount = sequences.length;
    const requiredCount = gameState.requiredSequencesToWin;
    
    if (completedCount >= requiredCount) return 'won';
    if (completedCount >= requiredCount - 1) return 'critical';
    if (completedCount > 0) return 'strong';
    return 'building';
  };

  return (
    <div className="space-y-4">
      {/* Victory Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-panel rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <TrendingUp size={12} />
            Victory Progress
          </span>
        </div>
        <div className="space-y-2">
          {gameState.teams.map((team) => {
            const sequences = gameState.sequences.filter((s) => s.team === team);
            const progress = Math.min(sequences.length, gameState.requiredSequencesToWin);
            const riskLevel = getRiskLevel(team);
            
            return (
              <div key={team} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold capitalize ${TEAM_COLOR_MAP[team]}`}>{team}</span>
                  <span className="text-slate-400">{progress} / {gameState.requiredSequencesToWin}</span>
                </div>
                <div className={`h-2 rounded-full bg-slate-800 overflow-hidden ring-1 ring-white/5 ${
                  riskLevel === 'won' ? 'ring-emerald-500/50' :
                  riskLevel === 'critical' ? 'ring-amber-500/50' :
                  riskLevel === 'strong' ? 'ring-blue-500/50' :
                  'ring-white/10'
                }`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress / gameState.requiredSequencesToWin) * 100}%` }}
                    className={`h-full rounded-full ${
                      riskLevel === 'won' ? 'bg-emerald-500' :
                      riskLevel === 'critical' ? 'bg-amber-500' :
                      riskLevel === 'strong' ? 'bg-blue-500' :
                      'bg-slate-600'
                    }`}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Hand & Penalties */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="premium-panel rounded-2xl p-4 space-y-3"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <Heart size={12} />
          Hand Status
        </span>
        <div className="space-y-2">
          {gameState.players
            .filter((p) => p.connected)
            .map((player) => (
              <div key={player.id} className="flex items-center justify-between text-xs bg-slate-900/40 rounded-lg p-2 ring-1 ring-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      player.id === gameState.currentTurn ? 'bg-[#c5a059] animate-pulse' : `bg-slate-600`
                    }`}
                  />
                  <span className="truncate text-slate-300">{player.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="font-mono text-slate-400">{player.hand.length}/{player.handLimit || '∞'}</span>
                  {player.handLimit && player.handLimit < 6 && (
                    <AlertCircle size={12} className="text-amber-500" title="Hand limit penalty active" />
                  )}
                </div>
              </div>
            ))}
        </div>
      </motion.div>

      {/* Board Control */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="premium-panel rounded-2xl p-4 space-y-3"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <Shield size={12} />
          Board Control
        </span>
        <div className="space-y-2">
          {boardControl.map(({ team, chips }) => (
            <div key={team} className="flex items-center justify-between text-xs">
              <span className={`font-bold capitalize ${TEAM_COLOR_MAP[team]}`}>{team}</span>
              <span className="text-slate-400">
                {chips} chips{' '}
                {totalChips > 0 && (
                  <span className="text-slate-500">({Math.round((chips / totalChips) * 100)}%)</span>
                )}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-white/5 mt-2 text-[9px] text-slate-500">
            Center Control: {centerChips.length} chips
          </div>
        </div>
      </motion.div>

      {/* Game Phase */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="premium-panel rounded-2xl p-4 space-y-3 bg-slate-900/50 ring-1 ring-slate-800"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <Clock size={12} />
          Game Phase
        </span>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Turn #{gameState.turnNumber}</span>
          <span className="text-slate-500">{gameState.drawDeck.length} cards remain</span>
        </div>
      </motion.div>

      {/* Strategic Tips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="premium-panel rounded-2xl p-4 space-y-3 bg-blue-900/10 ring-1 ring-blue-500/20"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
          <Zap size={12} />
          Strategic Insight
        </span>
        <p className="text-xs text-slate-300 leading-relaxed">
          {myTeam && gameState.sequences.filter((s) => s.team === myTeam).length === 0
            ? 'Focus on center control to maximize sequence possibilities.'
            : myTeam && gameState.sequences.filter((s) => s.team === myTeam).length >= gameState.requiredSequencesToWin - 1
            ? 'Guard your sequences carefully—lock in your victory!'
            : 'Build chains of 2-3 chips in multiple directions to create forks.'}
        </p>
      </motion.div>
    </div>
  );
}
