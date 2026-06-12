import { motion } from 'framer-motion';
import SectionHeader from '../ui/SectionHeader';
import { BRAND, MULTI_AGENT_STEPS, MULTI_AGENT_PIPELINE } from '../../constants';
import { getIcon } from '../../utils/icons';

export default function MultiAgentSection() {
  return (
    <section className="relative py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-5">
        <SectionHeader
          eyebrow="Multi-Agent Collaboration"
          title={<><span className="text-gradient">A team of agents.</span><br /><span className="text-gradient-pink">One result.</span></>}
          subtitle={`Complex tasks deserve specialists. ${BRAND.name} orchestrates multiple AI employees that hand off work, debate decisions, and ship together.`}
        />

        <div className="mt-16 grid lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2 glass rounded-3xl p-6 sm:p-8">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--muted-foreground)] mb-3">Prompt</div>
            <p className="text-lg leading-relaxed">
              &ldquo;Create a market research report about the
              <span className="text-gradient-pink font-semibold"> electric vehicle </span>
              industry in India for Q2.&rdquo;
            </p>
            <div className="mt-8 space-y-3">
              {MULTI_AGENT_PIPELINE.map((s, i) => (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <div className="h-6 w-6 grid place-items-center rounded-full bg-[#1A1A14]/5 text-[10px] text-[var(--muted-foreground)]">{i + 1}</div>
                  <span className="text-[var(--muted-foreground)]">{s}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-[#1A1A14]/15 to-[#4B4B42]/10 border border-[#1A1A14]/10">
              <div className="text-xs text-[var(--muted-foreground)] mb-1">Delivered</div>
              <div className="font-medium">EV_Market_India_Q2.pdf · 42 pages · 3m 18s</div>
            </div>
          </div>

          <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
            {MULTI_AGENT_STEPS.map((s, i) => {
              const Icon = getIcon(s.iconName);
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="glass rounded-2xl p-5 relative overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 grid place-items-center rounded-xl bg-gradient-to-br from-[#4B4B42] to-[#4B4B42]">
                      <Icon className="h-4.5 w-4.5 text-[#F1F0E3]" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--muted-foreground)]">Step {i + 1}</div>
                      <div className="font-semibold">{s.title}</div>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{s.text}</p>
                  <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full blur-3xl opacity-[0.10] bg-[#E8C547]" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
