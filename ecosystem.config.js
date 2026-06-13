module.exports = {
  apps: [
    {
      name: 'ai-enterprise-api',
      cwd: './server',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'python',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        AUTO_CREATE_TABLES: 'false',
        START_EMBEDDING_WORKER_IN_API: 'false',
        LOG_LEVEL: 'INFO',
      },
    },
    {
      name: 'ai-enterprise-embedding-worker',
      cwd: './server',
      script: 'python',
      args: '-m tasks.embedding_worker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        LOG_LEVEL: 'INFO',
      },
    },
  ],
};
