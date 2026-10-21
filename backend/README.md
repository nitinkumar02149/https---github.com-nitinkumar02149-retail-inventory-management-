# Backend API

## Install and run

Run these commands from the `backend` directory:

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

The API listens on `http://localhost:5000` by default and connects to MongoDB at startup. Check `GET /api/health` for its JSON health response. Run `npm start` for production-style startup and `npm test` for the automated API checks. Inventory adjustment integration tests require a MongoDB replica set because stock and movement history commit in one transaction.

Set `MONGODB_URI` to a reachable MongoDB replica-set URI and `JWT_SECRET` to a random secret of at least 32 characters in `.env`. A standalone MongoDB server does not support the stock/history transaction. Set `CORS_ORIGIN` to a comma-separated list of allowed browser origins. Never commit `.env` or place real credentials in source files.

## File guide

- `src/server.js` loads configuration, connects MongoDB, and starts the HTTP server.
- `src/app.js` configures CORS, JSON parsing, routes, and error middleware.
- `src/routes/` maps API URLs to controllers; `src/controllers/` creates HTTP responses.
- `src/middleware/` contains request validation, 404 handling, and centralized errors.
- `src/config/database.js` opens and closes the Mongoose connection.
- `src/utils/` holds shared API response, error, and async-handler helpers.
- `src/models/product.model.js` defines product fields and database constraints.
- `src/models/user.model.js` stores roles and password hashes; password hashes are excluded from normal queries.
- `src/models/inventory-movement.model.js` stores the stock ledger.
- `src/services/product.service.js` owns database queries and product operations.
- `src/services/inventory.service.js` uses Mongo transactions to update stock and insert movement history together.
- `src/middleware/auth.js` validates the HttpOnly JWT cookie and enforces roles.
- `src/tests/` checks health/error behavior and Product API persistence.

## Product API

- `GET /api/products` lists products. Query parameters include `page`, `limit`, `search`, `category`, `lowStock`, `outOfStock`, `isActive`, `sortBy`, and `sortOrder`.
- `GET /api/products/:id` gets one product by MongoDB ID.
- `POST /api/products` creates a product.
- `PUT /api/products/:id` updates product details.
- `PATCH /api/products/:id/status` activates or deactivates a product using `{ "isActive": false }`.

Product writes accept only product fields. Sale totals are not accepted by product endpoints; the Sales API calculates all amounts from current product data.

## Authentication and inventory

- `POST /api/auth/login` accepts `{ "email": "...", "password": "..." }` and sets an HttpOnly session cookie.
- `GET /api/auth/me` returns the current user; `POST /api/auth/logout` revokes the user's token version and clears the cookie.
- Product reads and inventory history/low-stock reads require authentication. Product writes and inventory adjustments require the `Admin` role; Staff users can read products and inventory data.
- `POST /api/inventory/adjustments` accepts `productId`, `type` (`STOCK_RECEIVED`, `MANUAL_INCREASE`, or `MANUAL_DECREASE`), positive whole-number `quantity`, and `reason`.
- `GET /api/inventory/movements` supports `productId`, `type`, `from`, `to`, `page`, and `limit`.
- `GET /api/inventory/low-stock?status=all|low|out` returns active products at/below their reorder level, with an `outOfStock` summary.
- `POST /api/sales` accepts `{ "items": [{ "productId": "...", "quantity": 2 }], "discount": 1, "taxRate": 0.08 }`. It intentionally rejects prices, snapshots, subtotals, tax amounts, totals, and invoice numbers from clients. The server fetches prices, checks active status and stock, computes all values, generates the invoice number, deducts stock, writes `SALE` movements, and saves the invoice in one transaction.
- `GET /api/sales` lists paginated invoices; `GET /api/sales/:id` returns full invoice details with historical item snapshots.
- `GET /api/reports/sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` returns invoice totals (including tax), net merchandise sales, transaction count, top sellers, daily totals, recent sales, and current stock alerts.
- `GET /api/reports/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` returns historical-cost gross profit and per-product profit.

Run `npm test` with `MONGODB_TEST_URI` pointing at a replica-set test database. Example PowerShell command: `$env:MONGODB_TEST_URI='mongodb://127.0.0.1:27017/retail_inventory_test?replicaSet=retail-rs'; npm test`. Sales integration tests cover multiple products, quantity totals, invalid discounts/client totals, insufficient stock, distinct invoice numbers, historical snapshots, stock/movement consistency, and rollback after a simulated database persistence failure. Test records are cleaned after the suite.

JWTs are held in a short-lived HttpOnly, SameSite=Lax cookie so frontend JavaScript cannot read them. Production cookies use Secure. Logout increments a user token version, invalidating the session; the trade-off is that logout signs out all sessions for that account. Demo accounts can only be created by running `npm run seed:demo` with `NODE_ENV=development` and the `DEMO_*` environment values set. There is no public registration or Admin-promotion endpoint.

The seed command requires `DEMO_ADMIN_NAME`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_STAFF_NAME`, `DEMO_STAFF_EMAIL`, and `DEMO_STAFF_PASSWORD`. Use local development-only passwords of at least 12 characters. Passwords are hashed before being written to MongoDB.

Reporting rules: only committed `Sale` records are reported; failed transactions roll back and are absent. No cancellation or return model exists yet. Sales totals include tax, while gross profit excludes tax and equals merchandise line sales minus proportionally allocated invoice discounts and purchase-cost snapshots. Historical profit never reads current product costs. Date-only end values include the entire UTC day; omitted dates default to the current UTC month through now.