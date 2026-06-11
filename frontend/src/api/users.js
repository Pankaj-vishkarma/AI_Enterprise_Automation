import client from './client';

export const usersAPI = {
  list: (params) =>
    client.get('/api/v1/users', { params }),

  get: (id) =>
    client.get(`/api/v1/users/${id}`),

  create: (data) =>
    client.post('/api/v1/users', data),

  update: (id, data) =>
    client.patch(`/api/v1/users/${id}`, data),

  delete: (id) =>
    client.delete(`/api/v1/users/${id}`),

  disable: (id) =>
    client.patch(`/api/v1/users/${id}/disable`),

  enable: (id) =>
    client.patch(`/api/v1/users/${id}/enable`),

  assignDepartment: (id, departmentId) =>
    client.patch(`/api/v1/users/${id}/department`, { department_id: departmentId }),

  assignTeam: (id, teamId) =>
    client.patch(`/api/v1/users/${id}/team`, { team_id: teamId }),

  changeRole: (id, roleId) =>
    client.patch(`/api/v1/users/${id}/role`, { role_id: roleId }),

  search: (query, params) =>
    client.get(`/api/v1/users/search?q=${query}`, { params }),
};
