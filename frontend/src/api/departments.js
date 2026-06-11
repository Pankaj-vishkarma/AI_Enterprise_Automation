import client from './client';

export const departmentsAPI = {
  list: (params) =>
    client.get('/api/v1/departments', { params }),

  get: (id) =>
    client.get(`/api/v1/departments/${id}`),

  create: (data) =>
    client.post('/api/v1/departments', data),

  update: (id, data) =>
    client.patch(`/api/v1/departments/${id}`, data),

  delete: (id) =>
    client.delete(`/api/v1/departments/${id}`),

  disable: (id) =>
    client.patch(`/api/v1/departments/${id}/disable`),

  enable: (id) =>
    client.patch(`/api/v1/departments/${id}/enable`),

  search: (query, params) =>
    client.get(`/api/v1/departments/search?q=${query}`, { params }),
};
