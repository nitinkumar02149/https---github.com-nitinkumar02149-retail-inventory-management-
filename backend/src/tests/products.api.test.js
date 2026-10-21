const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";
const { getTestDatabaseUri } = require("./test-database");
process.env.MONGODB_URI = getTestDatabaseUri();
process.env.JWT_SECRET = "test-only-secret-value-at-least-32-characters";

const app = require("../app");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const InventoryMovement = require("../models/inventory-movement.model");
const Sale = require("../models/sale.model");
const productService = require("../services/product.service");

const testPrefix = `TEST-${randomUUID().toUpperCase()}`;
let server;
let baseUrl;
let adminCookie;
let adminId;
let staffCookie;
let staffId;
const productIds = [];
const movementIds = [];
const saleIds = [];

async function api(path, options = {}) {
  const { authCookie, ...requestOptions } = options;
  const headers = { "content-type": "application/json", ...requestOptions.headers };
  const cookie = authCookie === undefined ? adminCookie : authCookie;
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, {
    ...requestOptions,
    headers,
  });
  return { response, body: await response.json() };
}

async function login(email, password) {
  const result = await api("/api/auth/login", { method: "POST", authCookie: null, body: JSON.stringify({ email, password }) });
  return { ...result, cookie: result.response.headers.get("set-cookie")?.split(";")[0] };
}

function productPayload(overrides = {}) {
  return {
    sku: `${testPrefix}-LOW`,
    name: `Canvas Shop Apron ${testPrefix.slice(-6)}`,
    category: "Accessories",
    purchasePrice: 12.5,
    sellingPrice: 29.99,
    stock: 2,
    reorderLevel: 5,
    ...overrides,
  };
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Product.init();
  await User.init();
  await Sale.init();
  const passwordHash = await bcrypt.hash("Test-password-2026", 4);
  const users = await User.create([
    { name: "API Test Admin", email: `${testPrefix.toLowerCase()}-admin@example.test`, passwordHash, role: "Admin" },
    { name: "API Test Staff", email: `${testPrefix.toLowerCase()}-staff@example.test`, passwordHash, role: "Staff" },
    { name: "API Test Inactive", email: `${testPrefix.toLowerCase()}-inactive@example.test`, passwordHash, role: "Admin", isActive: false },
  ]);
  [adminId, staffId] = users.slice(0, 2).map((user) => user._id.toString());
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  adminCookie = (await login(`${testPrefix.toLowerCase()}-admin@example.test`, "Test-password-2026")).cookie;
  staffCookie = (await login(`${testPrefix.toLowerCase()}-staff@example.test`, "Test-password-2026")).cookie;
});

after(async () => {
  if (saleIds.length) await Sale.deleteMany({ _id: { $in: saleIds } });
  if (productIds.length) await InventoryMovement.deleteMany({ productId: { $in: productIds } });
  if (movementIds.length) await InventoryMovement.deleteMany({ _id: { $in: movementIds } });
  if (productIds.length) await Product.deleteMany({ _id: { $in: productIds } });
  await User.deleteMany({ email: { $regex: testPrefix, $options: "i" } });
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await mongoose.disconnect();
});

