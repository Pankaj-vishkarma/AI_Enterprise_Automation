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
    client.delete(`/api/v1/teams/${id}`),

  disable: (id) =>
    client.patch(`/api/v1/teams/${id}/disable`),

  enable: (id) =>
    client.patch(`/api/v1/teams/${id}/enable`),

  addMember: (id, userId) =>
    client.post(`/api/v1/teams/${id}/add-member`, { userId }),

  removeMember: (id, userId) =>
    client.post(`/api/v1/teams/${id}/remove-member`, { userId }),

  search: (query, params) =>
    client.get(`/api/v1/teams/search?q=${query}`, { params }),
};
