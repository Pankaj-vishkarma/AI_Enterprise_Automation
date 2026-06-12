import { motion } from 'framer-motion';
import { Brain, Globe, ArrowRight } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';
import { RESEARCH_ITEMS, BROWSER_STEPS } from '../../constants';

export default function ResearchBrowserSection() {
  return (
    <section id="research" className="relative py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-5 space-y-16">
        <SectionHeader
          eyebrow="Research & Browser Automation"
          title={<><span className="text-gradient">Send agents</span><br /><span className="text-gradient-pink">into the wild.</span></>}
          subtitle="Run market analyses, monitor competitors, scrape job boards, fill forms. Your agents operate real browsers, 24/7."
        />

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-7 relative overflow-hidden min-h-[420px]"
          >
            <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full blur-3xl opacity-[0.10] bg-[#F0F51F]" />
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Brain className="h-4 w-4" /> Business Research Hub
            </div>
            <h3 className="mt-4 text-3xl font-bold tracking-tight">Decision-grade<br /> intelligence.</h3>

            <div className="mt-8 space-y-3">
              {RESEARCH_ITEMS.map((r, i) => (
                <div key={i} className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">{r.q}</div>
                    <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{r.t}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass rounded-3xl p-7 relative overflow-hidden min-h-[420px]"
          >
            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full blur-3xl opacity-[0.10] bg-[#D7D6C3]" />
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Globe className="h-4 w-4" /> Browser Automation
            </div>
            <h3 className="mt-4 text-3xl font-bold tracking-tight">Agents that<br /> click for you.</h3>

            <div className="mt-8 rounded-2xl overflow-hidden border border-[#1A1A14]/10">
              <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#1A1A14]/[0.03]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <div className="ml-3 flex-1 text-[10px] text-[var(--muted-foreground)] px-2 py-1 rounded bg-[#1A1A14]/5">
                  platform/agent/run · scraping jobs.dev
                </div>
              </div>
              <div className="p-4 space-y-2 bg-[#1A1A14]/[0.04]">
                {BROWSER_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    <div className={`h-1.5 w-1.5 rounded-full ${i === 3 ? 'bg-[#1A1A14]' : 'bg-[#6A6A60]'} ${i === 3 ? '' : 'animate-pulse'}`} />
                    <span className="text-[var(--muted-foreground)]">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
