import client from './client';

export const omnichannelAPI = {
  listChannels: () => client.get('/api/v1/omnichannel/channels'),

  listConversations: (params) => client.get('/api/v1/omnichannel/conversations', { params }),

  getConversation: (id) => client.get(`/api/v1/omnichannel/conversations/${id}`),

  createConversation: (data) => client.post('/api/v1/omnichannel/conversations', data),

  updateConversation: (id, data) => client.patch(`/api/v1/omnichannel/conversations/${id}`, data),

  postMessage: (id, data) => client.post(`/api/v1/omnichannel/conversations/${id}/messages`, data),

  handoff: (id, data) => client.post(`/api/v1/omnichannel/conversations/${id}/handoff`, data),

  returnToAi: (id) => client.post(`/api/v1/omnichannel/conversations/${id}/return-to-ai`),

  regenerateSuggestion: (id) => client.post(`/api/v1/omnichannel/conversations/${id}/suggest`),

  refreshContext: (id) => client.post(`/api/v1/omnichannel/conversations/${id}/context`),

  generateSummary: (id) => client.post(`/api/v1/omnichannel/conversations/${id}/summary`),

  createSupportTicket: (id) => client.post(`/api/v1/omnichannel/conversations/${id}/support-ticket`),

  ingestInbound: (data) => client.post('/api/v1/omnichannel/inbound', data),
};
