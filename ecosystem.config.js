module.exports = {
  apps : [{
    name: 'api',
    script: 'app.js',

    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
  }]
};