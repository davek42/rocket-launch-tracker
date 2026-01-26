/**
 * 🚀 PM2 Ecosystem Configuration for Rocket Launch Tracker
 *
 * This configuration file tells PM2 how to manage the Bun-based Express backend.
 *
 * Key Points:
 * - Uses Bun as the interpreter (NOT Node.js)
 * - Runs in fork mode (Bun doesn't support cluster mode)
 * - Absolute paths used for production reliability
 * - Auto-restart on crashes
 * - Memory limit to prevent runaway processes
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 status
 *   pm2 logs rocket-launches-api
 *   pm2 restart rocket-launches-api
 */

module.exports = {
  apps: [
    {
      // Application name (shown in pm2 status)
      name: 'rocket-launches-api',

      // Script to run
      script: 'src/index.js',

      // Working directory (PM2 will cd here before running)
      cwd: '/var/www/rocket-launches/backend',

      // Interpreter: Use Bun instead of Node.js
      // IMPORTANT: Must use absolute path as PM2 doesn't use user's PATH
      interpreter: '/home/ubuntu/.bun/bin/bun',

      // Execution mode
      // 'fork' - single instance (required for Bun)
      // 'cluster' - multiple instances (NOT supported by Bun)
      exec_mode: 'fork',

      // Number of instances
      // For fork mode, this should always be 1
      instances: 1,

      // Auto-restart on crashes
      autorestart: true,

      // Maximum number of restart attempts in 1 minute
      max_restarts: 10,

      // Minimum uptime before considering the app stable
      min_uptime: '10s',

      // Maximum memory allowed before auto-restart (MB)
      // Prevents memory leaks from crashing the server
      max_memory_restart: '500M',

      // Environment variables for production
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },

      // Environment variables for development (if needed)
      env_development: {
        NODE_ENV: 'development',
        PORT: 3005,
        LOG_LEVEL: 'debug',
      },

      // Logging
      error_file: '/var/log/rocket-launches/pm2-error.log',
      out_file: '/var/log/rocket-launches/pm2-out.log',

      // Combine logs from all instances
      combine_logs: true,

      // Merge stderr and stdout logs
      merge_logs: true,

      // Log date format
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Watch for file changes (disable in production)
      watch: false,

      // Ignore these directories when watching (if watch enabled)
      ignore_watch: [
        'node_modules',
        'data',
        'logs',
        '.git',
      ],

      // Time in ms before forcing a reload
      kill_timeout: 5000,

      // Wait for 'ready' event before considering app online
      wait_ready: false,

      // Listen timeout for ready event
      listen_timeout: 3000,

      // Restart delay (ms) between restarts
      restart_delay: 1000,

      // Enable source map support for better error traces
      source_map_support: false,

      // Instance variables available in the app
      instance_var: 'INSTANCE_ID',

      // Post-deployment commands (optional)
      // These run after PM2 starts/restarts the app
      post_update: [],

      // Graceful shutdown
      // Send SIGINT on reload/restart for graceful shutdown
      kill_signal: 'SIGINT',

      // Additional environment variables loaded from .env file
      // Bun automatically loads .env, so we don't need dotenv
      // PM2 will also load .env from cwd if present
      env_file: '.env',
    },
  ],

  /**
   * PM2 Deploy Configuration (optional)
   *
   * This section can be used for automated deployments from Git.
   * Uncomment and configure if you want to use `pm2 deploy` commands.
   */
  // deploy: {
  //   production: {
  //     user: 'ubuntu',
  //     host: 'your-server-ip',
  //     ref: 'origin/main',
  //     repo: 'https://github.com/yourusername/rocket-launches.git',
  //     path: '/var/www/rocket-launches',
  //     'pre-deploy-local': '',
  //     'post-deploy': 'cd backend && /home/ubuntu/.bun/bin/bun install && cd ../frontend && /home/ubuntu/.bun/bin/bun install && /home/ubuntu/.bun/bin/bun run build && pm2 reload ecosystem.config.js --env production',
  //     'pre-setup': '',
  //   },
  // },
};
