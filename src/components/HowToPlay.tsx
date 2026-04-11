import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface BookPage {
  title: string;
  subtitle?: string;
  content: Array<{
    heading: string;
    text: string;
    bullets?: string[];
    tone?: 'default' | 'cool' | 'warm';
  }>;
}

const bookPages: BookPage[] = [
  {
    title: 'SEQUENCE',
    subtitle: 'A Game of Strategy & Skill',
    content: [
      {
        heading: 'Welcome',
        text: 'Build sequences before your opponents do. This guide will teach you everything you need to master the board and achieve victory.',
        tone: 'warm',
      },
      {
        heading: 'The Objective',
        text: 'Form a straight line of 5 connected markers on the board to create a sequence.',
        bullets: [
          'In 2-player games: First team to 2 sequences wins',
          'In 3-player games: First team to 1 sequence wins',
          'Lines can be horizontal, vertical, or diagonal',
        ],
      },
    ],
  },
  {
    title: 'The Board',
    subtitle: 'Your Strategic Arena',
    content: [
      {
        heading: 'Board Structure',
        text: 'A 10×10 grid of playing cards where every non-jack card appears exactly twice on the board.',
        bullets: [
          'Each space displays a playing card',
          'Four corner spaces are wild—available to all teams',
          'Total of 98 playable spaces (100 minus 2 wild corners)',
        ],
      },
      {
        heading: 'Your Position',
        text: 'Your assigned team color determines which markers you place. Play rotates clockwise around the table.',
        tone: 'cool',
      },
    ],
  },
  {
    title: 'Your Turn',
    subtitle: 'The Flow of Play',
    content: [
      {
        heading: 'Standard Play',
        text: 'Every turn follows the same three-step rhythm:',
        bullets: [
          '1. Select one card from your hand',
          '2. Place your marker on the matching board space',
          '3. Draw a new card to refresh your hand',
        ],
        tone: 'cool',
      },
      {
        heading: 'Card Placement Rules',
        text: 'When you play a card, find its matching space on the board. Most cards appear on exactly 2 spaces, so you can choose either location if both are open.',
        tone: 'default',
      },
    ],
  },
  {
    title: 'Dead Cards',
    subtitle: 'When Cards Can\'t Be Played',
    content: [
      {
        heading: 'What Makes a Card Dead?',
        text: 'If both spaces matching your card are already occupied by opponent markers, that card is "dead" and cannot be played.',
        tone: 'warm',
      },
      {
        heading: 'Handling Dead Cards',
        text: 'Use the "Replace Dead Card" action to discard it without placing a marker, then immediately draw a replacement from the deck.',
        bullets: [
          'You may use this action once per turn',
          'It\'s always better to replace than waste your turn',
          'Dead cards become more common as the board fills',
        ],
        tone: 'default',
      },
    ],
  },
  {
    title: 'Jack Cards',
    subtitle: 'Special Powers',
    content: [
      {
        heading: 'Two-Eyed Jacks',
        text: 'Hearts ♥ and Diamonds ♦ are wild cards. They allow you to place your marker on ANY empty space on the board, regardless of card matching.',
        tone: 'cool',
      },
      {
        heading: 'One-Eyed Jacks',
        text: 'Clubs ♣ and Spades ♠ remove one opponent marker from the board. However, you cannot remove markers that are already part of a completed sequence.',
        tone: 'warm',
      },
    ],
  },
  {
    title: 'Winning Sequences',
    subtitle: 'How to Score',
    content: [
      {
        heading: 'What Counts as a Sequence?',
        text: 'A line of 5 connected spaces in a straight row—horizontal, vertical, or diagonal. Sequences are automatically detected and locked in immediately.',
        bullets: [
          'All your markers in the line must be your team color',
          'Corners count for any team (they are neutral)',
          'Once locked, sequences glow and cannot be broken',
        ],
        tone: 'cool',
      },
      {
        heading: 'Winning the Match',
        text: 'Reach the required number of sequences for your player count. Multiple sequences can overlap and reuse spaces strategically.',
        tone: 'warm',
      },
    ],
  },
  {
    title: 'Strategy Tips',
    subtitle: 'Master the Game',
    content: [
      {
        heading: 'Control the Center',
        text: 'The middle 4×4 grid is premium real estate. A marker there threatens 8 possible winning lines. Secure center positions early.',
        tone: 'cool',
      },
      {
        heading: 'Defend First',
        text: 'If opponents are close to completing a sequence, block them before pursuing your own sequences.',
        bullets: [
          'A broken threat is more valuable than an incomplete line',
          'Use one-eyed jacks defensively when opponents are near victory',
          'Watch the board state constantly',
        ],
        tone: 'warm',
      },
    ],
  },
  {
    title: 'Advanced Tactics',
    subtitle: 'Elevate Your Game',
    content: [
      {
        heading: 'Build Chains',
        text: 'Place pairs of markers close together but separated. Hold the connecting cards to guarantee completion on future turns.',
        tone: 'default',
      },
      {
        heading: 'Jack Strategy',
        text: 'Manage your special cards wisely: Reserve two-eyed jacks for game-ending moves. Use one-eyed jacks to break 4-marker threats.',
        bullets: [
          'Don\'t waste powerful cards early',
          'Create false threats to bait opponent responses',
          'Coordinate with teammates in multiplayer',
        ],
        tone: 'cool',
      },
    ],
  },
  {
    title: 'Table Etiquette',
    subtitle: 'Play with Honor',
    content: [
      {
        heading: 'Fair Play Conduct',
        text: 'Keep the game flowing smoothly and enjoyably for everyone at the table.',
        bullets: [
          'Complete your draw step before the next player acts',
          'Teammates should not openly coach each other during play',
          'Use chat for logistics and fun, not strategic spoilers',
        ],
        tone: 'warm',
      },
      {
        heading: 'Have Fun',
        text: 'Sequence rewards strategy, observation, and quick thinking. Enjoy the mental competition and celebrate great plays.',
        tone: 'cool',
      },
    ],
  },
  {
    title: 'Ready to Play?',
    subtitle: 'You\'re All Set',
    content: [
      {
        heading: 'Remember',
        text: 'Strategy is knowing what to do when there are one thousand things you can do. Master the basics, then develop your own style.',
        tone: 'cool',
      },
      {
        heading: 'Good Luck',
        text: 'Return to the main table and claim your victory. The board awaits your strategic mind.',
        tone: 'warm',
      },
    ],
  },
];
function cardTone(tone: 'default' | 'cool' | 'warm' = 'default') {
  if (tone === 'cool') {
    return 'border-[rgba(103,213,226,0.18)] bg-[rgba(103,213,226,0.08)]';
  }
  if (tone === 'warm') {
    return 'border-[rgba(215,161,79,0.2)] bg-[rgba(215,161,79,0.08)]';
  }
  return 'border-white/10 bg-[rgba(244,239,228,0.04)]';
}

