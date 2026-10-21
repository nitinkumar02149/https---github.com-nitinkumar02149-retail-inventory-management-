"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listProducts, updateProductStatus } from "../lib/products-api";
import { StatusBadge } from "./ui";
import { useAuth } from "./auth-provider";

const formatMoney = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

function stockStatus(product) {
  if (!product.stock) return { label: "Out of stock", tone: "danger" };
  if (product.stock <= product.reorderLevel) return { label: "Low stock", tone: "warning" };
  return { label: "In stock", tone: "success" };
}

export default function ProductsTable({ lowStockOnly = false }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ products: [], categories: [], pagination: { page: 1, total: 0, totalPages: 0 } });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const [sortBy, sortOrder] = sort.split(":");
    const filters = {
      page,
      limit: 10,
      search: search.trim() || undefined,
      category: category || undefined,
      lowStock: lowStockOnly || stockFilter === "low" ? true : undefined,
      outOfStock: stockFilter === "out" ? true : undefined,
      isActive: activeFilter === "" ? undefined : activeFilter,
      sortBy,
      sortOrder,
    };

    setLoading(true);
    setFeedback((current) => current?.kind === "error" ? null : current);
    listProducts(filters, { signal: controller.signal })
      .then((data) => setResult(data))
      .catch((error) => {
        if (error.name !== "AbortError") setFeedback({ kind: "error", message: error.message });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeFilter, category, lowStockOnly, page, refreshKey, search, sort, stockFilter]);

  useEffect(() => { setPage(1); }, [activeFilter, category, lowStockOnly, search, sort, stockFilter]);

  async function toggleStatus(product) {
    setActionId(product._id);
    setFeedback(null);
    try {
      await updateProductStatus(product._id, !product.isActive);
      setFeedback({ kind: "success", message: `${product.name} ${product.isActive ? "deactivated" : "activated"}.` });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFeedback({ kind: "error", message: error.message });
    } finally {
      setActionId("");
    }
  }

  return <>
    <div className="filter-bar product-filters">
      <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products or SKU" aria-label="Search products or SKU" /></label>
      <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{result.categories.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filter by stock level" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="">All stock levels</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
      <select aria-label="Filter by active status" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
      <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}><option value="createdAt:desc">Newest first</option><option value="name:asc">Name A–Z</option><option value="name:desc">Name Z–A</option><option value="stock:asc">Stock low–high</option><option value="sellingPrice:asc">Price low–high</option><option value="sellingPrice:desc">Price high–low</option></select>
      <span className="result-count">{result.pagination.total} products</span>
      <button className="button button-quiet" type="button" disabled={loading} onClick={() => setRefreshKey((value) => value + 1)} aria-label="Refresh product list">↻ Refresh</button>
    </div>
    {feedback && <div className={`form-feedback${feedback.kind === "error" ? " form-feedback-error" : ""}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</div>}
    <div className="table-scroll"><table className="data-table product-table"><thead><tr><th>Product</th><th>Category</th><th>Purchase price</th><th>Selling price</th><th>Available stock</th><th>Reorder level</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {loading ? <tr><td className="table-empty" colSpan="8"><span className="inline-loader" />Loading products…</td></tr> : feedback?.kind === "error" ? <tr><td className="table-empty" colSpan="8">Products could not be loaded. Use Refresh to try again.</td></tr> : result.products.length ? result.products.map((product) => { const status = stockStatus(product); return <tr key={product._id}><td><div className="product-cell"><span className="product-thumb">{product.name.slice(0, 1)}</span><span><strong>{product.name}</strong><small>SKU {product.sku}</small></span></div></td><td>{product.category}</td><td>{formatMoney(product.purchasePrice)}</td><td className="cell-strong">{formatMoney(product.sellingPrice)}</td><td><span className={`stock-number stock-${status.tone}`}>{product.stock} <small>units</small></span></td><td>{product.reorderLevel} units</td><td><div className="product-status"><StatusBadge tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "Active" : "Inactive"}</StatusBadge><small className={`stock-text stock-${status.tone}`}>{status.label}</small></div></td><td>{user.role === "Admin" ? <div className="row-actions"><Link className="icon-button row-action" href={`/products/${product._id}/edit`} aria-label={`Edit ${product.name}`} title="Edit product">↗</Link><button className="icon-button row-action" type="button" onClick={() => toggleStatus(product)} disabled={actionId === product._id} aria-label={`${product.isActive ? "Deactivate" : "Activate"} ${product.name}`} title={product.isActive ? "Deactivate product" : "Activate product"}>{actionId === product._id ? "…" : product.isActive ? "−" : "＋"}</button></div> : <span className="required-note">View only</span>}</td></tr>; }) : <tr><td className="table-empty" colSpan="8">No products found. Adjust the filters or add your first product.</td></tr>}
    </tbody></table></div>
    <div className="table-caption"><span>Product records from the database</span><span>Page {result.pagination.page} of {Math.max(result.pagination.totalPages, 1)}</span></div>
    <div className="pagination-controls"><span>{result.pagination.total} total products</span><div><button className="button button-secondary" type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>← Previous</button><button className="button button-secondary" type="button" disabled={loading || page >= result.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next →</button></div></div>
  </>;
}