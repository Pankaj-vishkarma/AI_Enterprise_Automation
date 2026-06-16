import client from './client';
import { parsePaginatedResponse } from '../utils/pagination';

async function listUsers(params) {
  const response = await client.get('/api/v1/users', { params });
  const page = parsePaginatedResponse(response);
  return {
    ...response,
    data: page.items,
    total: page.total,
    limit: page.limit,
    offset: page.offset,
  };
}

export const usersAPI = {
  list: listUsers,

  get: (id) =>
    client.get(`/api/v1/users/${id}`),

  create: (data) =>
    client.post('/api/v1/users', data),

  update: (id, data) =>
    client.patch(`/api/v1/users/${id}`, data),

  delete: (id) =>
    client.patch(`/api/v1/users/${id}/disable`),

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
    listUsers({ ...params, q: query }),
};
