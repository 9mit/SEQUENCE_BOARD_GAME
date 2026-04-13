import { Card } from '../shared/types';
import { isOneEyedJack, isTwoEyedJack } from '../shared/constants';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { useState, useEffect } from 'react';
import { GripHorizontal } from 'lucide-react';

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
  switch (suit) {
    case 'hearts': return 'text-red-600 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    case 'diamonds': return 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]';
    case 'spades': return 'text-slate-900 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]'; // Black/dark blue
    case 'clubs': return 'text-emerald-600 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'; // Green
    default: return 'text-slate-900';
  }
}

function getSuitStyles(suit: string) {
  switch (suit) {
    case 'hearts':
      return {
        border: 'rounded-[1rem] sm:rounded-[1.2rem] border-red-500/40',
        pattern: 'bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.1)_0%,transparent_70%)]',
        anim: 'animate-[pulse_3s_ease-in-out_infinite]',
      };
    case 'diamonds':
      return {
        border: 'rounded-none border-orange-500/50',
        pattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(249,115,22,0.06)_4px,rgba(249,115,22,0.06)_8px)]',
        anim: 'opacity-80 transition-opacity duration-1000 animate-[pulse_2s_ease-in-out_infinite]', // shimmer
      };
    case 'spades':
      return {
        border: 'rounded-lg border-[3px] border-slate-700/80',
        pattern: 'bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,rgba(15,23,42,0.06)_6px,rgba(15,23,42,0.06)_12px)]',
        anim: '',
      };
    case 'clubs':
      return {
        border: 'rounded-lg border-2 border-emerald-500/50 border-dashed',
        pattern: 'bg-[radial-gradient(rgba(16,185,129,0.1)_2px,transparent_2px)] bg-[size:8px_8px]',
        anim: 'animate-[bounce_4s_ease-in-out_infinite]',
      };
    default:
      return {
        border: 'rounded-[1rem] border-slate-200',
        pattern: '',
        anim: '',
      };
  }
}

export default function Hand({ hand, selectedCardId, onSelectCard, isMyTurn }: Props) {
  const [orderedHand, setOrderedHand] = useState<Card[]>(hand);

  // Sync ordered hand with incoming hand prop while preserving custom order
  useEffect(() => {
    setOrderedHand(prev => {
      // 1. Filter out cards that are no longer in the hand
      const existingCards = prev.filter(c => hand.some(h => h.id === c.id));
      
      // 2. Find new cards that weren't in our ordered list
      const newCards = hand.filter(h => !prev.some(c => c.id === h.id));
      
      // 3. Combine them
      return [...existingCards, ...newCards];
    });
  }, [hand]);

  return (
    <Reorder.Group 
      axis="x" 
      values={orderedHand} 
      onReorder={setOrderedHand}
      className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 sm:pb-6 pt-1 sm:pt-2 px-1 sm:px-2 scrollbar-none custom-scrollbar touch-pan-x"
    >
      {orderedHand.map((card, index) => {
        const isSelected = selectedCardId === card.id;
        return (
          <HandCard 
            key={card.id} 
            card={card} 
            isSelected={isSelected} 
            isMyTurn={isMyTurn} 
            index={index} 
            onSelectCard={onSelectCard} 
          />
        );
      })}
    </Reorder.Group>
  );
}

function HandCard({ card, isSelected, isMyTurn, index, onSelectCard }: { card: Card, isSelected: boolean, isMyTurn: boolean, index: number, onSelectCard: (id: string | null) => void }) {
  const controls = useDragControls();
  const isTwoEyed = isTwoEyedJack(card);
  const isOneEyed = isOneEyedJack(card);
  const styles = getSuitStyles(card.suit);

  return (
    <Reorder.Item
      value={card}
      dragListener={false}
      dragControls={controls}
      className={`group relative shrink-0 transition-all duration-300 flex flex-col items-center ${
        isSelected ? 'z-30' : 'z-10'
      }`}
    >
      <motion.button
        type="button"
        onClick={() => isMyTurn && onSelectCard(isSelected ? null : card.id)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        whileHover={isMyTurn ? { y: -8, scale: 1.02 } : {}}
        whileTap={isMyTurn ? { scale: 0.95 } : {}}
        className={`w-[5.5rem] sm:w-[7.5rem] ${!isMyTurn ? 'cursor-not-allowed grayscale-[0.5] opacity-60' : 'cursor-pointer'}`}
      >
        {/* Card Body */}
        <div className={`relative h-[8rem] w-full sm:h-[11rem] bg-[#fdfdfd] p-1.5 sm:p-3 shadow-2xl transition-all duration-500 overflow-hidden ${styles.border} ${
          isSelected 
            ? 'ring-2 ring-[#c5a059]/40 border-[#c5a059] -translate-y-2 sm:-translate-y-4 shadow-[0_10px_30px_rgba(197,160,89,0.4)]' 
            : 'group-hover:border-[#c5a059]/40'
        }`}>
          {/* Pattern Overlay */}
          <div className={`absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply ${styles.pattern}`} />

          {/* Gold Top Edge */}
          <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c5a059]/40 to-transparent transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />

          <div className="relative z-10 flex flex-col h-full justify-between items-start">
            <div className={`text-[11px] sm:text-xs font-black leading-none text-left ${getSuitColor(card.suit)}`}>
              <div className="mb-0.5">{card.rank}</div>
              <div className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</div>
            </div>

            <div className={`flex flex-1 w-full items-center justify-center text-3xl sm:text-5xl opacity-90 ${getSuitColor(card.suit)}`}>
              <div className={styles.anim}>{getSuitSymbol(card.suit)}</div>
            </div>

            <div className={`text-[11px] sm:text-xs font-black leading-none text-left rotate-180 self-end ${getSuitColor(card.suit)}`}>
              <div className="mb-0.5">{card.rank}</div>
              <div className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</div>
            </div>
          </div>

          {/* Jack Badges */}
          {(isTwoEyed || isOneEyed) && (
            <div className="absolute inset-x-0 bottom-1 sm:top-1/2 sm:-translate-y-1/2 px-1 z-20">
              <div className="bg-slate-900 border border-[#c5a059]/50 text-[#c5a059] text-[7px] sm:text-[8px] font-black uppercase tracking-widest py-0.5 sm:py-1 px-1 sm:px-2 rounded-full text-center shadow-lg">
                {isTwoEyed ? 'Wild' : 'Remove'}
              </div>
            </div>
          )}
        </div>
      </motion.button>

      {/* Drag Handle */}
      {isMyTurn && (
        <div 
          className="mt-1 sm:mt-2 p-1.5 text-slate-500 hover:text-[#c5a059] hover:bg-white/5 rounded-full cursor-grab active:cursor-grabbing touch-none transition-colors group-hover:opacity-100 sm:opacity-50"
          onPointerDown={(e) => controls.start(e)}
        >
          <GripHorizontal size={16} className="sm:w-6 sm:h-6" />
        </div>
      )}

      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -bottom-1 sm:-bottom-2 left-1/2 -translate-x-1/2"
          >
            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#c5a059] shadow-[0_0_12px_#c5a059]" />
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
