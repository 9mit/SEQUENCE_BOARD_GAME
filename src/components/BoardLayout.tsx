import { useMemo } from 'react';
import { BoardSpace, SequenceLine, TeamColor, Card } from '../shared/types';

interface BoardLayoutProps {
  board: BoardSpace[][];
  onSpaceClick: (spaceId: string) => void;
  selectedCard?: Card | null;
  myTeam?: TeamColor;
  sequences?: SequenceLine[];
  winningTeam?: TeamColor;
}

/**
 * CardSuit: SVG renderers for suit symbols
 */
function heart(x: number, y: number, s: number): string {
  const w = s * 0.52;
  const h = s * 0.46;
  const tip = s * 0.46;
  return `<path d="M${x},${y + tip * 0.6} C${x},${y + tip * 0.6} ${x - w},${y + h * 0.3} ${x - w},${y - h * 0.05} C${x - w},${y - h * 0.55} ${x},${y - h * 0.55} ${x},${y - h * 0.15} C${x},${y - h * 0.55} ${x + w},${y - h * 0.55} ${x + w},${y - h * 0.05} C${x + w},${y + h * 0.3} ${x},${y + tip * 0.6} ${x},${y + tip * 0.6}Z" fill="#cc0000"/>`;
}

function diamond(x: number, y: number, s: number): string {
  const w = s * 0.5;
  const h = s * 0.7;
  return `<polygon points="${x},${y - h} ${x + w},${y} ${x},${y + h} ${x - w},${y}" fill="#cc0000"/>`;
}

function club(x: number, y: number, s: number): string {
  const r = s * 0.28;
  const st = s * 0.18;
  const sw = s * 0.38;
  return `<circle cx="${x}" cy="${y - r * 0.6}" r="${r}" fill="#111"/>
          <circle cx="${x - r * 0.88}" cy="${y + r * 0.4}" r="${r}" fill="#111"/>
          <circle cx="${x + r * 0.88}" cy="${y + r * 0.4}" r="${r}" fill="#111"/>
          <rect x="${x - st / 2}" y="${y + r * 0.15}" width="${st}" height="${r * 0.85}" fill="#111"/>
          <rect x="${x - sw / 2}" y="${y + r}" width="${sw}" height="${st * 0.65}" rx="${st * 0.2}" fill="#111"/>`;
}

function spade(x: number, y: number, s: number): string {
  const w = s * 0.5;
  const h = s * 0.62;
  const st = s * 0.18;
  const sw = s * 0.38;
  return `<path d="M${x},${y - h} C${x - w * 0.55},${y - h * 0.3} ${x - w},${y + h * 0.1} ${x - w * 0.45},${y + h * 0.28} C${x - w * 0.12},${y + h * 0.38} ${x},${y + h * 0.2} ${x},${y + h * 0.2} C${x},${y + h * 0.2} ${x + w * 0.12},${y + h * 0.38} ${x + w * 0.45},${y + h * 0.28} C${x + w},${y + h * 0.1} ${x + w * 0.55},${y - h * 0.3} ${x},${y - h}Z" fill="#111"/>
          <rect x="${x - st / 2}" y="${y + h * 0.2}" width="${st}" height="${h * 0.42}" fill="#111"/>
          <rect x="${x - sw / 2}" y="${y + h * 0.58}" width="${sw}" height="${st * 0.65}" rx="${st * 0.2}" fill="#111"/>`;
}

function suitSVG(suit: string, x: number, y: number, s: number): string {
  if (suit === 'hearts') return heart(x, y, s);
  if (suit === 'diamonds') return diamond(x, y, s);
  if (suit === 'clubs') return club(x, y, s);
  if (suit === 'spades') return spade(x, y, s);
  return '';
}

/**
 * Pip positions for number cards [x%, y%]
 */
const PIPS: Record<number, Array<[number, number]>> = {
  2: [
    [50, 22],
    [50, 78],
  ],
  3: [
    [50, 16],
    [50, 50],
    [50, 84],
  ],
  4: [
    [27, 22],
    [73, 22],
    [27, 78],
    [73, 78],
  ],
  5: [
    [27, 18],
    [73, 18],
    [50, 50],
    [27, 82],
    [73, 82],
  ],
  6: [
    [27, 18],
    [73, 18],
    [27, 50],
    [73, 50],
    [27, 82],
    [73, 82],
  ],
  10: [
    [27, 8],
    [73, 8],
    [50, 22],
    [27, 37],
    [73, 37],
    [27, 63],
    [73, 63],
    [50, 78],
    [27, 92],
    [73, 92],
  ],
};

function pipFontSize(n: number): number {
  if (n <= 2) return 38;
  if (n <= 4) return 33;
  if (n <= 6) return 27;
  return 23;
}

