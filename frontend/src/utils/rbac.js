import {
  LayoutDashboard,
  Users,
  BookOpen,
  Bot,
  GitMerge,
  Layers,
  Compass,
  Globe,
  Mic,
  LifeBuoy,
  MessageCircle,
  BarChart3,
  Network,
} from 'lucide-react';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

export const ALL_ROLES = Object.values(ROLES);
export const ELEVATED_ROLES = [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.MANAGER];

export const PERMISSIONS = {
  VIEW_ROLES: 'VIEW_ROLES',
  MANAGE_USER_ROLES: 'MANAGE_USER_ROLES',
  VIEW_TEAMS: 'VIEW_TEAMS',
  MANAGE_TEAMS: 'MANAGE_TEAMS',
  VIEW_PERMISSIONS: 'VIEW_PERMISSIONS',
  MANAGE_PERMISSIONS: 'MANAGE_PERMISSIONS',
  MANAGE_ROLE_PERMISSIONS: 'MANAGE_ROLE_PERMISSIONS',
  MANAGE_USER_ASSIGNMENTS: 'MANAGE_USER_ASSIGNMENTS',
  MANAGE_DEPARTMENTS: 'MANAGE_DEPARTMENTS',
  KNOWLEDGE_VIEW: 'KNOWLEDGE_VIEW',
  KNOWLEDGE_MANAGE: 'KNOWLEDGE_MANAGE',
  KNOWLEDGE_ASK: 'KNOWLEDGE_ASK',
  AI_EMPLOYEE_USE: 'AI_EMPLOYEE_USE',
  AI_EMPLOYEE_MANAGE: 'AI_EMPLOYEE_MANAGE',
  COLLABORATION_USE: 'COLLABORATION_USE',
  COLLABORATION_MANAGE: 'COLLABORATION_MANAGE',
  WORKFLOW_USE: 'WORKFLOW_USE',
  WORKFLOW_MANAGE: 'WORKFLOW_MANAGE',
  WORKFLOW_APPROVE: 'WORKFLOW_APPROVE',
  RESEARCH_ACCESS: 'RESEARCH_ACCESS',
  BROWSER_ACCESS: 'BROWSER_ACCESS',
  VOICE_ACCESS: 'VOICE_ACCESS',
  SUPPORT_VIEW: 'SUPPORT_VIEW',
  SUPPORT_MANAGE: 'SUPPORT_MANAGE',
  OMNICHANNEL_VIEW: 'OMNICHANNEL_VIEW',
  OMNICHANNEL_MANAGE: 'OMNICHANNEL_MANAGE',
  ANALYTICS_VIEW: 'ANALYTICS_VIEW',
};

const ROUTE_RULES = [
  { pattern: /^\/dashboard$/, roles: ALL_ROLES },
  { pattern: /^\/profile$/, roles: ALL_ROLES },
  { pattern: /^\/organization-management$/, roles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN] },
  { pattern: /^\/users$/, roles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN] },
  { pattern: /^\/departments$/, roles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN] },
  { pattern: /^\/teams$/, roles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.MANAGER] },
  { pattern: /^\/roles$/, roles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN] },
  { pattern: /^\/permissions$/, roles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN] },
  { pattern: /^\/knowledge(\/.*)?$/, roles: ALL_ROLES },
  { pattern: /^\/employees(\/.*)?$/, roles: ALL_ROLES },
  { pattern: /^\/collaboration$/, roles: ELEVATED_ROLES },
  { pattern: /^\/workflows(\/.*)?$/, roles: ELEVATED_ROLES },
  { pattern: /^\/research(\/.*)?$/, roles: ELEVATED_ROLES },
  { pattern: /^\/browser-automation(\/.*)?$/, roles: ELEVATED_ROLES },
  { pattern: /^\/voice-ai$/, roles: ALL_ROLES },
  { pattern: /^\/support$/, roles: ALL_ROLES },
  { pattern: /^\/omnichannel$/, roles: ALL_ROLES },
  { pattern: /^\/analytics$/, roles: ELEVATED_ROLES },
  { pattern: /^\/conversations$/, roles: ELEVATED_ROLES },
];

export const SIDEBAR_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_ROLES },
  {
    path: '/organization-management',
    label: 'Organization Management',
    icon: Users,
    roles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
  },
  {
    path: '/teams',
    label: 'Team Management',
    icon: Network,
    roles: [ROLES.MANAGER],
  },
  { path: '/knowledge', label: 'Knowledge', icon: BookOpen, roles: ALL_ROLES },
  { path: '/employees', label: 'AI Employees', icon: Bot, roles: ALL_ROLES },
  {
    path: '/collaboration',
    label: 'Collaboration',
    icon: GitMerge,
    roles: ELEVATED_ROLES,
  },
  {
    path: '/workflows',
    label: 'Workflow',
    icon: Layers,
    roles: ELEVATED_ROLES,
  },
  {
    path: '/research',
    label: 'Research',
    icon: Compass,
    roles: ELEVATED_ROLES,
  },
  {
    path: '/browser-automation',
    label: 'Browser',
    icon: Globe,
    roles: ELEVATED_ROLES,
  },
  { path: '/voice-ai', label: 'Voice', icon: Mic, roles: ALL_ROLES },
  { path: '/support', label: 'Support', icon: LifeBuoy, roles: ALL_ROLES },
  { path: '/omnichannel', label: 'Omnichannel', icon: MessageCircle, roles: ALL_ROLES },
  {
    path: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    roles: ELEVATED_ROLES,
  },
];

export function hasRole(user, ...allowedRoles) {
  const role = user?.role;
  if (!role) return false;
  if (role === ROLES.SUPER_ADMIN) return true;
  return allowedRoles.includes(role);
}

export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

export function hasAnyPermission(user, permissions = []) {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function canAccessRoute(pathname, role) {
  if (!role) return false;
  if (role === ROLES.SUPER_ADMIN) return true;
  const rule = ROUTE_RULES.find((entry) => entry.pattern.test(pathname));
  if (!rule) return true;
  return rule.roles.includes(role);
}

export function getSidebarItems(role) {
  if (!role) return [];
  if (role === ROLES.SUPER_ADMIN) return SIDEBAR_ITEMS;
  return SIDEBAR_ITEMS.filter((item) => item.roles.includes(role));
}

export function getDashboardConfig(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return {
        title: 'Platform Overview',
        description: 'Cross-organization activity and platform health at a glance.',
        scope: 'platform',
      };
    case ROLES.ORG_ADMIN:
      return {
        title: 'Organization Overview',
        description: 'Your organization performance, teams, and operational metrics.',
        scope: 'organization',
      };
    case ROLES.MANAGER:
      return {
        title: 'Team Overview',
        description: 'Team workload, collaboration activity, and support queue.',
        scope: 'team',
      };
    default:
      return {
        title: 'Personal Overview',
        description: 'Your knowledge activity, support tickets, and assigned conversations.',
        scope: 'personal',
      };
  }
}
