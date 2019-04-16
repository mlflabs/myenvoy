module.exports = {
  apps : [{
    id: 'api',
    name: 'api',
    script: './index.js',

    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '100M',
  }]
};