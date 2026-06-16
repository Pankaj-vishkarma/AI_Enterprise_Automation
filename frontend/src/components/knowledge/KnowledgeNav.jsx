import { NavLink } from 'react-router-dom';
import { FileText, MessageSquare, Search, BarChart3 } from 'lucide-react';
import { appTabActive, appTabInactive } from '../../styles/appStyles';

const LINKS = [
  { to: '/knowledge/documents', label: 'Documents', icon: FileText },
  { to: '/knowledge/ask-ai', label: 'Ask AI', icon: MessageSquare },
  { to: '/knowledge/search', label: 'Search', icon: Search },
  { to: '/knowledge/history', label: 'Query History', icon: MessageSquare },
  { to: '/knowledge/statistics', label: 'Statistics', icon: BarChart3 },
];

export default function KnowledgeNav() {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition ${isActive ? appTabActive : appTabInactive}`
          }
        >
          <link.icon size={14} />
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}
