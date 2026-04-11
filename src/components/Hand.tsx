import { Card } from '../shared/types';
import { isOneEyedJack, isTwoEyedJack } from '../shared/constants';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  hand: Card[];
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  isMyTurn: boolean;
}

function getSuitSymbol(suit: string) {
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

function getSuitColor(suit: string) {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-rose-600' : 'text-slate-950';
}

export default function Hand({ hand, selectedCardId, onSelectCard, isMyTurn }: Props) {
  return (
    <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 sm:pb-6 pt-1 sm:pt-2 px-1 sm:px-2 scrollbar-none custom-scrollbar">
      {hand.map((card, index) => {
        const isSelected = selectedCardId === card.id;
        const isTwoEyed = isTwoEyedJack(card);
        const isOneEyed = isOneEyedJack(card);

        return (
          <motion.button
            key={card.id}
            type="button"
            onClick={() => isMyTurn && onSelectCard(isSelected ? null : card.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={isMyTurn ? { y: -8, scale: 1.02 } : {}}
            whileTap={isMyTurn ? { scale: 0.95 } : {}}
            className={`group relative shrink-0 transition-all duration-300 ${
              isSelected ? 'z-30' : 'z-10'
            } ${!isMyTurn ? 'cursor-not-allowed grayscale-[0.5] opacity-60' : 'cursor-pointer'}`}
          >
            {/* Card Body */}
            <div className={`relative h-[7.5rem] w-[5rem] sm:h-[11rem] sm:w-[7.5rem] rounded-[0.75rem] sm:rounded-[1rem] border bg-[#fdfdfd] p-1.5 sm:p-3 shadow-2xl transition-all duration-500 overflow-hidden ${
              isSelected 
                ? 'border-[#c5a059] ring-2 ring-[#c5a059]/20 -translate-y-2 sm:-translate-y-4 shadow-[0_10px_30px_rgba(197,160,89,0.3)]' 
                : 'border-slate-200 group-hover:border-[#c5a059]/30'
            }`}>
              {/* Gold Top Edge */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c5a059]/20 to-transparent transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />

              <div className="flex flex-col h-full justify-between items-start">
                <div className={`text-[10px] sm:text-xs font-black leading-none text-left ${getSuitColor(card.suit)}`}>
                  <div className="mb-0.5">{card.rank}</div>
                  <div className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</div>
                </div>

                <div className={`flex flex-1 w-full items-center justify-center text-2xl sm:text-5xl opacity-80 ${getSuitColor(card.suit)}`}>
                  {getSuitSymbol(card.suit)}
                </div>

                <div className={`text-[10px] sm:text-xs font-black leading-none text-left rotate-180 self-end ${getSuitColor(card.suit)}`}>
                  <div className="mb-0.5">{card.rank}</div>
                  <div className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</div>
                </div>
              </div>

              {/* Jack Badges */}
              {(isTwoEyed || isOneEyed) && (
                <div className="absolute inset-x-0 bottom-1 sm:top-1/2 sm:-translate-y-1/2 px-1">
                  <div className="bg-slate-900 border border-[#c5a059]/30 text-[#c5a059] text-[6px] sm:text-[8px] font-black uppercase tracking-widest py-0.5 sm:py-1 px-1 sm:px-2 rounded-full text-center shadow-lg">
                    {isTwoEyed ? 'Wild' : 'Remove'}
                  </div>
                </div>
              )}
            </div>

            {/* Selection indicator */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-[#c5a059] shadow-[0_0_10px_#c5a059]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
