import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen h-[100dvh] bg-[#F1F0E3] text-[#1A1A14] overflow-hidden">
      {/* Sidebar — desktop & tablet */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } h-full shrink-0 overflow-hidden transition-all duration-300 hidden md:block`}
      >
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Sidebar — mobile drawer */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] md:hidden shadow-[8px_0_32px_-8px_rgba(26,26,20,0.2)]">
            <Sidebar isOpen onToggle={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onMenuClick={() => setMobileMenuOpen((open) => !open)} />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 overflow-auto overflow-x-hidden p-5 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl flex-1 flex flex-col min-h-0">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
