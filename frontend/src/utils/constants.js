export const API_ENDPOINTS = {
  AUTH: '/api/v1/auth',
  USERS: '/api/v1/users',
  DEPARTMENTS: '/api/v1/departments',
  TEAMS: '/api/v1/teams',
  ROLES: '/api/v1/roles',
  PERMISSIONS: '/api/v1/permissions',
  KNOWLEDGE: '/api/v1/knowledge',
  CONVERSATIONS: '/api/v1/conversations',
};

export const ROUTE_PATHS = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  USER_DETAILS: '/users/:id',
  CREATE_USER: '/users/create',
  EDIT_USER: '/users/:id/edit',
  DEPARTMENTS: '/departments',
  TEAMS: '/teams',
  ROLES: '/roles',
  PERMISSIONS: '/permissions',
  KNOWLEDGE: '/knowledge',
  DOCUMENTS: '/knowledge/documents',
  UPLOAD_DOCUMENT: '/knowledge/upload',
  SEARCH: '/knowledge/search',
  ASK_AI: '/knowledge/ask-ai',
  CONVERSATIONS: '/conversations',
  CHAT: '/conversations/:id',
};

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
};

export const PERMISSIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
};
