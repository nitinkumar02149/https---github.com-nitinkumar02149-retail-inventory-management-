const defaultTestUri = "mongodb://127.0.0.1:27017/retail_inventory_test";

function getTestDatabaseUri(uri = process.env.MONGODB_TEST_URI || defaultTestUri, { allowRemote = process.env.ALLOW_REMOTE_TEST_DATABASE === "true" } = {}) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("MONGODB_TEST_URI must be a valid MongoDB connection URI.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0] || "");
  if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
    throw new Error("Refusing to run database tests: the database name must clearly include 'test'.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (!allowRemote && !localHosts.has(parsed.hostname)) {
    throw new Error("Refusing to run database tests against a remote host unless ALLOW_REMOTE_TEST_DATABASE=true.");
  }

  return uri;
}

module.exports = { getTestDatabaseUri };