module.exports = {
  apps: [

    {
      name: "ai-system-api",
      script: "./src/server.js",
      cwd: "/home/lauro/ai-system-2.0",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production"
      }
    },

    {
      name: "openclaw-gateway",
      script: "openclaw",
      args: "gateway",
      autorestart: true,
      watch: false
    }

  ]
};
