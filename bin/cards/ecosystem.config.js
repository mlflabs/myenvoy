module.exports = {
  apps : [{
    id: 'cards',
    name: 'cards',
    script: './index.js',

    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '100M',
  }]
};