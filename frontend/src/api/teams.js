import client from './client';
import { parsePaginatedResponse } from '../utils/pagination';

async function listTeams(params) {
  const response = await client.get('/api/v1/teams', { params });
  const page = parsePaginatedResponse(response);
  return {
    ...response,
    data: page.items,
    total: page.total,
    limit: page.limit,
    offset: page.offset,
  };
}

export const teamsAPI = {
  list: listTeams,

  get: (id) =>
    client.get(`/api/v1/teams/${id}`),

  create: (data) =>
    client.post('/api/v1/teams', data),

  update: (id, data) =>
    client.patch(`/api/v1/teams/${id}`, data),

  delete: (id) =>
    client.patch(`/api/v1/teams/${id}/disable`),

  disable: (id) =>
    client.patch(`/api/v1/teams/${id}/disable`),

  enable: (id) =>
    client.patch(`/api/v1/teams/${id}/enable`),

  search: (query, params) =>
    listTeams({ ...params, q: query }),
};
