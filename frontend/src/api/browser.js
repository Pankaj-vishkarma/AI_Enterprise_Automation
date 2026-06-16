import client from './client';

export const browserAPI = {
  getTemplates: () => client.get('/api/v1/browser/templates'),
  getMetrics: () => client.get('/api/v1/browser/metrics'),
  listTasks: (params) => client.get('/api/v1/browser/tasks', { params }),
  getTask: (id) => client.get(`/api/v1/browser/tasks/${id}`),
  run: (payload) => client.post('/api/v1/browser/tasks/run', payload),
  retry: (id) => client.post(`/api/v1/browser/tasks/${id}/retry`),
  delete: (id) => client.delete(`/api/v1/browser/tasks/${id}`),
};
