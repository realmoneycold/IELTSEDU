module.exports = {
  apps: [{
    name: 'ieltspractice',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 3000,
    kill_timeout: 5000
  }]
};
