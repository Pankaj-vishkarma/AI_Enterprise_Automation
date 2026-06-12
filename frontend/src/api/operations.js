import client from './client';

export const operationsAPI = {
  list: (module) => client.get(`/api/v1/operations/${module}`),
  create: (module, payload) => client.post(`/api/v1/operations/${module}`, payload),
  update: (module, id, payload) => client.patch(`/api/v1/operations/${module}/${id}`, payload),
  runCollaboration: (task, teamId) => client.post('/api/v1/collaboration/run', { team_id: teamId, task }),
  runAIEmployee: (id, task) => client.post(`/api/v1/ai-employees/${id}/run`, { task }), // delegates to dedicated AI employee API
  runResearch: (prompt) => client.post('/api/v1/research/run', { request_text: prompt }),
  runBrowserTask: (prompt) => client.post('/api/v1/browser/tasks/run', { instruction: prompt, task_type: 'general' }),
  voiceQuery: (transcript, options = {}) =>
    client.post('/api/v1/voice/query', { transcript, ...options }),
  analytics: () => client.get('/api/v1/analytics/overview'),
};
