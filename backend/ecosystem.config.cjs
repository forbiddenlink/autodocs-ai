module.exports = {
  apps: [
    {
      name: "autodocs-backend",
      script: "./src/index.js",
      instances: 2, // Run 2 instances for load balancing
      exec_mode: "cluster", // Use cluster mode for zero-downtime
      watch: false, // Disable in production
      max_memory_restart: "500M", // Restart if memory exceeds 500MB
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 3001,
      },
      // Zero-downtime deployment configuration
      wait_ready: true, // Wait for app to send 'ready' signal
      listen_timeout: 10000, // Wait up to 10s for app to be ready
      kill_timeout: 30000, // Give 30s for graceful shutdown (matches our code)
      shutdown_with_message: false,
      // Automatic restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
      // Logging
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Health check configuration
      health_check: {
        enable: true,
        interval: 30000, // Check every 30s
        path: "/readiness",
        port: 3001,
      },
    },
  ],

  deploy: {
    production: {
      user: "deploy",
      host: ["production-server-1", "production-server-2"],
      ref: "origin/main",
      repo: "git@github.com:username/autodocs-ai.git",
      path: "/var/www/autodocs-ai",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.cjs --env production",
      "pre-setup": "",
    },
    staging: {
      user: "deploy",
      host: "staging-server",
      ref: "origin/develop",
      repo: "git@github.com:username/autodocs-ai.git",
      path: "/var/www/autodocs-ai-staging",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.cjs --env staging",
      "pre-setup": "",
    },
  },
};
