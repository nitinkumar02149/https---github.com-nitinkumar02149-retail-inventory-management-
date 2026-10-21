# Retail Inventory & Sales Management System

A full-stack retail operations starter for managing products, inventory movements, authenticated sales, invoices, and reports. Product, inventory, sale, and report data is stored in MongoDB. No production deployment has been completed; deployment URLs below are placeholders.

## Features

- Responsive Next.js dashboard with Products, Inventory, Low Stock, Sales, Invoices, and Reports pages.
- Product catalog API with validation, search, filters, sorting, and pagination.
- JWT authentication in an HttpOnly session cookie, with Admin and Staff roles.
- Admin-only product maintenance and inventory adjustments; Staff has read access and can record sales.
- MongoDB-transaction-backed stock changes, inventory movements, sales, and invoice creation.
- Server-calculated prices, discounts, tax, totals, and unique invoice numbers.
- Historical product name, selling price, and purchase-cost snapshots on sale items.
- Sales and historical-cost profit reports with date filters.

## Technology

- Frontend: Next.js 15, React 19, JavaScript, CSS
- Backend: Node.js, Express 5, JavaScript
- Database: MongoDB replica set, Mongoose
- Authentication: JWT, bcryptjs, HttpOnly cookies
- Tests: Node.js built-in test runner and MongoDB integration tests

## Project structure

```text
retail-inventory-management/
|-- frontend/
|   |-- app/                 Next.js routes, UI components, API clients, and styles
|   |-- .env.example         Frontend API origin placeholder
|   `-- package.json
|-- backend/
|   |-- src/
|   |   |-- config/          dotenv, CORS, and MongoDB connection
|   |   |-- controllers/     HTTP request handlers
|   |   |-- middleware/      Auth, roles, validation, and error handling
|   |   |-- models/          Mongoose schemas
|   |   |-- routes/          Express API routes
|   |   |-- scripts/         Development-only demo user seeding
|   |   |-- services/        Database operations and business rules
|   |   |-- tests/           API and business-rule tests
|   |   `-- utils/           Shared API helpers
|   |-- .env.example         Backend environment placeholders
|   `-- package.json
|-- .gitignore
`-- README.md
```

## Prerequisites

- Node.js 20 or newer and npm
- MongoDB configured as a replica set. Inventory, sales, and movement writes use transactions; standalone MongoDB is not sufficient.
- `mongosh` for initializing a local replica set, or a MongoDB Atlas cluster (Atlas supports replica-set transactions).

## Local installation

Run these commands in PowerShell from the workspace parent directory:

```powershell
Set-Location .\retail-inventory-management\frontend
npm install
Set-Location ..\backend
npm install
```

Create local environment files from the project root:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
Copy-Item .\frontend\.env.example .\frontend\.env.local
```

Edit the local files with your own values. Never paste real secrets into source files, README, or `.env.example`.

## MongoDB setup

The API requires a replica set for atomic product/inventory/sale operations. With a local MongoDB server, configure its `mongod.cfg` with a replica-set name, restart MongoDB, then initialize it once:

```powershell
mongosh --host 127.0.0.1:27017 --eval "rs.initiate({_id:'retail-rs',members:[{_id:0,host:'127.0.0.1:27017'}]})"
```

Use this local connection format in `backend/.env`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/retail_inventory?replicaSet=retail-rs
```

For MongoDB Atlas, create a database user with only the required database permissions, allow the backend host through Atlas Network Access, and place the Atlas replica-set URI in `MONGODB_URI`. Do not commit the URI or database password.

## Environment variables

### Backend

| Variable | Purpose |
| --- | --- |
| `PORT` | Express port; defaults to `5000`. |
| `NODE_ENV` | Use `development` locally and `production` on the host. |
| `MONGODB_URI` | Local replica-set or Atlas connection URI. Treat as a secret. |
| `JWT_SECRET` | Random secret, at least 32 characters. Generate a distinct value for each environment. |
| `JWT_EXPIRES_IN` | JWT lifetime; example is `15m`. |
| `JWT_COOKIE_MAX_AGE_MS` | Session cookie lifetime in milliseconds; keep aligned with JWT lifetime. |
| `SESSION_COOKIE_SAME_SITE` | `lax` for same-site/local; set to `none` for cross-site frontend/API hosting. Production `none` requires HTTPS. |
| `CORS_ORIGIN` | Comma-separated exact browser origins allowed to call the API. Do not use `*` in production. |
| `DEFAULT_TAX_RATE` | Default fractional tax rate, e.g. `0.08` for 8%. |
| `BCRYPT_ROUNDS` | Development seed hashing work factor; seed script clamps it to a safe range. |
| `DEMO_ADMIN_NAME`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` | Development-only Admin seed values. |
| `DEMO_STAFF_NAME`, `DEMO_STAFF_EMAIL`, `DEMO_STAFF_PASSWORD` | Development-only Staff seed values. Use passwords of at least 12 characters. |

### Frontend

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public backend origin used by browser requests, e.g. `http://localhost:5000`. This is a URL, not a secret. |