function pipsSVG(n: number, suit: string): string {
  const positions = PIPS[n] || [];
  const s = pipFontSize(n);
  let g = '';
  positions.forEach(([px, py]) => {
    g += suitSVG(suit, px, py, s);
  });
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

/**
 * Face card art
 */
function faceArt(rank: string, suit: string): string {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const fill = isRed ? '#cc0000' : '#111';
  const skin = '#f8d9b0';

  let top = '';

  if (rank === 'A') {
    const g = suitSVG(suit, 50, 50, 50);
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
  }

  if (rank === 'K') {
    top += `<polygon points="28,8 36,3 50,10 64,3 72,8 68,20 32,20" fill="${fill}"/>`;
    top += `<rect x="34" y="20" width="32" height="3" fill="${fill}" opacity="0.5"/>`;
    top += `<ellipse cx="50" cy="28" rx="9" ry="9.5" fill="${skin}"/>`;
    top += `<path d="M35,38 Q50,33 65,38 L67,50 L33,50Z" fill="${fill}"/>`;
    top += suitSVG(suit, 50, 46, 9);
  } else if (rank === 'Q') {
    top += `<path d="M32,9 L39,18 L50,12 L61,18 L68,9 L65,21 L35,21Z" fill="${fill}"/>`;
    top += `<ellipse cx="50" cy="29" rx="9" ry="9" fill="${skin}"/>`;
    top += `<path d="M35,39 Q50,34 65,39 L68,50 L32,50Z" fill="${fill}"/>`;
    top += suitSVG(suit, 50, 46, 8);
  } else if (rank === 'J') {
    top += `<rect x="36" y="7" width="28" height="5" rx="2" fill="${fill}"/>`;
    top += `<rect x="42" y="4" width="16" height="12" rx="2" fill="${fill}"/>`;
    top += `<ellipse cx="50" cy="28" rx="8.5" ry="8.5" fill="${skin}"/>`;
    top += `<rect x="37" y="37" width="26" height="13" rx="3" fill="${fill}"/>`;
    top += `<polygon points="47,37 53,37 52,50 48,50" fill="${skin}" opacity="0.5"/>`;
  }

  return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <g>${top}</g>
    <g transform="rotate(180 50 50)">${top}</g>
    <line x1="8" y1="50" x2="92" y2="50" stroke="${fill}" stroke-width="0.5" opacity="0.2"/>
  </svg>`;
}

/**
 * Wild corner marker
 */
function wildSVG(): string {
  return `<svg viewBox="0 0 100 100" width="66%" height="66%" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" fill="none" stroke="#d4a017" stroke-width="3.5"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="#d4a017" stroke-width="2"/>
    <circle cx="50" cy="50" r="14" fill="none" stroke="#d4a017" stroke-width="1.5"/>
    <line x1="50" y1="4" x2="50" y2="96" stroke="#d4a017" stroke-width="2"/>
    <line x1="4" y1="50" x2="96" y2="50" stroke="#d4a017" stroke-width="2"/>
    <line x1="17" y1="17" x2="83" y2="83" stroke="#d4a017" stroke-width="1.5"/>
    <line x1="83" y1="17" x2="17" y2="83" stroke="#d4a017" stroke-width="1.5"/>
  </svg>`;
}

export default function BoardLayout({ board, onSpaceClick, selectedCard, myTeam }: BoardLayoutProps) {
  const SUIT_SYMBOLS: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const isRed = (suit: string) => suit === 'hearts' || suit === 'diamonds';

  const renderCard = (space: BoardSpace) => {
    if (space.isCorner) {
      return (
        <div className="bg-gradient-to-br from-[#1e2340] to-[#0c0e1a] border border-[#c8a020] rounded flex items-center justify-center">
          {wildSVG()}
        </div>
      );
    }

    const rank = space.rank;
    const suit = space.suit || '';
    const red = isRed(suit);
    const cls = red ? 'text-red-600' : 'text-black';
    const s = SUIT_SYMBOLS[suit] || '';
    const isFace = ['J', 'Q', 'K', 'A'].includes(rank || '');
    const n = rank === '10' ? 10 : parseInt(rank || '0');

    return (
      <div className="bg-white border border-gray-400 rounded text-[8px] leading-none relative h-full flex flex-col">
        {/* Top-left corner */}
        <div className={`absolute top-0.5 left-1 flex flex-col ${cls}`}>
          <span className="font-black text-[10px]">{rank}</span>
          <span className="text-[8px]">{s}</span>
        </div>

        {/* Center pips/face */}
        <div className="flex-1 flex items-center justify-center w-full">
          {isFace ? (
            <div dangerouslySetInnerHTML={{ __html: faceArt(rank || '', suit) }} className="w-[85%] h-[85%]" />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: pipsSVG(n, suit) }} className="w-full h-full" />
          )}
        </div>

        {/* Bottom-right corner (rotated) */}
        <div className={`absolute bottom-0.5 right-1 flex flex-col rotate-180 ${cls}`}>
          <span className="font-black text-[10px]">{rank}</span>
          <span className="text-[8px]">{s}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center p-4">
      {/* Outer frame */}
      <div className="bg-gradient-to-br from-[#f0d050] via-[#c8980c] to-[#9a7008] rounded-lg shadow-2xl p-2.5 border-4 border-[#6a4800]">
        {/* Inner border with gold frame effect */}
        <div className="bg-[rgba(70,45,0,0.75)] rounded p-1.5 border border-[rgba(255,210,60,0.5)]">
          {/* Board grid */}
          <div className="grid grid-cols-10 gap-1 bg-[#3d2a00] p-2 rounded">
            {board.map((row, r) =>
              row.map((space, c) => (
                <div
                  key={`${r}-${c}`}
                  onClick={() => onSpaceClick(space.id)}
                  className="aspect-[0.685] cursor-pointer rounded text-[7px] transition-transform hover:scale-110 hover:z-50 hover:shadow-lg"
                >
                  {renderCard(space)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
