import { BRAND } from '../../constants';

export default function BrandLogo({ showSuffix = false, iconClassName = '' }) {
  return (
    <>
      <div
        className={`relative h-8 w-8 grid place-items-center rounded-lg bg-gradient-to-br from-[#1A1A14] to-[#4B4B42] shadow-[0_0_20px_rgba(240,245,31,0.5)] ${iconClassName}`}
      >
        <span className="font-bold text-sm text-[#F1F0E3]">{BRAND.shortMark}</span>
      </div>
      <span className="font-bold text-lg tracking-tight">{BRAND.name}</span>
      {showSuffix && (
        <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] ml-1">/ Platform</span>
      )}
    </>
  );
}
