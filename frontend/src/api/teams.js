import client from './client';

export const teamsAPI = {
  list: (params) =>
    client.get('/api/v1/teams', { params }),

  get: (id) =>
    client.get(`/api/v1/teams/${id}`),

  create: (data) =>
    client.post('/api/v1/teams', data),

  update: (id, data) =>
    client.patch(`/api/v1/teams/${id}`, data),

  delete: (id) =>
    client.patch(`/api/v1/teams/${id}/disable`),

  disable: (id) =>
    client.patch(`/api/v1/teams/${id}/disable`),

  enable: (id) =>
    client.patch(`/api/v1/teams/${id}/enable`),

  search: (query, params) =>
    client.get('/api/v1/teams', { params: { ...params, q: query } }),
};
