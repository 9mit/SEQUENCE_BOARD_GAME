import { Socket } from 'socket.io-client';
import { useState, useEffect } from 'react';
import { Bot, Users, Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import HowToPlay from './HowToPlay';

interface Props {
  socket: Socket;
  playerName: string;
  setPlayerName: (name: string) => void;
}

const highlights = [
  {
    icon: Sparkles,
    label: 'Premium board view',
    text: 'Built to feel like a polished strategy table, not a quick prototype.',
  },
  {
    icon: Users,
    label: 'Instant multiplayer',
    text: 'Spin up a room, share the code, and bring everyone into the same match.',
  },
  {
    icon: Bot,
    label: 'Thoughtful AI rivals',
    text: 'Practice against different skill levels without waiting for a full room.',
  },
];

const stats = [
  { value: '2-12', label: 'Players supported' },
  { value: 'Live', label: 'Room sync and chat' },
  { value: '3', label: 'AI difficulty tiers' },
];

export default function Home({ socket, playerName, setPlayerName }: Props) {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showAIDifficulty, setShowAIDifficulty] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);

  // Handle auto-join from URL
  useEffect(() => {
    const autoJoinRoom = sessionStorage.getItem('autoJoinRoom');
    if (autoJoinRoom) {
      setJoinRoomId(autoJoinRoom);
      setIsAutoJoining(true);
      sessionStorage.removeItem('autoJoinRoom');
      // Auto-fill a default name if not set
      if (!playerName.trim()) {
        setPlayerName('Guest');
      }
      // Automatically join after setting name
      setTimeout(() => {
        socket.emit('joinRoom', { roomId: autoJoinRoom, playerName: playerName || 'Guest' });
      }, 100);
    }
  }, []);

  const handleCreateRoom = (): void => {
    if (!playerName.trim()) {
      toast.error('Alias required for the record');
      return;
    }
    socket.emit('createRoom', { playerName });
  };

  const handlePlayVsComputer = (difficulty: string): void => {
    if (!playerName.trim()) {
      toast.error('Alias required for the record');
      return;
    }
    socket.emit('createSinglePlayerRoom', { playerName, difficulty });
  };

  const handleJoinRoom = (): void => {
    if (!playerName.trim()) {
      toast.error('Alias required for the record');
      return;
    }
    if (!joinRoomId.trim()) {
      toast.error('Room ID required');
      return;
    }
    socket.emit('joinRoom', { roomId: joinRoomId, playerName });
  };

  return (
    <div className="relative min-h-screen bg-[#030712] selection:bg-amber-500/30 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:py-12 sm:px-6 lg:px-8 flex flex-col min-h-screen">
        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center flex-grow">
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-10"
          >
            <div className="space-y-6 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5"
              >
                <Sparkles size={14} className="text-[#c5a059]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5a059]">The Definitive Edition</span>
              </motion.div>
              
               <h1 className="font-display text-4xl leading-[1.1] text-white sm:text-7xl lg:text-8xl">
                Master the <span className="text-gradient">Sequence.</span>
              </h1>
              
               <p className="max-w-xl mx-auto lg:mx-0 text-base sm:text-lg leading-relaxed text-slate-400">
                Experience the game of strategy and luck redefined. A high-stakes digital arena for those who play to win.
              </p>
            </div>

             <div className="hidden sm:grid gap-4 sm:grid-cols-3">
              {highlights.map(({ icon: Icon, label, text }, idx) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="group premium-panel rounded-3xl p-6 transition-all hover:border-amber-500/30 hover:bg-slate-800/40"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-[#c5a059] ring-1 ring-white/10 group-hover:ring-amber-500/30">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-display text-lg text-white">{label}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-8 pt-4 justify-center lg:justify-start">
              {stats.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059]">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Action Center */}
           <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="premium-panel-strong rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-12 mb-8 lg:mb-0"
          >
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="font-display text-3xl text-white">Let's Play</h2>
                <p className="text-sm text-slate-500">Secure your seat at the strategy table.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="obsidian-input"
                    placeholder="Your Name"
                  />
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleCreateRoom}
                    className="button-primary w-full gap-3 py-5"
                  >
                    <span>Play Now</span>
                    <ArrowRight size={18} />
                  </button>

                  {!showAIDifficulty ? (
                    <button
                      onClick={() => setShowAIDifficulty(true)}
                      className="button-secondary w-full gap-3 py-5"
                    >
                      <Bot size={20} />
                      <span>Single Player vs AI</span>
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 rounded-3xl bg-slate-900/50 p-6 ring-1 ring-white/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">AI Difficulty</span>
                        <button 
                          onClick={() => setShowAIDifficulty(false)}
                          className="text-[10px] font-bold uppercase text-[#c5a059] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {['easy', 'medium', 'hard'].map((level) => (
                          <button
                            key={level}
                            onClick={() => handlePlayVsComputer(level)}
                            className="rounded-xl border border-white/5 bg-slate-800 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:border-amber-500/50 hover:text-white"
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="mx-4 flex-shrink text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">Join Room</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {isAutoJoining ? (
                  <div className="flex items-center justify-center gap-3 rounded-2xl bg-slate-900/50 p-4 ring-1 ring-white/5">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#c5a059]/30 border-t-[#c5a059]" />
                    <span className="text-sm text-slate-400">Joining room {joinRoomId}...</span>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      className="obsidian-input flex-1 font-mono tracking-[0.4em] placeholder:tracking-normal"
                      placeholder="ROOM ID"
                      maxLength={6}
                    />
                    <button
                      onClick={handleJoinRoom}
                      className="button-primary px-8"
                      disabled={!joinRoomId.trim()}
                    >
                      Join Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

        </div>

        {/* Footer Branding */}
        <footer className="py-12 mt-auto text-center space-y-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHowToPlay(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-200 font-semibold hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
          >
            <BookOpen size={18} />
            How to Play
          </motion.button>
          <p className="text-[10px] font-medium tracking-[0.4em] text-slate-700 uppercase">
            Royal Entertainment Systems &copy; 2026
          </p>
        </footer>

        {/* How to Play Modal */}
        <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </div>
    </div>
  );
}

