import client from './client';

export const conversationsAPI = {
  list: (params) =>
    client.get('/api/v1/conversations', { params }),

  get: (id) =>
    client.get(`/api/v1/conversations/${id}`),

  create: (data) =>
    client.post('/api/v1/conversations', data),

  update: (id, data) =>
    client.put(`/api/v1/conversations/${id}`, data),

  delete: (id) =>
    client.delete(`/api/v1/conversations/${id}`),

  getMessages: (id, params) =>
    client.get(`/api/v1/conversations/${id}/messages`, { params }),

  sendMessage: (id, data) =>
    client.post(`/api/v1/conversations/${id}/messages`, data),

  search: (query, params) =>
    client.get(`/api/v1/conversations/search?q=${query}`, { params }),
};