export default function HowToPlay({ isOpen, onClose }: Props) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const currentPage = bookPages[currentPageIndex];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === bookPages.length - 1;

  const handleNextPage = () => {
    if (!isLastPage) {
      setDirection('right');
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (!isFirstPage) {
      setDirection('left');
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  const pageVariants = {
    enter: (dir: 'left' | 'right') => ({
      x: dir === 'right' ? 100 : -100,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'left' | 'right') => ({
      zIndex: 0,
      x: dir === 'right' ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xl"
        >
          {/* Book container */}
          <motion.div
            initial={{ scale: 0.92, rotateX: 45 }}
            animate={{ scale: 1, rotateX: 0 }}
            exit={{ scale: 0.92, rotateX: 45 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl"
            style={{ perspective: '1000px' }}
          >
            {/* Book shadow/depth effect */}
            <div className="absolute -bottom-2 -left-2 -right-2 h-8 bg-gradient-to-t from-black/20 to-transparent blur-lg rounded-b-2xl" />

            {/* Book pages container */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-amber-900/20 shadow-2xl">
              {/* Outer book frame */}
              <div className="relative">
                {/* Left page gutter */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-900/40 via-amber-900/20 to-amber-900/40" />

                {/* Main content area */}
                <div className="flex flex-col md:flex-row min-h-[600px]">
                  {/* Left side padding/edge */}
                  <div className="hidden md:block w-8 bg-gradient-to-r from-slate-900/50 to-transparent" />

                  {/* Page content */}
                  <div className="flex-1 px-6 md:px-8 py-8 md:py-10">
                    <motion.div
                      key={`page-${currentPageIndex}`}
                      custom={direction}
                      variants={pageVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: 'spring', stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                      className="space-y-6"
                    >
                      {/* Page header */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400/70">
                          {`Page ${currentPageIndex + 1} of ${bookPages.length}`}
                        </p>
                        <h1 className="font-display text-5xl text-amber-50 leading-tight">
                          {currentPage.title}
                        </h1>
                        {currentPage.subtitle && (
                          <p className="text-lg text-amber-100/60 italic">{currentPage.subtitle}</p>
                        )}
                      </div>

                      {/* Page content cards */}
                      <div className="space-y-5 pt-4">
                        {currentPage.content.map((section, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + idx * 0.05 }}
                            className={`rounded-xl border p-4 ${cardTone(section.tone)}`}
                          >
                            <h3 className="font-semibold text-amber-50 text-lg">{section.heading}</h3>
                            <p className="mt-2 text-sm leading-6 text-amber-50/80">{section.text}</p>
                            {section.bullets && (
                              <ul className="mt-3 space-y-2 text-sm text-amber-50/70">
                                {section.bullets.map((bullet, bulletIdx) => (
                                  <li key={bulletIdx} className="flex gap-2 ml-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60 flex-shrink-0 mt-2" />
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Right side padding/edge */}
                  <div className="hidden md:block w-8 bg-gradient-to-l from-slate-900/50 to-transparent" />
                </div>

                {/* Footer: Page navigation */}
                <div className="border-t border-amber-900/20 bg-gradient-to-r from-slate-900/40 to-slate-800/40 backdrop-blur-sm px-6 md:px-8 py-5 flex items-center justify-between">
                  <button
                    onClick={handlePrevPage}
                    disabled={isFirstPage}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      isFirstPage
                        ? 'text-slate-600 cursor-not-allowed opacity-50'
                        : 'text-amber-100 hover:bg-amber-900/30 hover:text-amber-50 active:scale-95'
                    }`}
                  >
                    <ChevronLeft size={20} />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  {/* Page indicator */}
                  <div className="flex items-center gap-2">
                    {bookPages.map((_, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => {
                          setDirection(idx > currentPageIndex ? 'right' : 'left');
                          setCurrentPageIndex(idx);
                        }}
                        className={`h-2 transition-all ${
                          idx === currentPageIndex
                            ? 'w-8 bg-amber-400'
                            : 'w-2 bg-amber-900/40 hover:bg-amber-900/60'
                        }`}
                        whileHover={{ scale: 1.2 }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={isLastPage}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      isLastPage
                        ? 'text-slate-600 cursor-not-allowed opacity-50'
                        : 'text-amber-100 hover:bg-amber-900/30 hover:text-amber-50 active:scale-95'
                    }`}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="absolute -top-12 right-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-white/10 hover:border-amber-400/30 hover:bg-slate-700 text-slate-400 hover:text-amber-300 transition-all"
              aria-label="Close"
            >
              <X size={20} />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
