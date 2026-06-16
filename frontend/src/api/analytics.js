import client from './client';

export const analyticsAPI = {
  dashboard: (params) => client.get('/api/v1/analytics/dashboard', { params }),

  report: (reportType, params) =>
    client.get(`/api/v1/analytics/reports/${reportType}`, { params }),

  exportReport: (reportType, params) =>
    client.get(`/api/v1/analytics/reports/${reportType}/export`, {
      params,
      responseType: 'blob',
    }),
};
