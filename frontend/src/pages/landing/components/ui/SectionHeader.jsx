import { motion } from 'framer-motion';

export default function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7 }}
      className="max-w-3xl"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--muted-foreground)] mb-5">
        <span className="h-px w-8 bg-gradient-to-r from-[#1A1A14] to-transparent" />
        {eyebrow}
      </div>
      <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.04em] leading-[1]">
        {title}
      </h2>
      <p className="mt-5 text-[var(--muted-foreground)] text-base sm:text-lg max-w-2xl leading-relaxed">
        {subtitle}
      </p>
    </motion.div>
  );
}
