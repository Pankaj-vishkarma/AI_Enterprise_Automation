import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BrandLogo from '../../pages/landing/components/ui/BrandLogo';
import { BRAND } from '../../pages/landing/constants';
import { useAuth } from '../../context/AuthContext';
import { getSidebarItems } from '../../utils/rbac';

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const { user } = useAuth();
  const menuItems = getSidebarItems(user?.role);

  return (
    <div className="h-full flex flex-col bg-[#F1F0E3] border-r border-[#1A1A14]/[0.08]">
      <div
        className={`shrink-0 h-16 border-b border-[#1A1A14]/[0.08] flex items-center ${
          isOpen ? 'justify-between px-4' : 'justify-center px-2'
        }`}
      >
        {isOpen ? (
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo iconClassName="shadow-[0_0_12px_rgba(240,245,31,0.35)]" />
          </div>
        ) : (
          <div
            className="h-8 w-8 grid place-items-center rounded-lg bg-gradient-to-br from-[#1A1A14] to-[#4B4B42] shadow-[0_0_12px_rgba(240,245,31,0.35)]"
            title={BRAND.fullName}
          >
            <span className="font-bold text-xs text-[#F1F0E3]">{BRAND.shortMark}</span>
          </div>
        )}
        {isOpen && (
          <button
            onClick={onToggle}
            className="shrink-0 text-[#6A6A60] hover:text-[#1A1A14] hover:bg-[#1A1A14]/5 rounded-lg p-1.5 cursor-pointer transition-all duration-200"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {!isOpen && (
        <div className="shrink-0 flex justify-center py-2 border-b border-[#1A1A14]/[0.06]">
          <button
            onClick={onToggle}
            className="text-[#6A6A60] hover:text-[#1A1A14] hover:bg-[#1A1A14]/5 rounded-lg p-1.5 cursor-pointer transition-all duration-200"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <nav className="flex-1 min-h-0 px-2.5 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

          return (
            <Link
              key={item.path}
              to={item.path}
              title={!isOpen ? item.label : undefined}
              className={`flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 ${
                isOpen ? 'px-3' : 'px-2 justify-center'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] font-medium shadow-[0_4px_16px_-4px_rgba(26,26,20,0.22)]'
                  : 'text-[#6A6A60] hover:text-[#1A1A14] hover:bg-[#1A1A14]/5'
              }`}
            >
              <Icon size={18} className="shrink-0" strokeWidth={isActive ? 2.25 : 2} />
              {isOpen && (
                <span className="text-sm font-medium leading-snug truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
