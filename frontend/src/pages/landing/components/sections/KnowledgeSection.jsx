import { motion } from 'framer-motion';
import { Check, BookOpen, Search, Sparkles } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';
import { KNOWLEDGE_QUESTIONS, KNOWLEDGE_SOURCES, KNOWLEDGE_FEATURES } from '../../constants';

export default function KnowledgeSection() {
  return (
    <section id="knowledge" className="relative py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-5 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div>
          <SectionHeader
            eyebrow="Knowledge Intelligence"
            title={<><span className="text-gradient">Your company,</span><br /><span className="text-gradient-pink">searchable.</span></>}
            subtitle="Upload handbooks, policies, SOPs, contracts. Your platform turns every document into instant, natural-language answers — with citations."
          />
          <ul className="mt-8 space-y-3">
            {KNOWLEDGE_FEATURES.map((t) => (
              <li key={t} className="flex items-center gap-3">
                <div className="h-5 w-5 grid place-items-center rounded-full bg-gradient-to-br from-[#1A1A14] to-[#4B4B42]">
                  <Check className="h-3 w-3 text-[#F1F0E3]" />
                </div>
                <span className="text-[var(--muted-foreground)]">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="glass rounded-3xl p-6 relative overflow-hidden"
        >
          <div className="absolute -top-32 -right-20 h-72 w-72 rounded-full blur-3xl opacity-[0.10] bg-[#E8C547]" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4 text-xs text-[var(--muted-foreground)]">
              <BookOpen className="h-4 w-4" /> Knowledge Search
            </div>
            <div className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="text-sm flex-1">What is the reimbursement policy?</span>
              <kbd className="text-[10px] px-2 py-1 rounded-md bg-[#1A1A14]/5 border border-[#1A1A14]/10">⌘K</kbd>
            </div>
            <div className="mt-4 space-y-2">
              {KNOWLEDGE_QUESTIONS.map((q) => (
                <div key={q} className="px-4 py-2.5 rounded-xl text-sm text-[var(--muted-foreground)] hover:bg-[#1A1A14]/5 cursor-pointer transition flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#1A1A14]" /> {q}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-[#1A1A14]/[0.08]">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-3">Sources connected</div>
              <div className="grid grid-cols-2 gap-2">
                {KNOWLEDGE_SOURCES.map((s) => (
                  <div key={s.name} className="glass rounded-xl px-3 py-2.5">
                    <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">{s.t}</div>
                    <div className="text-xs font-medium truncate mt-0.5">{s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
