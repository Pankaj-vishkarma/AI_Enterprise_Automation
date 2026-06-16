import client from './client';

export const organizationsAPI = {
  list: (params) => client.get('/api/v1/organizations', { params }),
  get: (id) => client.get(`/api/v1/organizations/${id}`),
  update: (id, payload) => client.patch(`/api/v1/organizations/${id}`, payload),
};
