module.exports = {
  apps: [{
    name: 'thuchi-app',
    script: 'npm',
    args: 'start',
    cwd: '/home/user/thuchi', // Đổi path theo server
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Thêm các environment variables khác nếu cần
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    log_file: '/var/log/pm2/thuchi-combined.log',
    out_file: '/var/log/pm2/thuchi-out.log',
    error_file: '/var/log/pm2/thuchi-error.log',
    time: true
  }]
} 