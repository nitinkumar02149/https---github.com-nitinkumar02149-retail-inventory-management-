import Link from "next/link";
import { DataTable, PageHeading, PreviewNotice, SectionHeader, StatCard, StatusBadge } from "./ui";
import { LoginForm } from "./preview-form";
import ProductsTable from "./products-table";
import ProductEditor from "./product-editor";
import { ProductHeadingAction } from "./role-actions";
import { InventoryWorkspace, LowStockWorkspace } from "./inventory-workspace";
import SalesWorkspace from "./sales-workspace-live";
import InvoiceWorkspace from "./invoice-workspace";
import { products, recentSales, topProducts } from "../data/preview-data";

export function DashboardView() {
  const lowStock = products.filter((product) => product.stock <= product.reorderLevel).slice(0, 3);
  return <><PageHeading eyebrow="TUESDAY, OCTOBER 21, 2026" title="Good morning, Alex" description="Here’s what’s happening at Northline Goods today." action={<button className="button button-secondary" type="button">⇩ Export summary</button>} /><PreviewNotice /><section className="stats-grid"><StatCard label="Total products" value="248" change="12.8%" tone="green" icon="□" /><StatCard label="Total sales" value="$12,840" change="8.2%" tone="coral" icon="$" /><StatCard label="Total transactions" value="186" change="5.4%" tone="blue" icon="↔" /><StatCard label="Low stock products" value="12" change="3 need attention" tone="amber" icon="!" /></section><section className="dashboard-grid"><article className="panel recent-panel"><SectionHeader title="Recent sales" caption="Latest sample activity" href="/invoices" /><div className="table-scroll"><table className="data-table"><thead><tr><th>Transaction</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>{recentSales.map((sale) => <tr key={sale.id}><td className="cell-strong">{sale.id}</td><td>{sale.customer}</td><td>{sale.date}</td><td className="cell-strong">{sale.total}</td><td><StatusBadge>{sale.status}</StatusBadge></td></tr>)}</tbody></table></div></article><article className="panel top-products-panel"><SectionHeader title="Top-selling products" caption="Sample data · This month" href="/reports" /><div className="top-product-list">{topProducts.map((product, index) => <div className="top-product" key={product.name}><span className={`rank rank-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><span className="top-product-copy"><strong>{product.name}</strong><small>{product.units} sold</small><span className="mini-progress"><i style={{ width: product.share }} /></span></span><strong>{product.revenue}</strong></div>)}</div></article><article className="panel low-stock-panel"><SectionHeader title="Low stock products" caption="Sample products at or below reorder level" href="/low-stock" /><div className="table-scroll"><table className="data-table"><thead><tr><th>Product</th><th>In stock</th><th>Reorder at</th><th>Status</th></tr></thead><tbody>{lowStock.map((product) => <tr key={product.sku}><td><div className="product-cell"><span className="product-thumb">{product.name.slice(0, 1)}</span><span><strong>{product.name}</strong><small>{product.sku}</small></span></div></td><td className="stock-warning">{product.stock} units</td><td>{product.reorderLevel} units</td><td><StatusBadge tone={product.stock === 0 ? "danger" : "warning"}>{product.stock === 0 ? "Out of stock" : "Low stock"}</StatusBadge></td></tr>)}</tbody></table></div></article></section></>;
}

export function ProductsView() {
  return <><PageHeading eyebrow="CATALOG" title="Products" description="Manage your catalog, pricing, and availability." action={<ProductHeadingAction />} /><section className="panel table-panel"><div className="panel-toolbar"><div><h2>All products</h2><p>Product records · Live API data</p></div></div><ProductsTable /></section></>;
}

const productFields = [
  { name: "name", label: "Product name", placeholder: "e.g. Ceramic pour-over set", required: true },
  { name: "sku", label: "SKU", placeholder: "e.g. KT-1042", required: true },
  { name: "category", label: "Category", options: ["Kitchen", "Home", "Accessories", "Beauty", "Electronics"], required: true },
  { name: "supplier", label: "Supplier", placeholder: "Supplier name" },
  { name: "purchasePrice", label: "Purchase price", type: "number", placeholder: "0.00", required: true },
  { name: "sellingPrice", label: "Selling price", type: "number", placeholder: "0.00", required: true },
  { name: "stock", label: "Initial stock", type: "number", placeholder: "0", required: true },
  { name: "reorderLevel", label: "Reorder level", type: "number", placeholder: "0", required: true },
];

export function AddProductView() {
  return <><PageHeading eyebrow="CATALOG / NEW" title="Add product" description="Create a product record in your inventory." action={<Link className="button button-secondary" href="/products">Cancel</Link>} /><ProductEditor /></>;
}

export async function EditProductView({ params }) {
  const { id } = await params;
  return <><PageHeading eyebrow="CATALOG / EDIT" title="Edit product" description="Update product details in your inventory." action={<Link className="button button-secondary" href="/products">Cancel</Link>} /><ProductEditor productId={id} /></>;
}

export function InventoryView() {
  return <><PageHeading eyebrow="STOCK CONTROL" title="Inventory" description="Record stock received and manual adjustments; every change is attributed and added to movement history." /><InventoryWorkspace /></>;
}

export function LowStockView() {
  return <><PageHeading eyebrow="STOCK CONTROL" title="Low stock" description="Live active products at or below their reorder level." action={<ProductHeadingAction label="Receive stock" href="/inventory" />} /><LowStockWorkspace /></>;
}

export function SalesView() {
  return <><PageHeading eyebrow="POINT OF SALE" title="New sale" description="Build a transaction and review the totals before checkout." action={<span className="date-label">Register 01 · Open</span>} /><SalesWorkspace /></>;
}

export function InvoicesView() {
  return <><PageHeading eyebrow="SALES / RECORDS" title="Invoices" description="Browse persisted sales and print historical invoice details." /><InvoiceWorkspace /></>;
}

const reportRows = topProducts.map((product, index) => ({ rank: `0${index + 1}`, product: product.name, units: product.units, revenue: product.revenue, share: product.share }));
const reportColumns = [{ key: "rank", label: "#" }, { key: "product", label: "Product" }, { key: "units", label: "Units sold" }, { key: "revenue", label: "Revenue" }, { key: "share", label: "Sales share" }];

export function ReportsView() {
  const categories = [{ name: "Home", amount: "$4,820", share: "38%", color: "green" }, { name: "Kitchen", amount: "$3,210", share: "25%", color: "coral" }, { name: "Accessories", amount: "$2,440", share: "19%", color: "blue" }, { name: "Beauty", amount: "$1,540", share: "12%", color: "amber" }];
  return <><PageHeading eyebrow="INSIGHTS" title="Reports" description="Review sales performance for a selected period." action={<button className="button button-secondary" type="button">⇩ Export report</button>} /><div className="report-filters panel"><div className="report-range"><label className="field" htmlFor="report-from"><span className="field-label">From</span><input id="report-from" type="date" defaultValue="2026-10-01" /></label><label className="field" htmlFor="report-to"><span className="field-label">To</span><input id="report-to" type="date" defaultValue="2026-10-21" /></label></div><select aria-label="Select report period"><option>Custom range</option><option>This week</option><option>This month</option><option>Last month</option></select><button className="button button-primary" type="button">Apply filters</button></div><PreviewNotice /><section className="stats-grid"><StatCard label="Gross sales" value="$12,840" change="8.2%" tone="green" icon="$" /><StatCard label="Transactions" value="186" change="5.4%" tone="blue" icon="↔" /><StatCard label="Average order value" value="$69.03" change="2.6%" tone="coral" icon="↗" /><StatCard label="Units sold" value="428" change="11.3%" tone="amber" icon="□" /></section><div className="reports-grid"><section className="panel chart-panel"><div className="panel-toolbar"><div><h2>Sales overview</h2><p>Sample daily sales · October 1–21</p></div><span className="chart-legend"><i /> Sales</span></div><div className="chart-summary"><strong>$12,840</strong><span>+8.2% from prior period</span></div><div className="bar-chart" role="img" aria-label="Sample daily sales bar chart"><div className="chart-guides"><i>$4k</i><i>$3k</i><i>$2k</i><i>$1k</i><i>$0</i></div><div className="bar-list">{[44, 60, 51, 75, 66, 48, 82, 58, 69, 91, 63, 74, 53, 88, 71, 58, 95, 72, 84, 62, 78].map((height, index) => <span className="chart-bar" style={{ height: `${height}%` }} key={index} />)}</div></div><div className="chart-axis"><span>Oct 1</span><span>Oct 7</span><span>Oct 14</span><span>Oct 21</span></div></section><section className="panel category-panel"><div className="panel-toolbar"><div><h2>Sales by category</h2><p>Sample revenue distribution</p></div></div><div className="category-breakdown">{categories.map((item) => <div className="category-row" key={item.name}><span className={`category-dot ${item.color}`} /><span>{item.name}</span><strong>{item.amount}</strong><small>{item.share}</small></div>)}</div></section></div><section className="panel table-panel report-products"><div className="panel-toolbar"><div><h2>Top-selling products</h2><p>Sample ranking by revenue for this period</p></div></div><DataTable columns={reportColumns} rows={reportRows} /></section></>;
}

export function UsersView() {
  return <><PageHeading eyebrow="ADMINISTRATION" title="Users" description="Admin-only workspace access preview." /><section className="panel empty-panel"><span className="empty-icon">♙</span><h2>User management is not connected</h2><p>User records and permissions will appear when the backend is integrated.</p><PreviewNotice /></section></>;
}

export function LoginView() {
  return <main className="login-page"><section className="login-visual"><Link className="brand login-brand" href="/dashboard"><span className="brand-mark">R</span><span>retail<span className="brand-light">desk</span></span></Link><div className="login-art"><span className="art-kicker">NORTHLINE GOODS · STORE OPERATIONS</span><h1>Make room for<br />what sells.</h1><p>A thoughtful workspace for the details that keep your store moving.</p><div className="art-ledger"><div><span>THIS WEEK · SAMPLE</span><strong>$4,280</strong><small>Sales overview</small></div><div className="ledger-bars"><i /><i /><i /><i /><i /><i /><i /></div></div></div><div className="login-visual-footer"><span>RETAIL OPERATIONS, MADE CLEAR</span><span>01 / 04</span></div></section><section className="login-form-side"><div className="login-form-wrap"><div className="login-mobile-brand"><span className="brand-mark">R</span><span>retail<span className="brand-light">desk</span></span></div><p className="eyebrow">WELCOME BACK</p><h2>Sign in to your workspace</h2><p className="login-subtitle">Enter your details to continue to Northline Goods.</p><LoginForm /><p className="login-bottom">New to Retail Desk? <a href="#contact">Contact your administrator</a></p></div><span className="login-copyright">© 2026 Retail Desk · Preview interface</span></section></main>;
}