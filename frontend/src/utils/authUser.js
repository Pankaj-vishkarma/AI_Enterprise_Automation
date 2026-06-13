/** Normalize /auth/me snake_case fields for UI components. */
export function normalizeAuthUser(userData) {
  if (!userData) return null;
  return {
    ...userData,
    firstName: userData.first_name,
    lastName: userData.last_name,
    fullName: userData.full_name,
    organizationName: userData.organization_name,
    createdAt: userData.created_at,
    lastLogin: userData.last_login,
  };
}
