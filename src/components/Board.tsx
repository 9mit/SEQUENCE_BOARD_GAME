import { useMemo } from 'react';
import { BoardSpace, Card } from '../shared/types';
import { isOneEyedJack, isTwoEyedJack } from '../shared/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Props {
  board: BoardSpace[][];
  onSpaceClick: (spaceId: string) => void;
  sequences: { team: string; spaces: string[] }[];
  selectedCard?: Card;
  myTeam?: string;
  winningTeam?: string;
}

function getSuitSymbol(suit?: string) {
  switch (suit) {
    case 'hearts':
      return '\u2665';
    case 'diamonds':
      return '\u2666';
    case 'clubs':
      return '\u2663';
    case 'spades':
      return '\u2660';
    default:
      return '';
  }
}

function getSuitColor(suit?: string) {
  switch (suit) {
    case 'hearts': return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'; // Bright red
    case 'diamonds': return 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'; // Orange
    case 'spades': return 'text-slate-900 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]'; // Dark blue/black
    case 'clubs': return 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'; // Green
    default: return 'text-slate-400';
  }
}

function getSuitStyles(suit?: string) {
  switch (suit) {
    case 'hearts':
      return {
        boardBg: 'bg-red-500/10',
        border: 'rounded-[0.5rem] sm:rounded-[0.8rem] border border-red-500/30',
        pattern: 'bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.15)_0%,transparent_70%)]',
        anim: 'animate-[pulse_3s_ease-in-out_infinite]',
      };
    case 'diamonds':
      return {
        boardBg: 'bg-orange-500/10',
        border: 'rounded-none border border-orange-500/40',
        pattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(249,115,22,0.06)_4px,rgba(249,115,22,0.06)_8px)]',
        anim: 'opacity-80 transition-opacity duration-1000 animate-[pulse_2s_ease-in-out_infinite]',
      };
    case 'spades':
      return {
        boardBg: 'bg-slate-700/20',
        border: 'rounded-[0.25rem] border-[2px] border-slate-600/80',
        pattern: 'bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,rgba(15,23,42,0.06)_6px,rgba(15,23,42,0.06)_12px)]',
        anim: '',
      };
    case 'clubs':
      return {
        boardBg: 'bg-emerald-500/10',
        border: 'rounded-[0.25rem] border-[1.5px] border-emerald-500/40 border-dashed',
        pattern: 'bg-[radial-gradient(rgba(16,185,129,0.1)_2px,transparent_2px)] bg-[size:8px_8px]',
        anim: 'animate-[bounce_4s_ease-in-out_infinite]',
      };
    default:
      return {
        boardBg: 'bg-white/[0.03]',
        border: 'rounded-[2px] sm:rounded-lg border-white/5 bg-white/[0.03]',
        pattern: '',
        anim: '',
      };
  }
}

function getChipColor(team: string) {
  if (team === 'red') {
    return 'bg-[radial-gradient(circle_at_30%_30%,#fb7185_0%,#e11d48_45%,#881337_100%)]';
  }
  if (team === 'blue') {
    return 'bg-[radial-gradient(circle_at_30%_30%,#60a5fa_0%,#2563eb_45%,#1e3a8a_100%)]';
  }
  return 'bg-[radial-gradient(circle_at_30%_30%,#34d399_0%,#059669_45%,#064e3b_100%)]';
}

