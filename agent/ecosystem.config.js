module.exports = {
  apps: [
    {
      name: 'lab-monitoring-agent',
      cwd: __dirname,
      script: 'src/index.js',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};