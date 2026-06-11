import client from './client';

export const aiEmployeesAPI = {
  getConfig: () => client.get('/api/v1/ai-employees/meta/config'),
  list: () => client.get('/api/v1/ai-employees'),
  get: (id) => client.get(`/api/v1/ai-employees/${id}`),
  create: (payload) => client.post('/api/v1/ai-employees', payload),
  update: (id, payload) => client.patch(`/api/v1/ai-employees/${id}`, payload),
  enable: (id) => client.post(`/api/v1/ai-employees/${id}/enable`),
  disable: (id) => client.post(`/api/v1/ai-employees/${id}/disable`),
  delete: (id) => client.delete(`/api/v1/ai-employees/${id}`),
  run: (id, task) => client.post(`/api/v1/ai-employees/${id}/run`, { task }),
  listRuns: (id, params) => client.get(`/api/v1/ai-employees/${id}/runs`, { params }),
  getMetrics: (id) => client.get(`/api/v1/ai-employees/${id}/metrics`),
};