export default function Board({ board, onSpaceClick, sequences, selectedCard, myTeam, winningTeam }: Props) {
  const isSpaceHighlighted = (space: BoardSpace) => {
    if (!selectedCard) return false;
    if (space.isCorner) return false;

    if (isTwoEyedJack(selectedCard)) {
      return !space.chip;
    }
    if (isOneEyedJack(selectedCard)) {
      if (!space.chip || space.chip === myTeam) return false;
      const inSequence = sequences.some((seq) => seq.spaces.includes(space.id));
      return !inSequence;
    }

    return !space.chip && space.rank === selectedCard.rank && space.suit === selectedCard.suit;
  };

  const progressChips = useMemo(() => {
    const spaces = new Set<string>();
    if (!myTeam) return spaces;

    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    const isMyChipOrCorner = (r: number, c: number) => {
      if (r < 0 || r >= 10 || c < 0 || c >= 10) return false;
      const space = board[r][c];
      return space.isCorner || space.chip === myTeam;
    };

    const isEmptyOrMyChipOrCorner = (r: number, c: number) => {
      if (r < 0 || r >= 10 || c < 0 || c >= 10) return false;
      const space = board[r][c];
      return space.isCorner || space.chip === myTeam || !space.chip;
    };

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        for (const [dr, dc] of directions) {
          let possible = true;
          let myChipsCount = 0;
          const currentLine: string[] = [];

          for (let i = 0; i < 5; i++) {
            const nr = r + dr * i;
            const nc = c + dc * i;
            if (!isEmptyOrMyChipOrCorner(nr, nc)) {
              possible = false;
              break;
            }
            if (isMyChipOrCorner(nr, nc)) {
              myChipsCount++;
              currentLine.push(board[nr][nc].id);
            }
          }

          if (possible && (myChipsCount === 3 || myChipsCount === 4)) {
            currentLine.forEach((id) => spaces.add(id));
          }
        }
      }
    }

    sequences.forEach((seq) => {
      seq.spaces.forEach((id) => spaces.delete(id));
    });

    return spaces;
  }, [board, myTeam, sequences]);

  return (
    <div className="aspect-square w-full rounded-2xl sm:rounded-[2.5rem] bg-slate-900 p-1 sm:p-2 lg:p-4 shadow-2xl ring-1 ring-white/10">
      <div className="grid h-full w-full grid-cols-10 gap-0.5 sm:gap-1 rounded-xl sm:rounded-[2rem] bg-[#020617] p-1 sm:p-2 shadow-inner relative overflow-hidden">
        {/* Board Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('/noise.svg')] mix-blend-overlay" />
       
        {board.map((row) =>
          row.map((space) => {
            const isHighlighted = isSpaceHighlighted(space);
            const inSequence = sequences.some((seq) => seq.spaces.includes(space.id));
            const isProgress = progressChips.has(space.id);
            const styles = getSuitStyles(space.suit);

            return (
              <motion.button
                key={space.id}
                type="button"
                onClick={() => onSpaceClick(space.id)}
                whileHover={isHighlighted ? { scale: 1.05, zIndex: 30 } : {}}
                whileTap={isHighlighted ? { scale: 0.95 } : {}}
                className={`group relative aspect-square overflow-hidden transition-all duration-300 ${
                  space.isCorner
                    ? 'rounded-[2px] sm:rounded-lg border border-[#c5a059]/40 bg-slate-900 shadow-[inset_0_0_20px_rgba(197,160,89,0.1)]'
                    : `${styles.border} ${styles.boardBg}`
                } ${
                  isHighlighted
                    ? 'cursor-pointer ring-1 sm:ring-2 ring-[#c5a059] shadow-[0_0_10px_rgba(197,160,89,0.4)] z-20 brightness-125'
                    : 'cursor-default'
                } ${
                  !isHighlighted && selectedCard && !space.chip && !space.isCorner
                    ? 'opacity-20 translate-z-[-10px]'
                    : 'opacity-100'
                } ${inSequence ? 'ring-1 sm:ring-2 ring-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.6)] z-20' : ''}`}
              >
                {space.isCorner ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={16} className="text-[#c5a059] opacity-60 animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className={`absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply ${styles.pattern}`} />
                    <div className="absolute inset-0 p-1 flex flex-col justify-between z-10 bg-white/5 sm:bg-transparent">
                      <div className="flex justify-between items-start opacity-90">
                        <span className={`text-[8px] font-black leading-none sm:text-[10px] ${getSuitColor(space.suit)}`}>
                          {space.rank}
                        </span>
                        <span className={`text-[8px] leading-none sm:text-[10px] ${getSuitColor(space.suit)}`}>
                          {getSuitSymbol(space.suit)}
                        </span>
                      </div>
                     
                      <div className={`flex w-full items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity`}>
                        <div className={`text-base sm:text-2xl md:text-3xl ${getSuitColor(space.suit)} ${styles.anim}`}>
                          {getSuitSymbol(space.suit)}
                        </div>
                      </div>
                      <div className="flex justify-between items-end opacity-90 rotate-180">
                        <span className={`text-[8px] font-black leading-none sm:text-[10px] ${getSuitColor(space.suit)}`}>
                          {space.rank}
                        </span>
                        <span className={`text-[8px] leading-none sm:text-[10px] ${getSuitColor(space.suit)}`}>
                          {getSuitSymbol(space.suit)}
                        </span>
                      </div>
                   </div>
                  </>
                )}

                {/* Target Projection */}
                {isHighlighted && !space.chip && myTeam && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.4 }}
                      className={`h-[70%] w-[70%] rounded-full border border-white/20 blur-[1px] ${
                        myTeam === 'red' ? 'bg-rose-500' : 
                        myTeam === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                )}

                {/* Chip Rendering */}
                <AnimatePresence>
                  {space.chip && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, y: -20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={`pointer-events-none absolute inset-0 flex items-center justify-center p-1.5 z-30`}
                    >
                      <div
                        className={`relative h-full w-full rounded-full ring-1 ring-white/30 shadow-2xl ${getChipColor(space.chip)} ${
                          inSequence ? 'animate-pulse ring-offset-2 ring-offset-[#020617] ring-[#c5a059]' : ''
                        }`}
                      >
                        {/* Gemstone facets effect */}
                        <div className="absolute inset-[10%] rounded-full bg-white/10 blur-[1px]" />
                        <div className="absolute top-[15%] left-[15%] w-[30%] h-[30%] bg-white/20 rounded-full blur-[2px]" />
                        
                        {/* Progress indicator */}
                        {isProgress && space.chip === myTeam && !inSequence && (
                          <div className="absolute -inset-1 rounded-full border border-[#c5a059]/40 border-dashed animate-[spin_8s_linear_infinite]" />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          }),
        )}
      </div>
    </div>
  );
}