test("authentication and role middleware protect product operations", async () => {
  const missingToken = await api("/api/products", { authCookie: null });
  assert.equal(missingToken.response.status, 401);

  const forgedToken = await api("/api/products", { authCookie: "retail_session=not-a-valid-token" });
  assert.equal(forgedToken.response.status, 401);

  const expiredToken = jwt.sign({ ver: 0 }, process.env.JWT_SECRET, { subject: adminId, expiresIn: -1, algorithm: "HS256" });
  const expiredSession = await api("/api/products", { authCookie: `retail_session=${expiredToken}` });
  assert.equal(expiredSession.response.status, 401);

  const invalidCredentials = await login(`${testPrefix.toLowerCase()}-admin@example.test`, "wrong-password");
  assert.equal(invalidCredentials.response.status, 401);
  assert.equal(invalidCredentials.body.error.code, "INVALID_CREDENTIALS");

  const missingLoginFields = await api("/api/auth/login", { method: "POST", authCookie: null, body: JSON.stringify({ email: "" }) });
  assert.equal(missingLoginFields.response.status, 400);
  assert.equal(missingLoginFields.body.error.code, "VALIDATION_ERROR");

  const successfulLogin = await login(`${testPrefix.toLowerCase()}-admin@example.test`, "Test-password-2026");
  assert.equal(successfulLogin.response.status, 200);
  assert.match(successfulLogin.response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(successfulLogin.response.headers.get("set-cookie"), /SameSite=Lax/i);

  const inactiveLogin = await login(`${testPrefix.toLowerCase()}-inactive@example.test`, "Test-password-2026");
  assert.equal(inactiveLogin.response.status, 401);

  const staffSession = await api("/api/auth/me", { authCookie: staffCookie });
  assert.equal(staffSession.response.status, 200);
  assert.equal(staffSession.body.data.user.role, "Staff");

  const staffRead = await api("/api/products", { authCookie: staffCookie });
  assert.equal(staffRead.response.status, 200);

  const staffWrite = await api("/api/products", {
    method: "POST",
    authCookie: staffCookie,
    body: JSON.stringify(productPayload({ sku: `${testPrefix}-STAFF` })),
  });
  assert.equal(staffWrite.response.status, 403);

  const adminSession = await api("/api/auth/me");
  assert.equal(adminSession.response.status, 200);
  assert.equal(adminSession.body.data.user.role, "Admin");

  const logout = await api("/api/auth/logout", { method: "POST" });
  assert.equal(logout.response.status, 200);
  const revoked = await api("/api/auth/me", { authCookie: adminCookie });
  assert.equal(revoked.response.status, 401);

  adminCookie = (await login(`${testPrefix.toLowerCase()}-admin@example.test`, "Test-password-2026")).cookie;
});

test("product API validates, filters, paginates, updates, and deactivates products", async () => {
  const incompleteProduct = productPayload();
  delete incompleteProduct.name;
  const missingRequiredField = await api("/api/products", { method: "POST", body: JSON.stringify(incompleteProduct) });
  assert.equal(missingRequiredField.response.status, 400);
  assert.ok(missingRequiredField.body.error.details.some((detail) => detail.field === "name"));

  const invalidCreate = await api("/api/products", {
    method: "POST",
    body: JSON.stringify(productPayload({ sellingPrice: -1 })),
  });
  assert.equal(invalidCreate.response.status, 400);
  assert.equal(invalidCreate.body.error.code, "VALIDATION_ERROR");

  const negativePurchasePrice = await api("/api/products", {
    method: "POST", body: JSON.stringify(productPayload({ purchasePrice: -0.01 })),
  });
  assert.equal(negativePurchasePrice.response.status, 400);

  const negativeStock = await api("/api/products", {
    method: "POST", body: JSON.stringify(productPayload({ stock: -1 })),
  });
  assert.equal(negativeStock.response.status, 400);

  const invalidStock = await api("/api/products", {
    method: "POST",
    body: JSON.stringify(productPayload({ stock: 1.5 })),
  });
  assert.equal(invalidStock.response.status, 400);
  assert.ok(invalidStock.body.error.details.some((item) => item.field === "stock"));

  const invalidClientField = await api("/api/products", {
    method: "POST",
    body: JSON.stringify(productPayload({ orderTotal: 0 })),
  });
  assert.equal(invalidClientField.response.status, 400);
  assert.ok(invalidClientField.body.error.details.some((item) => item.field === "orderTotal"));

  const created = await api("/api/products", { method: "POST", body: JSON.stringify(productPayload()) });
  if (created.body.data?._id) productIds.push(created.body.data._id);
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.sku, `${testPrefix}-LOW`);
  assert.equal(created.body.data.isActive, true);
  const openingMovement = await InventoryMovement.findOne({ productId: created.body.data._id }).lean();
  assert.equal(openingMovement.previousStock, 0);
  assert.equal(openingMovement.newStock, 2);

  const stockThroughProductEdit = await api(`/api/products/${created.body.data._id}`, {
    method: "PUT",
    body: JSON.stringify(productPayload({ stock: 99 })),
  });
  assert.equal(stockThroughProductEdit.response.status, 400);
  assert.equal(stockThroughProductEdit.body.error.code, "VALIDATION_ERROR");

  const duplicate = await api("/api/products", { method: "POST", body: JSON.stringify(productPayload({ sku: `${testPrefix.toLowerCase()}-low` })) });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.error.code, "DUPLICATE_SKU");

  const regular = await api("/api/products", {
    method: "POST",
    body: JSON.stringify(productPayload({ sku: `${testPrefix}-REGULAR`, name: "Amber Work Lamp", category: "Home", stock: 14, reorderLevel: 5 })),
  });
  if (regular.body.data?._id) productIds.push(regular.body.data._id);
  assert.equal(regular.response.status, 201);

  const outOfStock = await api("/api/products", {
    method: "POST",
    body: JSON.stringify(productPayload({ sku: `${testPrefix}-OUT`, name: "Stoneware Display Tray", category: "Home", stock: 0, reorderLevel: 4 })),
  });
  if (outOfStock.body.data?._id) productIds.push(outOfStock.body.data._id);
  assert.equal(outOfStock.response.status, 201);

  const byName = await api(`/api/products?search=${encodeURIComponent(`Canvas Shop Apron ${testPrefix.slice(-6)}`)}`);
  assert.equal(byName.body.data.pagination.total, 1);
  assert.equal(byName.body.data.products[0].sku, `${testPrefix}-LOW`);

  const bySku = await api(`/api/products?search=${encodeURIComponent(`${testPrefix}-REGULAR`)}`);
  assert.equal(bySku.body.data.pagination.total, 1);

  const repeatedSearch = await api("/api/products?search=one&search=two");
  assert.equal(repeatedSearch.response.status, 400);
  assert.equal(repeatedSearch.body.error.code, "VALIDATION_ERROR");

  const byCategory = await api(`/api/products?category=Home&search=${encodeURIComponent(testPrefix)}`);
  assert.equal(byCategory.body.data.pagination.total, 2);

  const lowStock = await api(`/api/products?lowStock=true&search=${encodeURIComponent(testPrefix)}`);
  assert.equal(lowStock.body.data.pagination.total, 2);

  const zeroStock = await api(`/api/products?outOfStock=true&search=${encodeURIComponent(testPrefix)}`);
  assert.equal(zeroStock.body.data.pagination.total, 1);

  const pageOne = await api(`/api/products?limit=1&page=1&search=${encodeURIComponent(testPrefix)}&sortBy=sku&sortOrder=asc`);
  const pageTwo = await api(`/api/products?limit=1&page=2&search=${encodeURIComponent(testPrefix)}&sortBy=sku&sortOrder=asc`);
  assert.equal(pageOne.body.data.pagination.totalPages, 3);
  assert.notEqual(pageOne.body.data.products[0]._id, pageTwo.body.data.products[0]._id);

  const byId = await api(`/api/products/${created.body.data._id}`);
  assert.equal(byId.response.status, 200);
  assert.equal(byId.body.data.name, `Canvas Shop Apron ${testPrefix.slice(-6)}`);

  const invalidId = await api("/api/products/not-an-object-id");
  assert.equal(invalidId.response.status, 400);
  assert.equal(invalidId.body.error.code, "INVALID_PRODUCT_ID");

  const updated = await api(`/api/products/${created.body.data._id}`, {
    method: "PUT",
    body: JSON.stringify({ ...productPayload({ name: "Canvas Utility Apron" }), stock: undefined }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.data.name, "Canvas Utility Apron");
  assert.equal(updated.body.data.stock, 2);

  const deactivated = await api(`/api/products/${created.body.data._id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive: false }),
  });
  assert.equal(deactivated.response.status, 200);
  assert.equal(deactivated.body.data.isActive, false);

  const inactiveProducts = await api(`/api/products?isActive=false&search=${encodeURIComponent(testPrefix)}`);
  assert.equal(inactiveProducts.body.data.pagination.total, 1);

  await assert.rejects(productService.getSellableProductById(created.body.data._id), { code: "ACTIVE_PRODUCT_NOT_FOUND" });

  const unsupportedDelete = await api(`/api/products/${created.body.data._id}`, { method: "DELETE" });
  assert.equal(unsupportedDelete.response.status, 404);
});

test("inventory adjustments are atomic, permission-protected, and recorded in movement history", async (context) => {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== "isdbgrid") {
    context.skip("MongoDB replica set required for transaction integration test");
    return;
  }

  const created = await api("/api/products", {
    method: "POST",
    body: JSON.stringify(productPayload({ sku: `${testPrefix}-INV`, stock: 5, reorderLevel: 12 })),
  });
  assert.equal(created.response.status, 201);
  productIds.push(created.body.data._id);

  const noAuth = await api("/api/inventory/adjustments", {
    method: "POST", authCookie: null, body: JSON.stringify({ productId: created.body.data._id, type: "STOCK_RECEIVED", quantity: 10, reason: "Delivery" }),
  });
  assert.equal(noAuth.response.status, 401);

  const staffWrite = await api("/api/inventory/adjustments", {
    method: "POST", authCookie: staffCookie, body: JSON.stringify({ productId: created.body.data._id, type: "STOCK_RECEIVED", quantity: 10, reason: "Delivery" }),
  });
  assert.equal(staffWrite.response.status, 403);

  const invalidQuantity = await api("/api/inventory/adjustments", {
    method: "POST", body: JSON.stringify({ productId: created.body.data._id, type: "STOCK_RECEIVED", quantity: 0, reason: "Delivery" }),
  });
  assert.equal(invalidQuantity.response.status, 400);

  const negativeQuantity = await api("/api/inventory/adjustments", {
    method: "POST", body: JSON.stringify({ productId: created.body.data._id, type: "MANUAL_DECREASE", quantity: -1, reason: "Negative test" }),
  });
  assert.equal(negativeQuantity.response.status, 400);

  const invalidType = await api("/api/inventory/adjustments", {
    method: "POST", body: JSON.stringify({ productId: created.body.data._id, type: "OTHER", quantity: 1, reason: "Invalid type" }),
  });
  assert.equal(invalidType.response.status, 400);

  const received = await api("/api/inventory/adjustments", {
    method: "POST", body: JSON.stringify({ productId: created.body.data._id, type: "STOCK_RECEIVED", quantity: 10, reason: "Supplier delivery" }),
  });
  assert.equal(received.response.status, 201);
  assert.equal(received.body.data.product.stock, 15);
  assert.equal(received.body.data.movement.previousStock, 5);
  assert.equal(received.body.data.movement.newStock, 15);
  assert.equal(received.body.data.movement.createdBy, adminId);
  movementIds.push(received.body.data.movement._id);

  const increased = await api("/api/inventory/adjustments", {
    method: "POST", body: JSON.stringify({ productId: created.body.data._id, type: "MANUAL_INCREASE", quantity: 3, reason: "Count correction" }),
  });
  assert.equal(increased.response.status, 201);
  assert.equal(increased.body.data.product.stock, 18);
  movementIds.push(increased.body.data.movement._id);

  const decreased = await api("/api/inventory/adjustments", {
    method: "POST", body: JSON.stringify({ productId: created.body.data._id, type: "MANUAL_DECREASE", quantity: 7, reason: "Damaged during count" }),
  });
  assert.equal(decreased.response.status, 201);
  assert.equal(decreased.body.data.product.stock, 11);
  movementIds.push(decreased.body.data.movement._id);

  const insufficient = await api("/api/inventory/adjustments", {
    method: "POST", body: JSON.stringify({ productId: created.body.data._id, type: "MANUAL_DECREASE", quantity: 12, reason: "Too many units" }),
  });
  assert.equal(insufficient.response.status, 409);
  assert.equal(insufficient.body.error.code, "INSUFFICIENT_STOCK");

  const history = await api(`/api/inventory/movements?productId=${created.body.data._id}&from=2020-01-01&to=2035-01-01`);
  assert.equal(history.response.status, 200);
  assert.equal(history.body.data.pagination.total, 4);
  assert.equal(history.body.data.movements[0].productId.sku, `${testPrefix}-INV`);

  const lowStock = await api("/api/inventory/low-stock?status=low");
  assert.equal(lowStock.response.status, 200);
  assert.ok(lowStock.body.data.products.some((product) => product._id === created.body.data._id));

  const outOfStockList = await api("/api/inventory/low-stock?status=out");
  assert.equal(outOfStockList.response.status, 200);
  assert.ok(outOfStockList.body.data.products.some((product) => product.stock === 0));

  const currentProduct = await api(`/api/products/${created.body.data._id}`);
  assert.equal(currentProduct.body.data.stock, 11);

  const inactiveProduct = await api("/api/products", {
    method: "POST",
    body: JSON.stringify(productPayload({ sku: `${testPrefix}-INACTIVE`, stock: 4, isActive: true })),
  });
  assert.equal(inactiveProduct.response.status, 400);

  const inactiveRecord = await Product.create({ ...productPayload({ sku: `${testPrefix}-INACTIVE`, stock: 4 }), isActive: false });
  productIds.push(inactiveRecord._id.toString());
  const inactiveAdjustment = await api("/api/inventory/adjustments", {
    method: "POST", body: JSON.stringify({ productId: inactiveRecord._id, type: "STOCK_RECEIVED", quantity: 1, reason: "Reject inactive item" }),
  });
  assert.equal(inactiveAdjustment.response.status, 409);
  assert.equal(inactiveAdjustment.body.error.code, "INACTIVE_PRODUCT");
});

test("sales calculate totals, preserve snapshots, deduct stock, and roll back on failure", async (context) => {
  const firstProduct = await api("/api/products", {
    method: "POST",
    body: JSON.stringify(productPayload({ sku: `${testPrefix}-SALE-A`, name: "Sale Test Mug", sellingPrice: 10, purchasePrice: 4, stock: 8 })),
  });
  assert.equal(firstProduct.response.status, 201);
  productIds.push(firstProduct.body.data._id);

  const secondProduct = await api("/api/products", {
    method: "POST",
    body: JSON.stringify(productPayload({ sku: `${testPrefix}-SALE-B`, name: "Sale Test Bowl", sellingPrice: 7, purchasePrice: 3, stock: 4 })),
  });
  assert.equal(secondProduct.response.status, 201);
  productIds.push(secondProduct.body.data._id);

  const firstId = firstProduct.body.data._id;
  const secondId = secondProduct.body.data._id;
  const invalidDiscount = await api("/api/sales", {
    method: "POST", body: JSON.stringify({ items: [{ productId: firstId, quantity: 1 }], discount: 100, taxRate: 0.08 }),
  });
  assert.equal(invalidDiscount.response.status, 400);
  assert.equal(invalidDiscount.body.error.code, "INVALID_DISCOUNT");

  const invalidSaleProductId = await api("/api/sales", {
    method: "POST", body: JSON.stringify({ items: [{ productId: "not-an-object-id", quantity: 1 }], discount: 0, taxRate: 0 }),
  });
  assert.equal(invalidSaleProductId.response.status, 400);

  const emptySale = await api("/api/sales", { method: "POST", body: JSON.stringify({ items: [], discount: 0, taxRate: 0 }) });
  assert.equal(emptySale.response.status, 400);

  const fractionalQuantity = await api("/api/sales", {
    method: "POST", body: JSON.stringify({ items: [{ productId: firstId, quantity: 1.5 }], discount: 0, taxRate: 0 }),
  });
  assert.equal(fractionalQuantity.response.status, 400);

  const forgedTotal = await api("/api/sales", {
    method: "POST", body: JSON.stringify({ items: [{ productId: firstId, quantity: 1 }], discount: 0, taxRate: 0, total: 0.01 }),
  });
  assert.equal(forgedTotal.response.status, 400);
  assert.ok(forgedTotal.body.error.details.some((detail) => detail.field === "total"));

  const insufficient = await api("/api/sales", {
    method: "POST", body: JSON.stringify({ items: [{ productId: firstId, quantity: 1 }, { productId: secondId, quantity: 99 }], discount: 0, taxRate: 0 }),
  });
  assert.equal(insufficient.response.status, 409);
  assert.equal(insufficient.body.error.code, "INSUFFICIENT_STOCK");

  const beforeFailureFirst = await Product.findById(firstId).lean();
  const beforeFailureSecond = await Product.findById(secondId).lean();
  const movementCountBeforeFailure = await InventoryMovement.countDocuments({ productId: { $in: [firstId, secondId] }, type: "SALE" });
  const originalCreate = Sale.create;
  Sale.create = async () => { throw new Error("simulated sale persistence failure"); };
  let simulatedFailure;
  try {
    simulatedFailure = await api("/api/sales", {
      method: "POST", body: JSON.stringify({ items: [{ productId: firstId, quantity: 2 }, { productId: secondId, quantity: 1 }], discount: 0, taxRate: 0.08 }),
    });
  } finally {
    Sale.create = originalCreate;
  }
  assert.equal(simulatedFailure.response.status, 500);
  assert.equal((await Product.findById(firstId).lean()).stock, beforeFailureFirst.stock);
  assert.equal((await Product.findById(secondId).lean()).stock, beforeFailureSecond.stock);
  assert.equal(await InventoryMovement.countDocuments({ productId: { $in: [firstId, secondId] }, type: "SALE" }), movementCountBeforeFailure);

  const created = await api("/api/sales", {
    method: "POST", body: JSON.stringify({ items: [{ productId: firstId, quantity: 2 }, { productId: secondId, quantity: 1 }], discount: 2, taxRate: 0.1 }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.subtotal, 27);
  assert.equal(created.body.data.discount, 2);
  assert.equal(created.body.data.taxAmount, 2.5);
  assert.equal(created.body.data.total, 27.5);
  assert.equal(created.body.data.items.length, 2);
  assert.equal(created.body.data.items[0].productNameSnapshot, "Sale Test Mug");
  assert.equal(created.body.data.items[0].unitPriceSnapshot, 10);
  assert.equal(created.body.data.createdBy._id, adminId);
  saleIds.push(created.body.data._id);

  const secondSale = await api("/api/sales", {
    method: "POST", body: JSON.stringify({ items: [{ productId: firstId, quantity: 1 }], discount: 0, taxRate: 0 }),
  });
  assert.equal(secondSale.response.status, 201);
  assert.notEqual(secondSale.body.data.invoiceNumber, created.body.data.invoiceNumber);
  saleIds.push(secondSale.body.data._id);

  await api(`/api/products/${firstId}`, {
    method: "PUT", body: JSON.stringify({ ...productPayload({ name: "Renamed Sale Mug", sellingPrice: 25 }), stock: undefined }),
  });
  const invoice = await api(`/api/sales/${created.body.data._id}`);
  assert.equal(invoice.response.status, 200);
  assert.equal(invoice.body.data.items[0].productNameSnapshot, "Sale Test Mug");
  assert.equal(invoice.body.data.items[0].unitPriceSnapshot, 10);

  const saleMovements = await InventoryMovement.find({ productId: { $in: [firstId, secondId] }, type: "SALE" }).lean();
  assert.equal(saleMovements.length, 3);
  assert.ok(saleMovements.every((movement) => movement.createdBy.toString() === adminId));

  const salesList = await api(`/api/sales?search=${encodeURIComponent(created.body.data.invoiceNumber)}`);
  assert.equal(salesList.response.status, 200);
  assert.ok(salesList.body.data.sales.some((sale) => sale._id === created.body.data._id));
  assert.equal((await Product.findById(firstId).lean()).stock, 5);
  assert.equal((await Product.findById(secondId).lean()).stock, 3);

  const dateRange = "startDate=2000-01-01&endDate=2035-01-01";
  const salesReport = await api(`/api/reports/sales?${dateRange}`);
  assert.equal(salesReport.response.status, 200);
  assert.equal(salesReport.body.data.summary.totalSales, 37.5);
  assert.equal(salesReport.body.data.summary.netSales, 35);
  assert.equal(salesReport.body.data.summary.transactionCount, 2);
  assert.equal(salesReport.body.data.topSellingProducts[0].productId, firstId);
  assert.equal(salesReport.body.data.topSellingProducts[0].quantitySold, 3);
  assert.equal(salesReport.body.data.recentSales.length, 2);
  assert.ok(Number.isInteger(salesReport.body.data.summary.totalActiveProducts));

  const saleDate = new Date(created.body.data.createdAt).toISOString().slice(0, 10);
  const sameDayReport = await api(`/api/reports/sales?startDate=${saleDate}&endDate=${saleDate}`);
  assert.equal(sameDayReport.response.status, 200);
  assert.equal(sameDayReport.body.data.summary.transactionCount, 2);

  const profitReport = await api(`/api/reports/profit?${dateRange}`);
  assert.equal(profitReport.response.status, 200);
  assert.equal(profitReport.body.data.summary.merchandiseRevenue, 35);
  assert.equal(profitReport.body.data.summary.costOfGoods, 15);
  assert.equal(profitReport.body.data.summary.grossProfit, 20);
  assert.equal(profitReport.body.data.topProductProfits.find((item) => item.productId === firstId).grossProfit, 16.52);

  const invalidDates = await api("/api/reports/sales?startDate=2035-01-01&endDate=2000-01-01");
  assert.equal(invalidDates.response.status, 400);
  assert.equal(invalidDates.body.error.code, "VALIDATION_ERROR");

  const impossibleDate = await api("/api/reports/sales?startDate=2026-02-31&endDate=2026-03-10");
  assert.equal(impossibleDate.response.status, 400);
  assert.equal(impossibleDate.body.error.code, "VALIDATION_ERROR");

  const emptyReport = await api("/api/reports/sales?startDate=1990-01-01&endDate=1990-01-02");
  assert.equal(emptyReport.response.status, 200);
  assert.equal(emptyReport.body.data.summary.totalSales, 0);
  assert.equal(emptyReport.body.data.summary.transactionCount, 0);
  assert.deepEqual(emptyReport.body.data.topSellingProducts, []);
  assert.deepEqual(emptyReport.body.data.dailySales, []);
});