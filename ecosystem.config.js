module.exports = {
  apps: [
    {
      name: "myapp",
      script: "./bin/www",
        instances: 'max',  // Cluster mode: max = CPU cores
         // instances: 4,  // Or fixed number
         exec_mode: 'cluster',  // Explicitly use clustering
      env: {
        NODE_ENV: "development",
        PORT: 3009
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3010,
        HTTP_PROXY: "http://192.168.0.220:3128",
        HTTPS_PROXY: "http://192.168.0.220:3128"
      },
       // Auto-restart on crash
         max_memory_restart: '1G',  // Restart if >1GB memory
         // Log config
         error_file: './logs/err.log',
         out_file: './logs/out.log',
         log_file: './logs/combined.log',
         // Other options
         watch: true,  // Don't auto-restart on file changes (for prod)
         ignore_watch: ['node_modules', 'logs']
    }
  ]
}
