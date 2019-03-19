module.exports = {
  apps : [{
    id: 'mflcards',
    name: 'mlfcards',
    script: './index.js',

    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '100M',
  }]
};