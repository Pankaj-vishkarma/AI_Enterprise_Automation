import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen h-[100dvh] bg-[#F1F0E3] text-[#1A1A14] overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } h-full shrink-0 overflow-hidden transition-all duration-300 hidden md:block`}
      >
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-auto overflow-x-hidden">
          <div className="p-5 sm:p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
