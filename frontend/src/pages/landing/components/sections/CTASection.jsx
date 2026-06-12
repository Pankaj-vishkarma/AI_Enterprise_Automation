import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import LoginLink from '../ui/LoginLink';

export default function CTASection() {
  return (
    <section id="cta" className="relative py-32 sm:py-44">
      <div className="mx-auto max-w-5xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative glass rounded-[2rem] sm:rounded-[2.5rem] p-10 sm:p-20 text-center overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{ background: 'radial-gradient(circle at 30% 20%, rgba(240,245,31,0.25), transparent 60%), radial-gradient(circle at 70% 80%, rgba(106,106,96,0.25), transparent 60%)' }}
          />
          <div className="absolute inset-0 bg-grid opacity-[0.10]" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              Onboarding open — Q3 cohort
            </div>
            <h2 className="mt-7 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.04em] leading-[1]">
              <span className="text-gradient">Your AI workforce</span>
              <br />
              <span className="text-gradient-pink">starts today.</span>
            </h2>
            <p className="mt-6 text-[var(--muted-foreground)] max-w-xl mx-auto">
              Deploy your first AI employee in under 10 minutes. No credit card required.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <LoginLink className="btn-primary px-7 py-4 rounded-xl font-medium flex items-center gap-2 w-full sm:w-auto justify-center">
                Start free trial <ArrowRight className="h-4 w-4" />
              </LoginLink>
              <a href="#" className="btn-ghost px-7 py-4 rounded-xl font-medium w-full sm:w-auto text-center">
                Talk to sales
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