Production secrets must be configured in the hosting provider's environment-variable settings. `NEXT_PUBLIC_*` values are included in browser bundles and must never contain secrets.

## Seed development users

Set `NODE_ENV=development`, configure the six `DEMO_*` values plus `MONGODB_URI` and `JWT_SECRET` in `backend/.env`, then run:

```powershell
Set-Location .\backend
npm run seed:demo
```

The seed script is development-only, hashes passwords with bcrypt, and upserts only the explicitly configured Admin and Staff accounts. There is no public registration or Admin-promotion endpoint. Sign in using the email/password values you configured locally; no real demo credentials are included in this repository.

## Start locally

Use two terminals. Start the API first from `backend`:

```powershell
Set-Location .\backend
npm run dev
```

Start Next.js from `frontend`:

```powershell
Set-Location .\frontend
npm run dev
```

Open `http://localhost:3000`. The API health endpoint is `http://localhost:5000/api/health`. To create an optimized frontend build, run `npm run build` in `frontend`; production-style starts use `npm start` in each package directory.

## Demo login

Use the local Admin or Staff email/password values configured in `.env` and seeded with `npm run seed:demo`. Admin can manage products and inventory. Staff can read products/inventory and record sales. The backend enforces these permissions independently of frontend navigation.

## API overview

All routes except health and login require the HttpOnly session cookie unless otherwise stated.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Health response. |
| `POST` | `/api/auth/login` | Public | Validate credentials and set session cookie. |
| `GET` | `/api/auth/me` | Authenticated | Return current user and role. |
| `POST` | `/api/auth/logout` | Authenticated | Revoke session version and clear cookie. |
| `GET` | `/api/products` | Admin, Staff | Paginated product list; supports search/category/stock/status/sort filters. |
| `GET` | `/api/products/:id` | Admin, Staff | Retrieve one product. |
| `POST` | `/api/products` | Admin | Create product. Initial stock is recorded as a movement. |
| `PUT` | `/api/products/:id` | Admin | Update product details; stock must change through inventory movements. |
| `PATCH` | `/api/products/:id/status` | Admin | Activate/deactivate product. |
| `POST` | `/api/inventory/adjustments` | Admin | Record receipt or manual increase/decrease. |
| `GET` | `/api/inventory/movements` | Admin, Staff | Movement history; supports product/date/type filters and pagination. |
| `GET` | `/api/inventory/low-stock` | Admin, Staff | Low/out-of-stock active products. |
| `POST` | `/api/sales` | Admin, Staff | Create sale and invoice; server calculates all amounts. |
| `GET` | `/api/sales` | Admin, Staff | Paginated sales/invoice list. |
| `GET` | `/api/sales/:id` | Admin, Staff | Invoice detail with historical item snapshots. |
| `GET` | `/api/reports/sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Admin, Staff | Sales totals, transaction count, top sellers, daily sales, recent sales, and stock alerts. |
| `GET` | `/api/reports/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Admin, Staff | Gross profit using historical purchase-cost snapshots. |

Reporting rules: only committed sales are counted. Failed sales roll back and are absent. Sales totals include tax; net merchandise sales and profit exclude collected tax. Invoice discounts are allocated proportionally by line sales. Profit uses saved `purchaseCostSnapshot`, never current product cost. Cancellations and returns are not implemented.

## Tests

Tests use Node's built-in test runner and a separate MongoDB test database. The test helper refuses databases without `test` in the name and refuses remote hosts unless explicitly opted into.

