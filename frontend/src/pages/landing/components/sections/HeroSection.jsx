import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight } from 'lucide-react';
import AICore from '../AICore';
import LoginLink from '../ui/LoginLink';
import { BRAND, TRUST_MARQUEE } from '../../constants';

export default function HeroSection() {
  const marqueeItems = [...Array(2)].flatMap((_, k) =>
    TRUST_MARQUEE.map((n, i) => ({ key: `${k}-${i}`, name: n }))
  );

  return (
    <section id="top" className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 noise">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div
        className="absolute top-20 -left-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-[0.12]"
        style={{ background: 'radial-gradient(circle, #F0F51F, transparent 60%)' }}
      />
      <div
        className="absolute top-40 -right-32 h-[480px] w-[480px] rounded-full blur-3xl opacity-[0.10]"
        style={{ background: 'radial-gradient(circle, #D7D6C3, transparent 60%)' }}
      />

      <div className="relative mx-auto max-w-7xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="glass rounded-full pl-1 pr-4 py-1 flex items-center gap-2.5 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] font-medium">NEW</span>
            <span className="text-[var(--muted-foreground)]">Multi-agent collaboration is live</span>
            <ChevronRight className="h-3 w-3 text-[var(--muted-foreground)]" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-center text-[48px] sm:text-[72px] lg:text-[96px] font-bold tracking-[-0.04em] leading-[0.95]"
        >
          <span className="text-gradient">Build your</span>
          <br />
          <span className="text-gradient-pink">AI Workforce.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-7 text-center text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed"
        >
          {BRAND.fullName} is the AI operating system for the enterprise. Deploy specialized AI employees, automate workflows,
          unify knowledge, and orchestrate every department — all from a single command center.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <LoginLink className="btn-primary px-6 py-3.5 rounded-xl font-medium flex items-center gap-2 w-full sm:w-auto justify-center">
            Start free trial <ArrowRight className="h-4 w-4" />
          </LoginLink>
          <a href="#employees" className="btn-ghost px-6 py-3.5 rounded-xl font-medium flex items-center gap-2 w-full sm:w-auto justify-center">
            Watch the demo
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="mt-16 sm:mt-24"
        >
          <AICore />
        </motion.div>

        <div className="mt-20 relative overflow-hidden">
          <p className="text-center text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)] mb-6">
            Trusted by forward-thinking enterprises
          </p>
          <div className="flex gap-16 animate-marquee whitespace-nowrap">
            {marqueeItems.map((item) => (
              <span key={item.key} className="text-2xl font-semibold text-[#1A1A14]/25">{item.name}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
