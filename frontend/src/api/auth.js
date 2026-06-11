import client from './client';

export const authAPI = {
  login: (email, password) =>
    client.post('/api/v1/auth/login', { email, password }),

  register: (data) =>
    client.post('/api/v1/auth/register', data),

  forgotPassword: (email) =>
    client.post('/api/v1/auth/forgot-password', { email }),

  resetPassword: (token, password, passwordConfirmation) =>
    client.post('/api/v1/auth/reset-password', {
      token,
      password,
      passwordConfirmation,
    }),

  refreshToken: (refreshToken) =>
    client.post('/api/v1/auth/refresh', { refresh_token: refreshToken }),

  logoutAll: () =>
    client.post('/api/v1/auth/logout-all'),

  getCurrentUser: () =>
    client.get('/api/v1/auth/me'),
};
