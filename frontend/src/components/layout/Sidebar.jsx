import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Bot,
  GitMerge,
  Layers,
  Compass,
  Globe,
  Mic,
  LifeBuoy,
  MessageCircle,
  BarChart3,
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/organization-management', label: 'Organization & User Management', icon: Users },
  { path: '/knowledge', label: 'Knowledge Intelligence Platform', icon: BookOpen },
  { path: '/employees', label: 'AI Employee Studio', icon: Bot },
  { path: '/collaboration', label: 'Multi-Agent Collaboration', icon: GitMerge },
  { path: '/workflows', label: 'Workflow Automation Platform', icon: Layers },
  { path: '/research', label: 'Business Research Hub', icon: Compass },
  { path: '/browser-automation', label: 'Browser Automation Hub', icon: Globe },
  { path: '/voice-ai', label: 'Voice AI Platform', icon: Mic },
  { path: '/support', label: 'Customer Support Platform', icon: LifeBuoy },
  { path: '/omnichannel', label: 'Omnichannel Communication Center', icon: MessageCircle },
  { path: '/analytics', label: 'Analytics & Reporting', icon: BarChart3 },
];

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();

  return (
    <div className="h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo area */}
      <div className="h-16 border-b border-sidebar-border flex items-center justify-between px-4">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">AI</span>
            </div>
            <span className="font-bold text-sidebar-foreground">Automation</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent rounded-lg p-1 cursor-pointer"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon size={20} />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
