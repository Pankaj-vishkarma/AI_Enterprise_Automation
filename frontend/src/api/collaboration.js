import client from './client';

export const collaborationAPI = {
  listTeams: () => client.get('/api/v1/collaboration/teams'),
  getTeam: (id) => client.get(`/api/v1/collaboration/teams/${id}`),
  createTeam: (payload) => client.post('/api/v1/collaboration/teams', payload),
  updateTeam: (id, payload) => client.patch(`/api/v1/collaboration/teams/${id}`, payload),
  deleteTeam: (id) => client.delete(`/api/v1/collaboration/teams/${id}`),
  run: (teamId, task) => client.post('/api/v1/collaboration/run', { team_id: teamId, task }),
  listRuns: (params) => client.get('/api/v1/collaboration/runs', { params }),
  getRun: (id) => client.get(`/api/v1/collaboration/runs/${id}`),
  getMetrics: () => client.get('/api/v1/collaboration/metrics'),
};
