const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const express = require("express");

process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN = "http://localhost:3000,http://localhost:3001";

const app = require("../app");
const ApiError = require("../utils/api-error");
const { errorHandler } = require("../middleware/error-handler");
const { notFoundHandler } = require("../middleware/not-found");
const { validateRequest } = require("../middleware/validate-request");
const { getTestDatabaseUri } = require("./test-database");

test("database integration tests reject production-like or remote databases by default", () => {
  assert.throws(() => getTestDatabaseUri("mongodb://127.0.0.1:27017/retail_inventory"), /database name must clearly include 'test'/);
  assert.throws(() => getTestDatabaseUri("mongodb://db.example.com/retail_inventory_test"), /remote host/);
  assert.equal(getTestDatabaseUri("mongodb://127.0.0.1:27017/retail_inventory_test"), "mongodb://127.0.0.1:27017/retail_inventory_test");
});

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("GET /api/health returns a successful JSON response", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    success: true,
    message: "Retail inventory API is running.",
    data: { status: "ok" },
  });
});

test("unknown API routes return the shared 404 error shape", async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "ROUTE_NOT_FOUND");
  assert.equal("stack" in body, false);
});

test("malformed JSON returns a safe 400 response", async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{invalid json",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_JSON");
  assert.equal(body.message, "Request body contains invalid JSON.");
});

test("unexpected errors hide internal details", async (context) => {
  const testApp = express();
  testApp.get("/failure", (req, res, next) => next(new Error("private database detail")));
  testApp.use(notFoundHandler);
  testApp.use(errorHandler);
  const testServer = testApp.listen(0);
  context.after(() => new Promise((resolve) => testServer.close(resolve)));
  await new Promise((resolve) => testServer.once("listening", resolve));

  const response = await fetch(`http://127.0.0.1:${testServer.address().port}/failure`);
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.message, "An unexpected error occurred.");
  assert.equal(body.error.code, "INTERNAL_SERVER_ERROR");
  assert.equal(JSON.stringify(body).includes("private database detail"), false);
  assert.equal(JSON.stringify(body).includes("stack"), false);
});

test("request validation returns field-level 400 errors", async (context) => {
  const testApp = express();
  testApp.use(express.json());
  testApp.post("/validate", validateRequest({ body: { name: { required: true, type: "string", maxLength: 20 } } }), (req, res) => res.json({ success: true }));
  testApp.use(notFoundHandler);
  testApp.use(errorHandler);
  const testServer = testApp.listen(0);
  context.after(() => new Promise((resolve) => testServer.close(resolve)));
  await new Promise((resolve) => testServer.once("listening", resolve));

  const response = await fetch(`http://127.0.0.1:${testServer.address().port}/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "" }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.deepEqual(body.error.details, [{ field: "name", message: "This field is required." }]);
});

test("CORS allows the local frontend on port 3001", async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { origin: "http://localhost:3001" },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3001");
});