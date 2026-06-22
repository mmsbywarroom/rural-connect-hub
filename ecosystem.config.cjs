module.exports = {
  apps: [
    {
      name: "rural-connect-hub",
      script: "dist/index.cjs",
      instances: 1,
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: "8080",
      },
    },
  ],
};
