import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Menu, LogOut, User } from 'lucide-react';

export default function TopNav({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  return (
    <header className="shrink-0 h-16 bg-[#F1F0E3]/90 backdrop-blur-md border-b border-[#1A1A14]/[0.08] px-4 sm:px-6 flex items-center justify-between">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-[#6A6A60] hover:text-[#1A1A14] hover:bg-[#1A1A14]/5 rounded-lg p-2 transition-all duration-200"
        aria-label="Toggle menu"
      >
        <Menu size={22} />
      </button>

      {/* Spacer on desktop */}
      <div className="hidden md:block" />

      {/* User menu */}
      <div className="flex items-center gap-4 ml-auto">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-[#1A1A14]/5 text-[#1A1A14] transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1A1A14] to-[#4B4B42] flex items-center justify-center text-[#F1F0E3] font-semibold text-xs shadow-[0_0_12px_rgba(240,245,31,0.25)]">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-sm font-medium text-[#1A1A14] truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-[#6A6A60] truncate max-w-[180px]">{user?.email}</p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close menu"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#1A1A14]/10 bg-white/80 backdrop-blur-md shadow-[0_8px_32px_-8px_rgba(26,26,20,0.18)] z-50 overflow-hidden">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#1A1A14] hover:bg-[#1A1A14]/5 flex items-center gap-2.5 transition-colors duration-200 border-b border-[#1A1A14]/[0.06]"
                >
                  <User size={16} className="text-[#6A6A60]" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors duration-200"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
