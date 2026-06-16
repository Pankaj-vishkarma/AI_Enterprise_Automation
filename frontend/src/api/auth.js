import client from './client';

export const authAPI = {
  login: (email, password) =>
    client.post('/api/v1/auth/login', { email, password }),

  register: (data) =>
    client.post('/api/v1/auth/register', {
      organization_name: data.organization_name,
      first_name: data.first_name,
      last_name: data.last_name || null,
      email: data.email,
      password: data.password,
    }),

  forgotPassword: (email) =>
    client.post('/api/v1/auth/forgot-password', { email }),

  resetPassword: (token, password) =>
    client.post('/api/v1/auth/reset-password', { token, password }),

  refreshToken: (refreshToken) =>
    client.post('/api/v1/auth/refresh', { refresh_token: refreshToken }),

  logout: (refreshToken) =>
    client.post('/api/v1/auth/logout', { refresh_token: refreshToken }),

  logoutAll: () =>
    client.post('/api/v1/auth/logout-all'),

  getCurrentUser: () =>
    client.get('/api/v1/auth/me'),

  getProfile: () =>
    client.get('/api/v1/auth/me'),

  updateProfile: (data) =>
    client.patch('/api/v1/auth/me', data),

  changePassword: (currentPassword, newPassword) =>
    client.post('/api/v1/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};
