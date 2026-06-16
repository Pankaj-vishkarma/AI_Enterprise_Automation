import client from './client';

export const researchAPI = {
  getTemplates: () => client.get('/api/v1/research/templates'),
  getMetrics: () => client.get('/api/v1/research/metrics'),
  list: (params) => client.get('/api/v1/research', { params }),
  get: (id) => client.get(`/api/v1/research/${id}`),
  run: (payload) => client.post('/api/v1/research/run', payload),
  delete: (id) => client.delete(`/api/v1/research/${id}`),
  exportReport: (id, format = 'pdf') =>
    client.get(`/api/v1/research/${id}/export`, {
      params: { format },
      responseType: 'blob',
    }),
};
