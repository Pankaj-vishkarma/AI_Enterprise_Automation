import client from './client';

export const permissionsAPI = {
  list: () =>
    client.get('/api/v1/permissions'),

  create: (data) =>
    client.post('/api/v1/permissions', data),

  assignToRole: (roleId, permissionIds) =>
    client.patch(`/api/v1/permissions/roles/${roleId}`, { permission_ids: permissionIds }),
};
