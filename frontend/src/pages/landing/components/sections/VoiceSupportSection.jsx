import { motion } from 'framer-motion';
import { Mic, Headphones, MessageSquare } from 'lucide-react';
import { SUPPORT_TICKETS, OMNICHANNEL_CHANNELS } from '../../constants';

export default function VoiceSupportSection() {
  return (
    <section className="relative py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-5 grid lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass rounded-3xl p-7 relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl opacity-[0.10] bg-[#F0F51F]" />
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Mic className="h-4 w-4" /> Voice AI
          </div>
          <h3 className="mt-3 text-2xl font-bold">Talk to your company.</h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Hands-free knowledge search, voice commands, and meeting copilots.</p>

          <div className="mt-8 flex items-end gap-1 h-16">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-gradient-to-t from-[#4B4B42] to-[#1A1A14] animate-pulse"
                style={{ height: `${30 + Math.abs(Math.sin(i * 0.6)) * 70}%`, animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
          <div className="mt-4 text-xs text-[var(--muted-foreground)]">&ldquo;What is the leave policy?&rdquo;</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass rounded-3xl p-7 relative overflow-hidden"
        >
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full blur-3xl opacity-[0.10] bg-[#D7D6C3]" />
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Headphones className="h-4 w-4" /> Customer Support
          </div>
          <h3 className="mt-3 text-2xl font-bold">Tickets, triaged.</h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Auto-categorization, sentiment, response drafts, and smart escalation.</p>

          <div className="mt-6 space-y-2">
            {SUPPORT_TICKETS.map((t) => (
              <div key={t.c} className="flex items-center justify-between glass rounded-xl px-3 py-2.5">
                <span className="text-xs font-medium">{t.c}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${t.color}25`, color: t.color }}>{t.s}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="glass rounded-3xl p-7 relative overflow-hidden"
        >
          <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full blur-3xl opacity-[0.10] bg-[#E8C547]" />
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <MessageSquare className="h-4 w-4" /> Omnichannel
          </div>
          <h3 className="mt-3 text-2xl font-bold">Every channel, one inbox.</h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Web chat, Slack, Telegram, in-app — unified context, seamless handoff.</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {OMNICHANNEL_CHANNELS.map((c) => (
              <span key={c} className="text-[11px] px-3 py-1.5 rounded-full glass">{c}</span>
            ))}
          </div>
          <div className="mt-6 p-3 glass rounded-xl text-xs">
            <div className="text-[var(--muted-foreground)] mb-1">Latest · Slack</div>
            <div>&ldquo;AI handled it — customer rated 5★&rdquo;</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
