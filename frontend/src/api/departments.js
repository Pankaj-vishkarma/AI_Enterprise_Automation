import client from './client';
import { parsePaginatedResponse } from '../utils/pagination';

async function listDepartments(params) {
  const response = await client.get('/api/v1/departments', { params });
  const page = parsePaginatedResponse(response);
  return {
    ...response,
    data: page.items,
    total: page.total,
    limit: page.limit,
    offset: page.offset,
  };
}

export const departmentsAPI = {
  list: listDepartments,

  get: (id) =>
    client.get(`/api/v1/departments/${id}`),

  create: (data) =>
    client.post('/api/v1/departments', data),

  update: (id, data) =>
    client.patch(`/api/v1/departments/${id}`, data),

  delete: (id) =>
    client.patch(`/api/v1/departments/${id}/disable`),

  disable: (id) =>
    client.patch(`/api/v1/departments/${id}/disable`),

  enable: (id) =>
    client.patch(`/api/v1/departments/${id}/enable`),

  search: (query, params) =>
    listDepartments({ ...params, q: query }),
};
