import client from './client';

export const analyticsAPI = {
  dashboard: (params) => client.get('/api/v1/analytics/dashboard', { params }),

  overview: () => client.get('/api/v1/analytics/overview'), // legacy operations endpoint

  report: (reportType, params) =>
    client.get(`/api/v1/analytics/reports/${reportType}`, { params }),
};
