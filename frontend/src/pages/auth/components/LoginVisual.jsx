import AICore from '../../landing/components/AICore';
import { LOGIN_CORE_NODES } from '../../landing/constants';

const PARTICLES = [
  { top: '20%', left: '24%', delay: '0s' },
  { top: '38%', left: '76%', delay: '1s' },
  { top: '65%', left: '18%', delay: '1.8s' },
  { top: '70%', left: '72%', delay: '2.4s' },
];

export default function LoginVisual() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full min-h-[220px] sm:min-h-[260px] md:min-h-0 overflow-hidden noise">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div
        className="absolute top-8 -left-16 h-[200px] w-[200px] md:h-[240px] md:w-[240px] rounded-full blur-3xl opacity-[0.10] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F0F51F, transparent 60%)' }}
      />
      <div
        className="absolute bottom-8 -right-16 h-[220px] w-[220px] md:h-[260px] md:w-[260px] rounded-full blur-3xl opacity-[0.08] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D7D6C3, transparent 60%)' }}
      />

      <div className="hidden lg:block">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="login-particle pointer-events-none"
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          />
        ))}
      </div>

      <div className="relative w-full px-4 sm:px-6 py-6 md:py-4 flex flex-col items-center justify-center">
        <AICore
          compact
          agents={LOGIN_CORE_NODES}
          maxWidth="500px"
          orbitRadius={36}
          showCenterMark
          className="w-full max-w-[180px] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[300px] xl:max-w-[320px]"
        />
        <p className="mt-4 md:mt-5 text-center text-[11px] sm:text-xs text-[var(--muted-foreground)] max-w-[240px] leading-relaxed hidden md:block">
          Your AI workforce — employees, workflows, knowledge, and analytics in one command center.
        </p>
      </div>
    </div>
  );
}
