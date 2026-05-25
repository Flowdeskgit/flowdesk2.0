import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, MessageCircle, Headphones, Lightbulb, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function Avatar({ name }) {
  const initials = name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="h-7 w-7 rounded-full bg-brand-electric/15 border border-brand-electric/20 text-brand-sky text-[10px] font-semibold flex items-center justify-center backdrop-blur-sm">
      {initials}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, href }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 transition-all duration-200 text-[10px] text-white/40 hover:text-white hover:bg-white/5">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </a>
  );
}

function MelhoriasModal({ open, onClose }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!text.trim()) return;
    setSent(true);
    setTimeout(() => { setSent(false); setText(''); onClose(); }, 1800);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            className="fixed bottom-4 left-4 z-50 w-72 rounded-2xl border border-white/10 bg-[#07101D] shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-white">Melhorias & Feedback</p>
                <p className="text-[10px] text-white/40">Sugestões, ideias ou bugs</p>
              </div>
              <button onClick={onClose} className="h-6 w-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {sent ? (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <div className="h-8 w-8 rounded-full bg-brand-electric/15 flex items-center justify-center">
                  <Send className="h-4 w-4 text-brand-electric" />
                </div>
                <p className="text-xs text-brand-sky">Feedback enviado</p>
              </div>
            ) : (
              <>
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Digite sua sugestão..."
                  rows={4}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-xs resize-none mb-3 focus-visible:ring-brand-electric/40"
                />
                <Button onClick={handleSend} disabled={!text.trim()} className="w-full h-8 bg-brand-electric hover:bg-brand-steel text-white text-xs">
                  <Send className="h-3 w-3 mr-1.5" />Enviar
                </Button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function FoundersCard() {
  const [showMelhorias, setShowMelhorias] = useState(false);

  return (
    <>
      <MelhoriasModal open={showMelhorias} onClose={() => setShowMelhorias(false)} />

      <div className="mx-3 mb-3 rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-brand-electric/30 to-transparent" />

        <div className="p-2.5">

          {/* Header founders */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex -space-x-2">
              <Avatar name="Larissa Silvério" />
              <Avatar name="Ricardo Segundo" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white leading-none truncate">Larissa & Ricardo</p>
              <p className="text-[9px] uppercase tracking-wide text-brand-sky/55 mt-1">Co-Founders · FlowDesk</p>
            </div>
          </div>

          {/* Produto */}
          <div className="mb-2 rounded-lg bg-brand-electric/[0.06] border border-brand-electric/10 px-2 py-1.5">
            <p className="text-[11px] font-bold text-brand-sky leading-none">FlowDesk ADV</p>
            <p className="text-[9px] text-white/35 tracking-wide mt-0.5">SaaS · Intelligent Platform</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-4 gap-0.5 mb-2">
            <ActionBtn icon={Instagram} label="Larissa" href="https://instagram.com/larissa_easilverio" />
            <ActionBtn icon={Instagram} label="Ricardo" href="https://instagram.com/ric_segundo" />
            <ActionBtn icon={MessageCircle} label="WhatsApp" href="https://wa.me/5515991576538" />
            <ActionBtn icon={Headphones} label="Suporte" href="https://wa.me/5515991576538" />
          </div>

          {/* Melhorias */}
          <button onClick={() => setShowMelhorias(true)} className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-brand-electric/10 bg-brand-electric/[0.08] hover:bg-brand-electric/[0.12] text-brand-sky text-[10px] font-medium py-2 transition-all duration-200">
            <Lightbulb className="h-3 w-3" />
            Melhorias & Feedback
          </button>
        </div>
      </div>
    </>
  );
}