```powershell
Set-Location .\backend
$env:MONGODB_TEST_URI = 'mongodb://127.0.0.1:27017/retail_inventory_test?replicaSet=retail-rs'
npm test
```

The integration suite covers product validation/search/permissions, auth and cookie behavior, inventory movements and stock boundaries, sales totals/tax/discount/snapshots/invoice sequence/rollback, report calculations/date filters/empty ranges, and API errors. It creates uniquely named test data and removes it afterward. Never point `MONGODB_TEST_URI` at production.

## Deployment

No deployment has been performed. Live URLs below are placeholders until you deploy and verify the hosted services.

### Next.js on Vercel

1. Import the GitHub repository into Vercel and set the project Root Directory to `frontend`.
2. Use the existing Next.js framework preset. Build command: `npm run build`; output settings can remain at Vercel defaults.
3. Set `NEXT_PUBLIC_API_URL` to the deployed backend origin, for example `https://<your-api-host>` (no `/api` suffix).
4. Deploy, then test `/login`, `/dashboard`, `/products`, `/sales`, `/invoices`, and `/reports` on the Vercel domain.

### Express backend on a Node host

Deploy `backend` as a Node.js service on a host that supports long-running Express processes and MongoDB replica-set transactions (for example, Render, Railway, or Fly.io). Set its Root Directory to `backend`, build/install with `npm install`, and start with `npm start`. Configure `PORT` from the host-provided port and set `NODE_ENV=production`.

Set these production environment variables in the host dashboard: `MONGODB_URI` (Atlas replica-set URI), `JWT_SECRET` (fresh random 32+ character secret), `JWT_EXPIRES_IN`, `JWT_COOKIE_MAX_AGE_MS`, `SESSION_COOKIE_SAME_SITE`, `CORS_ORIGIN` (exact Vercel origin), and `DEFAULT_TAX_RATE`. For separate Vercel/API sites, use `SESSION_COOKIE_SAME_SITE=none` over HTTPS so the browser can send the HttpOnly cookie cross-site; `secure` is enabled automatically in production. Never allow wildcard CORS with credentialed cookies.

In MongoDB Atlas, configure a database user, database permissions, and Network Access for the backend host. Do not expose MongoDB ports publicly. Seed demo users only in a development database; create production users through a trusted administrative process (there is no public registration route).

### URL placeholders

- Live application: `[NOT DEPLOYED — add verified Vercel URL]`
- Public GitHub repository: `[ADD PUBLIC GITHUB REPOSITORY URL]`
- API base URL: `[ADD VERIFIED BACKEND URL]`

## GitHub submission commands

This workspace was initialized as a local Git repository, but it has no commit or remote configured. Review before staging:

```powershell
Set-Location 'C:\Users\nitin\OneDrive\Desktop\Dashboard\retail-inventory-management'
if (-not (Test-Path .git)) { git init }
git status --short
git check-ignore -v backend/.env frontend/.env.local
git check-ignore -v backend/.env.example frontend/.env.example
```

The first ignore check should report ignored env files; `.env.example` files should remain trackable. After reviewing the staged file list, commit:

```powershell
git add .
git status --short
git diff --cached --check
git commit -m "Complete retail inventory sales management system"
git branch -M main
```

Create the intended **public** GitHub repository in your account first, then connect its exact URL (replace the placeholder; do not use a guessed URL):

```powershell
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_PUBLIC_REPOSITORY>.git
git remote -v
git push -u origin main
```

If `origin` already exists, verify it with `git remote -v` and use `git remote set-url origin <CORRECT_PUBLIC_REPOSITORY_URL>` only if it points to the wrong repository. Do not commit `.env` files, credentials, generated `node_modules`, or build output.

## Submission checklist

- [x] Frontend production build passes locally.
- [x] Backend integration suite passes on an isolated local replica-set test database.
- [x] Local health, Dashboard, Reports, authentication, product, inventory, sales, and invoice flows have been exercised.
- [x] `.env` files are ignored; `.env.example` files contain placeholders.
- [ ] Configure persistent production MongoDB Atlas URI and production JWT secret.
- [ ] Deploy backend and set exact production CORS/frontend origins.
- [ ] Deploy frontend to Vercel and configure `NEXT_PUBLIC_API_URL`.
- [ ] Verify production login, product management, inventory, sales, invoices, and reports.
- [ ] Replace URL placeholders with verified live application, API, and GitHub URLs.