import client from './client';

export const knowledgeAPI = {
  // Documents
  listDocuments: (params) =>
    client.get('/api/v1/knowledge/documents', { params }),

  getDocument: (id) =>
    client.get(`/api/v1/knowledge/documents/${id}`),

  uploadDocument: (title, documentType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/api/v1/knowledge/upload?title=${encodeURIComponent(title)}&document_type=${encodeURIComponent(documentType)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteDocument: (id) =>
    client.patch(`/api/v1/knowledge/documents/${id}/disable`),

  getDocumentChunks: (id, params) =>
    client.get(`/api/v1/knowledge/documents/${id}/chunks`, { params }),

  // Search
  search: (query, params) =>
    client.get('/api/v1/knowledge/search', {
      params: { ...params, q: query },
    }),

  // Queries
  listQueries: (params) =>
    client.get('/api/v1/knowledge/query-history', { params }),

  createQuery: (data) =>
    client.post('/api/v1/knowledge/query', data),

  getQuery: (id) =>
    client.get(`/api/v1/knowledge/queries/${id}`),

  deleteQuery: (id) =>
    client.delete(`/api/v1/knowledge/queries/${id}`),

  // Statistics
  getStatistics: () =>
    client.get('/api/v1/knowledge/statistics'),

  retryIngest: (id) =>
    client.post(`/api/v1/knowledge/documents/${id}/retry-ingest`),
};
