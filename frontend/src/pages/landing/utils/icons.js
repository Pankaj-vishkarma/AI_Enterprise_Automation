import {
  Users, Briefcase, Search, LifeBuoy, FileText, Brain, Shield, Coins,
  Zap, BookOpen, BarChart3,
} from 'lucide-react';

export const ICON_MAP = {
  Users,
  Briefcase,
  Search,
  LifeBuoy,
  FileText,
  Brain,
  Shield,
  Coins,
  Zap,
  BookOpen,
  BarChart3,
};

export function getIcon(name) {
  return ICON_MAP[name] || Users;
}
