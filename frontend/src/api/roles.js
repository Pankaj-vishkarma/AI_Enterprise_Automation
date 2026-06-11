import client from './client';

export const rolesAPI = {
  list: (params) =>
    client.get('/api/v1/roles', { params }),

  get: (id) =>
    client.get(`/api/v1/roles/${id}`),

  create: (data) =>
    client.post('/api/v1/roles', data),

  update: (id, data) =>
    client.patch(`/api/v1/roles/${id}`, data),

  delete: (id) =>
    client.delete(`/api/v1/roles/${id}`),

  assignPermissions: (id, permissionIds) =>
    client.patch(`/api/v1/permissions/roles/${id}`, { permission_ids: permissionIds }),
};

export const permissionsAPI = {
  list: (params) =>
    client.get('/api/v1/permissions', { params }),

  create: (data) =>
    client.post('/api/v1/permissions', data),
};
