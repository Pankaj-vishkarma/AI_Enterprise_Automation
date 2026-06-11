import client from './client';

export const workflowsAPI = {
  getTemplates: () => client.get('/api/v1/workflows/templates'),
  getMetrics: () => client.get('/api/v1/workflows/metrics'),
  list: () => client.get('/api/v1/workflows'),
  get: (id) => client.get(`/api/v1/workflows/${id}`),
  create: (payload) => client.post('/api/v1/workflows', payload),
  update: (id, payload) => client.patch(`/api/v1/workflows/${id}`, payload),
  disable: (id) => client.post(`/api/v1/workflows/${id}/disable`),
  delete: (id) => client.delete(`/api/v1/workflows/${id}`),
  start: (id, title) => client.post(`/api/v1/workflows/${id}/start`, { title }),
  listInstances: (params) => client.get('/api/v1/workflows/instances/list', { params }),
  getInstance: (id) => client.get(`/api/v1/workflows/instances/${id}`),
  approveStep: (instanceId, stepId, comment) =>
    client.post(`/api/v1/workflows/instances/${instanceId}/steps/${stepId}/approve`, { comment }),
  rejectStep: (instanceId, stepId, comment) =>
    client.post(`/api/v1/workflows/instances/${instanceId}/steps/${stepId}/reject`, { comment }),
  cancelInstance: (id) => client.post(`/api/v1/workflows/instances/${id}/cancel`),
  listNotifications: (unreadOnly = false) =>
    client.get('/api/v1/workflows/notifications/me', { params: { unread_only: unreadOnly } }),
  markNotificationRead: (id) => client.post(`/api/v1/workflows/notifications/${id}/read`),
};
