import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CORE_AGENTS } from '../constants';
import { getIcon } from '../utils/icons';

export default function AICore({
  agents = CORE_AGENTS,
  maxWidth = '560px',
  orbitRadius = 44,
  showCenterMark = false,
  compact = false,
  className = '',
}) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tilt = compact ? 6 : 12;
  const tiltY = compact ? 7 : 14;
  const rx = useSpring(useTransform(my, [-1, 1], [tilt, -tilt]), { stiffness: 80, damping: 14 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-tiltY, tiltY]), { stiffness: 80, damping: 14 });

  useEffect(() => {
    const onMove = (e) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      mx.set(Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2))));
      my.set(Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2))));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mx, my]);

  const floatClass = compact ? 'animate-float-subtle' : 'animate-float';
  const glowClass = compact ? 'animate-pulse-glow-subtle' : 'animate-pulse-glow';

  return (
    <div
      ref={ref}
      className={`relative w-full aspect-square mx-auto ${className}`}
      style={{ perspective: 1200, maxWidth }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
      >
        <div
          className={`absolute inset-0 rounded-full blur-3xl ${compact ? 'opacity-[0.12]' : 'opacity-[0.18]'}`}
          style={{ background: 'radial-gradient(circle, rgba(240,245,31,0.35), transparent 60%)' }}
        />
        <div
          className={`absolute ${compact ? 'inset-10' : 'inset-8'} rounded-full blur-2xl ${compact ? 'opacity-[0.10]' : 'opacity-[0.15]'}`}
          style={{ background: 'radial-gradient(circle, rgba(232,197,71,0.30), transparent 60%)' }}
        />

        <div className="absolute inset-0 animate-spin-slow">
          <div className="absolute inset-[6%] rounded-full border border-[#1A1A14]/10" />
          <div className="absolute inset-[16%] rounded-full border border-[#1A1A14]/[0.08]" />
          <div className="absolute inset-[26%] rounded-full border border-dashed border-[#1A1A14]/[0.08]" />
        </div>
        <div className="absolute inset-0 animate-spin-rev">
          <div className="absolute inset-[36%] rounded-full border border-[#1A1A14]/[0.08]" />
        </div>

        <div
          className={`absolute inset-[34%] rounded-full overflow-hidden ${glowClass}`}
          style={{
            background: 'radial-gradient(circle at 30% 30%, #ffffff, #E8C547 35%, #1A1A14 60%, #F0F51F 100%)',
            boxShadow: compact
              ? '0 0 40px rgba(26,26,20,0.45), inset 0 0 30px rgba(240,245,31,0.35)'
              : '0 0 80px rgba(26,26,20,0.7), inset 0 0 60px rgba(240,245,31,0.5)',
          }}
        >
          <div
            className={`absolute inset-0 ${compact ? 'opacity-[0.14]' : 'opacity-[0.18]'}`}
            style={{ background: 'conic-gradient(from 0deg, transparent, rgba(240,245,31,0.4), transparent, rgba(106,106,96,0.4), transparent)' }}
          />
          {showCenterMark && (
            <div className="absolute inset-0 grid place-items-center">
              <span className={`font-bold text-[#F1F0E3] drop-shadow-sm ${compact ? 'text-lg' : 'text-2xl sm:text-3xl'}`}>AI</span>
            </div>
          )}
        </div>

        {agents.map((a, i) => {
          const rad = (a.angle * Math.PI) / 180;
          const cx = 50 + orbitRadius * Math.cos(rad);
          const cy = 50 + orbitRadius * Math.sin(rad);
          const Icon = getIcon(a.iconName);
          return (
            <motion.div
              key={a.label}
              className="absolute"
              style={{
                left: `${cx}%`,
                top: `${cy}%`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.8, ease: 'easeOut' }}
            >
              <div className={floatClass} style={{ animationDelay: `${i * 0.4}s` }}>
                <div
                  className={`glass flex items-center whitespace-nowrap ${
                    compact ? 'rounded-lg px-2 py-1 gap-1.5' : 'rounded-2xl px-3 py-2.5 gap-2'
                  }`}
                  style={{ boxShadow: `0 0 ${compact ? '16' : '30'}px ${a.color}40` }}
                >
                  <div
                    className={`grid place-items-center ${compact ? 'h-5 w-5 rounded-md' : 'h-7 w-7 rounded-lg'}`}
                    style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}80)` }}
                  >
                    <Icon className={`text-[#F1F0E3] ${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'}`} />
                  </div>
                  <span className={`font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>{a.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
