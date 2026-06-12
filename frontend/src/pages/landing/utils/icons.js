import {
  Users, Briefcase, Search, LifeBuoy, FileText, Brain, Shield, Coins,
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
};

export function getIcon(name) {
  return ICON_MAP[name] || Users;
}
