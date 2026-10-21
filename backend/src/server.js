require("./config/env");

const app = require("./app");
const { connectDatabase, disconnectDatabase } = require("./config/database");

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  await connectDatabase();

  const server = app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
  });

  async function shutdown() {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("The API server could not start. Check the MongoDB replica-set configuration, database availability, and JWT secret.");
  console.error(error?.message || error);
  process.exitCode = 1;
});