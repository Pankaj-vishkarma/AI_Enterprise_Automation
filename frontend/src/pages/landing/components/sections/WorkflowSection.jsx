import { motion } from 'framer-motion';
import { Workflow, Zap, Network, Shield } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';
import { WORKFLOW_STEPS, WORKFLOW_PROGRESS, DEPARTMENTS } from '../../constants';

export default function WorkflowSection() {
  return (
    <section id="workflows" className="relative py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-5">
        <SectionHeader
          eyebrow="Workflow Automation"
          title={<><span className="text-gradient">Operations that</span><br /><span className="text-gradient-pink">run themselves.</span></>}
          subtitle="Design approval chains, route tasks, and watch business processes execute end-to-end. Zero manual handoffs."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-6 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-4 glass rounded-3xl p-7 sm:p-10 relative overflow-hidden min-h-[360px]"
          >
            <div className="absolute -top-32 -right-20 h-80 w-80 rounded-full blur-3xl opacity-[0.10] bg-[#F0F51F]" />
            <Workflow className="h-7 w-7 text-[#1A1A14] mb-5" />
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-md">Visual workflow canvas</h3>
            <p className="mt-3 text-[var(--muted-foreground)] max-w-md">Drag, connect, deploy. Onboarding, refunds, vendor approvals — automated in minutes.</p>

            <div className="relative mt-10 grid grid-cols-4 gap-2">
              {WORKFLOW_STEPS.map((s, i) => (
                <div key={s} className="relative">
                  <div className="glass rounded-xl px-2 py-3 text-center text-xs font-medium">{s}</div>
                  {i < 3 && (
                    <div className="hidden sm:block absolute top-1/2 right-[-10px] h-px w-2.5 bg-gradient-to-r from-[#4B4B42] to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="md:col-span-2 glass rounded-3xl p-7 relative overflow-hidden"
          >
            <Zap className="h-7 w-7 text-[#6A6A60] mb-5" />
            <h3 className="text-xl font-bold">Real-time tracking</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Every task, every status, every bottleneck — visible at a glance.</p>
            <div className="mt-6 space-y-2">
              {WORKFLOW_PROGRESS.map((r) => (
                <div key={r.l}>
                  <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] mb-1">
                    <span>{r.l}</span><span>{r.v}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1A1A14]/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#1A1A14] to-[#6A6A60]" style={{ width: `${r.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="md:col-span-2 glass rounded-3xl p-7 relative overflow-hidden"
          >
            <Network className="h-7 w-7 text-[#4B4B42] mb-5" />
            <h3 className="text-xl font-bold">Departments connected</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">HR, Sales, Ops, Support, Finance — orchestrated under one OS.</p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {DEPARTMENTS.map((d) => (
                <span key={d} className="text-[11px] px-2.5 py-1 rounded-full glass">{d}</span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="md:col-span-4 glass rounded-3xl p-7 sm:p-10 relative overflow-hidden"
          >
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full blur-3xl opacity-[0.10] bg-[#D7D6C3]" />
            <Shield className="h-7 w-7 text-[#4B4B42] mb-5" />
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-md">Roles & permissions, native.</h3>
            <p className="mt-3 text-[var(--muted-foreground)] max-w-md">Granular access by department, team, and seniority. SSO, audit logs, data residency — enterprise-ready from day one.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
