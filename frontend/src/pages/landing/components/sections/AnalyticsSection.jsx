import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';
import { ANALYTICS_STATS } from '../../constants';

export default function AnalyticsSection() {
  return (
    <section id="analytics" className="relative py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-5">
        <SectionHeader
          eyebrow="Analytics & Reporting"
          title={<><span className="text-gradient">Measure what</span><br /><span className="text-gradient-pink">moves the business.</span></>}
          subtitle="From AI adoption to workflow ROI — see exactly how your digital workforce performs. In real time."
        />

        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {ANALYTICS_STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="glass rounded-2xl p-5 sm:p-6 relative overflow-hidden"
            >
              <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-[0.10]" style={{ background: s.color }} />
              <div className="text-3xl sm:text-4xl font-bold tracking-tight">{s.value}</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        >
          <div className="absolute -top-32 left-1/3 h-80 w-80 rounded-full blur-3xl opacity-[0.08] bg-[#E8C547]" />
          <div className="relative flex items-center justify-between mb-6">
            <div>
              <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Live · Performance</div>
              <div className="font-semibold text-lg mt-1">Department efficiency</div>
            </div>
            <BarChart3 className="h-5 w-5 text-[var(--muted-foreground)]" />
          </div>

          <div className="relative h-48 sm:h-64">
            <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1A1A14" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#1A1A14" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6A6A60" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6A6A60" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,160 C60,140 100,90 160,80 C220,70 260,120 320,100 C380,80 420,40 480,50 C540,60 580,30 600,20 L600,200 L0,200 Z" fill="url(#g1)" />
              <path d="M0,160 C60,140 100,90 160,80 C220,70 260,120 320,100 C380,80 420,40 480,50 C540,60 580,30 600,20" stroke="#1A1A14" strokeWidth="2" fill="none" />
              <path d="M0,180 C80,170 140,130 200,140 C260,150 320,100 380,110 C440,120 500,80 600,70 L600,200 L0,200 Z" fill="url(#g2)" />
              <path d="M0,180 C80,170 140,130 200,140 C260,150 320,100 380,110 C440,120 500,80 600,70" stroke="#6A6A60" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <div className="relative mt-4 flex gap-5 text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#1A1A14]" /> AI tasks completed</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#6A6A60]" /> Hours saved</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
