import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import BrandLogo from '../ui/BrandLogo';
import LoginLink from '../ui/LoginLink';
import { NAV_LINKS } from '../../constants';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled ? 'py-3' : 'py-5'
        }`}
      >
        <div className="mx-auto max-w-7xl px-5">
          <div
            className={`flex items-center justify-between rounded-2xl px-4 sm:px-5 py-3 transition-all duration-500 ${
              scrolled ? 'glass shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]' : ''
            }`}
          >
            <a href="#top" className="flex items-center gap-2.5 group">
              <BrandLogo showSuffix />
            </a>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="px-3.5 py-2 text-sm text-[var(--muted-foreground)] hover:text-[#1A1A14] rounded-lg hover:bg-[#1A1A14]/5 transition"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2.5">
              <LoginLink className="btn-ghost text-sm px-4 py-2 rounded-lg">Sign in</LoginLink>
              <LoginLink className="btn-primary text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </LoginLink>
            </div>

            <button
              onClick={() => setOpen(true)}
              className="md:hidden h-10 w-10 grid place-items-center rounded-lg glass"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <motion.div
        initial={false}
        animate={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[60] md:hidden"
      >
        <div className="absolute inset-0 bg-[var(--bg)]/95 backdrop-blur-xl" />
        <div className="relative h-full flex flex-col px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrandLogo iconClassName="shadow-none" />
            </div>
            <button onClick={() => setOpen(false)} className="h-10 w-10 grid place-items-center rounded-lg glass">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 flex flex-col justify-center gap-2">
            {NAV_LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={open ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.06 + 0.1 }}
                className="text-4xl font-bold tracking-tight py-3 border-b border-white/5"
              >
                {l.label}
              </motion.a>
            ))}
          </nav>
          <div className="pb-10 flex flex-col gap-3">
            <LoginLink onClick={() => setOpen(false)} className="btn-ghost text-center py-3.5 rounded-xl">Sign in</LoginLink>
            <LoginLink onClick={() => setOpen(false)} className="btn-primary text-center py-3.5 rounded-xl">Get Started</LoginLink>
          </div>
        </div>
      </motion.div>
    </>
  );
}
