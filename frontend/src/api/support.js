import client from './client';

export const supportAPI = {
  listCategories: () => client.get('/api/v1/support/categories'),

  listTickets: (params) => client.get('/api/v1/support/tickets', { params }),

  getTicket: (id) => client.get(`/api/v1/support/tickets/${id}`),

  createTicket: (data) => client.post('/api/v1/support/tickets', data),

  updateTicket: (id, data) => client.patch(`/api/v1/support/tickets/${id}`, data),

  assignTicket: (id, data) => client.post(`/api/v1/support/tickets/${id}/assign`, data),

  escalateTicket: (id, data) => client.post(`/api/v1/support/tickets/${id}/escalate`, data),

  closeTicket: (id) => client.post(`/api/v1/support/tickets/${id}/close`),

  reopenTicket: (id) => client.post(`/api/v1/support/tickets/${id}/reopen`),

  regenerateRecommendation: (id) => client.post(`/api/v1/support/tickets/${id}/recommend`),

  metrics: () => client.get('/api/v1/support/metrics'),
};
