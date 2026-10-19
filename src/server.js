require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDatabase();
  } catch {
    console.error(
      "The API will not start because the configured database connection failed."
    );
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Avanta Living API running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  function shutdown(signal) {
    console.log(`${signal} received. Shutting down...`);

    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Graceful shutdown timed out.");
      process.exit(1);
    }, 10000).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer();