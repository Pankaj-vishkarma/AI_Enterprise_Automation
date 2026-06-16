/**
 * Central frontend configuration — all Vite env access goes through this file.
 */
const env = import.meta.env;

export const config = {
  apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:8000',
  appName: env.VITE_APP_NAME || 'AI Enterprise Automation Platform',
  queryStaleTimeMs: Number(env.VITE_QUERY_STALE_TIME_MS) || 5 * 60 * 1000,
  queryRetry: Number(env.VITE_QUERY_RETRY) || 1,
};

export default config;
