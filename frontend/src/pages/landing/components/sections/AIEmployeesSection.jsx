import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';
import { EMPLOYEES } from '../../constants';
import { getIcon } from '../../utils/icons';

export default function AIEmployeesSection() {
  return (
    <section id="employees" className="relative py-28 sm:py-40">
      <div
        className="absolute inset-0 -z-10 opacity-[0.18]"
        style={{ background: 'radial-gradient(800px 500px at 80% 20%, rgba(26,26,20,0.18), transparent 70%)' }}
      />
      <div className="mx-auto max-w-7xl px-5">
        <SectionHeader
          eyebrow="AI Employee Studio"
          title={<><span className="text-gradient">Hire specialists.</span><br /><span className="text-gradient-pink">In seconds.</span></>}
          subtitle="Spin up domain-trained AI employees for every team. Each one understands your data, your tone, and your processes."
        />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {EMPLOYEES.map((e, i) => {
            const Icon = getIcon(e.iconName);
            return (
              <motion.div
                key={e.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                whileHover={{ y: -6 }}
                className="group relative glass rounded-3xl p-6 overflow-hidden"
              >
                <div
                  className="absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl opacity-0 group-hover:opacity-[0.18] transition-opacity duration-500"
                  style={{ background: e.color }}
                />
                <div className="relative flex items-start justify-between mb-8">
                  <div
                    className="h-12 w-12 grid place-items-center rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${e.color}, ${e.color}60)`,
                      boxShadow: `0 8px 30px -8px ${e.color}80`,
                    }}
                  >
                    <Icon className="h-5 w-5 text-[#F1F0E3]" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{e.role}</span>
                </div>
                <h3 className="relative text-xl font-semibold tracking-tight">{e.name}</h3>
                <ul className="relative mt-4 space-y-2">
                  {e.tasks.map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <Check className="h-3.5 w-3.5 text-[var(--cyan)]" /> {t}
                    </li>
                  ))}
                </ul>
                <div className="relative mt-6 pt-5 border-t border-[#1A1A14]/[0.08] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">Always available</span>
                  <span className="flex items-center gap-1.5 text-[#1A1A14]/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" /> Online
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
