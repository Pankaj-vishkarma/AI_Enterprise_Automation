import client from './client';

export const voiceAPI = {
  createSession: (assistantPreference) =>
    client.post('/api/v1/voice/sessions', { assistant_preference: assistantPreference || null }),
  listSessions: (limit = 50) =>
    client.get('/api/v1/voice/sessions', { params: { limit } }),
  getSession: (id) => client.get(`/api/v1/voice/sessions/${id}`),
  closeSession: (id) => client.patch(`/api/v1/voice/sessions/${id}/close`),
  query: (payload) => client.post('/api/v1/voice/query', payload),
  listInteractions: (limit = 100) =>
    client.get('/api/v1/voice/interactions', { params: { limit } }),
  listMeetings: (limit = 50) =>
    client.get('/api/v1/voice/meetings', { params: { limit } }),
  createMeeting: (payload) => client.post('/api/v1/voice/meetings', payload),
  analytics: () => client.get('/api/v1/voice/analytics'),
};
