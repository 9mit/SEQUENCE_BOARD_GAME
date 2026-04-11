import { Socket } from 'socket.io-client';
import { ChatMessage } from '../shared/types';
import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  socket: Socket;
  roomId: string;
  chat: ChatMessage[];
  myId: string;
}

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
});

export default function Chat({ socket, roomId, chat, myId }: Props) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: chat.length > 6 ? 'smooth' : 'auto' });
  }, [chat]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    socket.emit('chatMessage', { roomId, text: message });
    setMessage('');
  };

  return (
    <div className="flex h-full min-h-[28rem] flex-col bg-[#030712] border-t lg:border-t-0 lg:border-l border-white/5">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <MessageSquare size={16} className="text-[#c5a059]" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Encounter Intel</h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Live Channel</p>
          </div>
        </div>
        <span className="status-pill text-[9px] border-white/5 bg-white/5 text-slate-400">
          {chat.length} Logs
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-none">
        {chat.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center ring-1 ring-white/5">
              <MessageSquare size={20} className="text-slate-700" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Transmissions Silent</p>
              <p className="text-[10px] text-slate-600 leading-relaxed uppercase tracking-tight">Establish communication with your fellow strategists.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {chat.map((msg) => {
              const isMe = msg.senderId === myId;
              const isSystem = Boolean(msg.isSystem);

              if (isSystem) {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center"
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059]/60 px-4 py-1.5 rounded-full border border-[#c5a059]/10 bg-[#c5a059]/5">
                      {msg.text}
                    </span>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: isMe ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isMe ? 'text-[#c5a059]' : 'text-slate-400'}`}>
                      {isMe ? 'Command' : msg.senderName}
                    </span>
                    <span className="text-[8px] text-slate-600 font-mono">
                      [{timeFormatter.format(new Date(msg.timestamp))}]
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-slate-800 text-white ring-1 ring-amber-500/20'
                        : 'bg-slate-900 text-slate-200 ring-1 ring-white/5'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-slate-950/50 backdrop-blur-md border-t border-white/5">
        <div className="relative group">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Broadcast message..."
            className="obsidian-input w-full pl-4 pr-12 py-3 text-sm"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#c5a059] disabled:text-slate-700 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
