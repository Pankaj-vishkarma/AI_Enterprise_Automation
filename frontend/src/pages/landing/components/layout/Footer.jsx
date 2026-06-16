import BrandLogo from '../ui/BrandLogo';
import { BRAND, FOOTER_COLUMNS } from '../../constants';

export default function Footer() {
  return (
    <footer className="relative pt-16 pb-10 border-t border-[#1A1A14]/[0.08]">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <BrandLogo iconClassName="shadow-none" />
            </div>
            <p className="mt-4 text-sm text-[var(--muted-foreground)] max-w-xs">
              The AI operating system for modern enterprises.
            </p>
          </div>
          {FOOTER_COLUMNS.map((c) => (
            <div key={c.t}>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-4">{c.t}</div>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}><a href="#" className="text-sm hover:text-[#1A1A14] text-[var(--muted-foreground)] transition">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="divider-glow mt-12" />
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
          <div>© {new Date().getFullYear()} {BRAND.fullName}. All rights reserved.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#1A1A14]">Privacy</a>
            <a href="#" className="hover:text-[#1A1A14]">Terms</a>
            <a href="#" className="hover:text-[#1A1A14]">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
