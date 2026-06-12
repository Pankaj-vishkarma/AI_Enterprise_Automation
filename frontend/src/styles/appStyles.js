/** Shared earth-tone UI classes for dashboard & app pages */

export const appPageShell = 'space-y-5 sm:space-y-6 w-full';
export const appPageShellTall = 'space-y-5 sm:space-y-6 w-full flex flex-col flex-1 min-h-0';
export const appToolbarRow = 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4';
export const appSearchWrap = 'flex-1 w-full sm:max-w-md';
export const appGrid = 'grid gap-4 sm:gap-6';

export const appPageTitle = 'text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A14]';
export const appPageDesc = 'mt-2 text-sm text-[#6A6A60] leading-relaxed';
export const appSectionTitle = 'text-xl font-bold text-[#1A1A14]';

export const appCard = 'bg-white/45 backdrop-blur-md border border-[#1A1A14]/10 rounded-2xl overflow-hidden shadow-[0_4px_24px_-8px_rgba(26,26,20,0.08)]';
export const appCardPadding = 'p-5 sm:p-6';
export const appGlassCard = 'bg-white/45 backdrop-blur-md border border-[#1A1A14]/10 rounded-2xl p-5 sm:p-6 shadow-[0_4px_24px_-8px_rgba(26,26,20,0.08)] hover:shadow-[0_8px_32px_-8px_rgba(26,26,20,0.12)] transition-all duration-200';

export const appInput =
  'w-full py-2.5 rounded-xl bg-white/50 border border-[#1A1A14]/10 text-[#1A1A14] text-sm placeholder:text-[#6A6A60] focus:outline-none focus:border-[#1A1A14]/25 focus:shadow-[0_0_0_3px_rgba(26,26,20,0.06)] transition';
export const appInputWithIcon = `${appInput} pl-10 pr-4`;
export const appInputPlain = `${appInput} px-4`;
export const appSelect = appInputPlain;

export const appBtnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] shadow-[0_4px_16px_-4px_rgba(26,26,20,0.25)] hover:shadow-[0_6px_20px_-4px_rgba(26,26,20,0.35)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
export const appBtnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-[#1A1A14]/4 text-[#1A1A14] border border-[#1A1A14]/10 hover:bg-[#1A1A14]/8 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
export const appBtnIcon =
  'p-2 rounded-lg text-[#6A6A60] hover:text-[#1A1A14] hover:bg-[#1A1A14]/5 transition-all duration-200';
export const appBtnIconPrimary = 'p-2 rounded-lg text-[#1A1A14] hover:bg-[#1A1A14]/5 transition-all duration-200';
export const appBtnIconDanger = 'p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200';

export const appTableWrap = appCard;
export const appTableHead = 'bg-[#1A1A14]/[0.04] border-b border-[#1A1A14]/10';
export const appTh = 'text-left px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#6A6A60]';
export const appTr = 'border-b border-[#1A1A14]/[0.06] hover:bg-[#1A1A14]/[0.03] transition-colors duration-150';
export const appTd = 'px-4 sm:px-6 py-4 text-sm text-[#1A1A14]';
export const appTdMuted = 'px-4 sm:px-6 py-4 text-sm text-[#6A6A60]';

export const appBadgeActive = 'px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800';
export const appBadgeInactive = 'px-2.5 py-1 rounded-full text-xs font-medium bg-[#1A1A14]/10 text-[#6A6A60]';
export const appBadgeWarning = 'px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800';
export const appBadgeError = 'px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
export const appBadgeInfo = 'px-2.5 py-1 rounded-full text-xs font-medium bg-[#1A1A14]/5 text-[#1A1A14] border border-[#1A1A14]/10';

export const appModalOverlay = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4';
export const appModal = 'bg-white/90 backdrop-blur-md border border-[#1A1A14]/10 rounded-2xl shadow-[0_16px_48px_-12px_rgba(26,26,20,0.2)] w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto';
export const appError = 'text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3';
export const appSuccess = 'text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3';
export const appEmpty = 'p-8 sm:p-12 text-center text-[#6A6A60] text-sm';
export const appLoading = 'p-8 sm:p-12 text-center text-[#6A6A60] text-sm';

export const appTabActive =
  'pb-3 border-b-2 border-[#1A1A14] text-[#1A1A14] font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all duration-200';
export const appTabInactive =
  'pb-3 border-b-2 border-transparent text-[#6A6A60] hover:text-[#1A1A14] font-medium flex items-center gap-1.5 whitespace-nowrap transition-all duration-200';

export const appPagination = 'px-4 py-2 rounded-xl text-sm font-medium border border-[#1A1A14]/10 text-[#1A1A14] hover:bg-[#1A1A14]/5 transition disabled:opacity-50 disabled:cursor-not-allowed';

export const appLabel = 'block text-sm font-medium text-[#1A1A14] mb-1.5';
