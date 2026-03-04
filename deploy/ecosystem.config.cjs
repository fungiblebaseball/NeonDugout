module.exports = {
  apps: [
    {
      name: "neondugout",
      script: "dist/index.cjs",
      cwd: "/opt/neondugout",
      node_args: "--max-old-space-size=460",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_restarts: 15,
      min_uptime: "10s",
      restart_delay: 5000,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "5000",
      },
      output: "/var/log/neondugout/app-out.log",
      error: "/var/log/neondugout/app-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
};
