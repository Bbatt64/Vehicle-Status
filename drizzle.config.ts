// PM2 process manager config.
// Use with: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "vehicle-dashboard",
      script: "dist/index.cjs",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        // Set the rest of your variables in a .env file or via your
        // hosting provider; PM2 will inherit them.
      },
    },
  ],
};
