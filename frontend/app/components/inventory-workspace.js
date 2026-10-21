"use client";

import { useEffect, useState } from "react";
import { listProducts } from "../lib/products-api";
import { createAdjustment, listLowStock, listMovements } from "../lib/inventory-api";
import { useAuth } from "./auth-provider";
import { PreviewNotice, StatusBadge } from "./ui";

const movementLabels = {
  STOCK_RECEIVED: "Stock received",
  MANUAL_INCREASE: "Manual increase",
  MANUAL_DECREASE: "Manual decrease",
  SALE: "Sale",
  SALE_RETURN: "Sale return",
};

function useActiveProducts() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    listProducts({ page: 1, limit: 100, isActive: true, sortBy: "name", sortOrder: "asc" }, { signal: controller.signal })
      .then((result) => setProducts(result.products))
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); });
    return () => controller.abort();
  }, []);
  return { products, error };
}

export function InventoryWorkspace() {
  const { user } = useAuth();
  const { products, error: productError } = useActiveProducts();
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("STOCK_RECEIVED");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterProduct, setFilterProduct] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState({ movements: [], pagination: { total: 0, totalPages: 0 } });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setHistoryLoading(true);
    listMovements({ productId: filterProduct, from, to, page, limit: 10 }, { signal: controller.signal })
      .then(setHistory)
      .catch((requestError) => { if (requestError.name !== "AbortError") setHistoryError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [filterProduct, from, page, refreshKey, to]);

  async function submitAdjustment(event) {
    event.preventDefault();
    if (!productId) {
      setFeedback({ kind: "error", message: "Select an active product." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await createAdjustment({ productId, type, quantity: Number(quantity), reason: reason.trim() });
      setFeedback({ kind: "success", message: `Stock updated: ${result.movement.previousStock} → ${result.movement.newStock} units. Movement recorded.` });
      setQuantity("");
      setReason("");
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      const details = requestError.details.map((detail) => `${detail.field}: ${detail.message}`);
      setFeedback({ kind: "error", message: [requestError.message, ...details].join(" ") });
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    {user.role === "Admin" ? <form className="form-panel inventory-adjustment-form" onSubmit={submitAdjustment}>
      <div className="form-panel-heading"><h2>Record a stock movement</h2><p>Each adjustment updates product stock and records the movement together.</p></div>
      <div className="form-grid form-grid-2">
        <label className="field" htmlFor="inventory-product"><span className="field-label">Product *</span><select id="inventory-product" value={productId} onChange={(event) => setProductId(event.target.value)} required><option value="">Select an active product</option>{products.map((product) => <option value={product._id} key={product._id}>{product.name} · {product.sku} · {product.stock} in stock</option>)}</select></label>
        <label className="field" htmlFor="inventory-type"><span className="field-label">Movement type *</span><select id="inventory-type" value={type} onChange={(event) => setType(event.target.value)}><option value="STOCK_RECEIVED">Stock received</option><option value="MANUAL_INCREASE">Manual increase</option><option value="MANUAL_DECREASE">Manual decrease</option></select></label>
        <label className="field" htmlFor="inventory-quantity"><span className="field-label">Quantity *</span><input id="inventory-quantity" type="number" min="1" max="1000000" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Enter whole units" required /></label>
        <label className="field" htmlFor="inventory-reason"><span className="field-label">Reason *</span><input id="inventory-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Supplier delivery, damaged goods…" required /></label>
      </div>
      {productError && <div className="form-feedback form-feedback-error" role="alert">Could not load products: {productError}</div>}
      {feedback && <div className={`form-feedback${feedback.kind === "error" ? " form-feedback-error" : ""}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</div>}
      <div className="form-actions"><span className="required-note">Recorded as {user.name}</span><button className="button button-primary" type="submit" disabled={submitting || products.length === 0}>{submitting ? "Recording…" : "Record movement"}<span aria-hidden="true">→</span></button></div>
    </form> : <div className="preview-notice"><span aria-hidden="true">i</span><p>Staff access is read-only for inventory. Admin users can record stock movements.</p></div>}

    <section className="panel movement-panel">
      <div className="panel-toolbar"><div><h2>Movement history</h2><p>Persisted stock movement records</p></div><button className="button button-quiet" type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={historyLoading}>↻ Refresh</button></div>
      <div className="filter-bar movement-filters">
        <select aria-label="Filter movements by product" value={filterProduct} onChange={(event) => { setFilterProduct(event.target.value); setPage(1); }}><option value="">All products</option>{products.map((product) => <option value={product._id} key={product._id}>{product.name} · {product.sku}</option>)}</select>
        <label className="date-filter">From <input type="date" aria-label="Movement from date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label>
        <label className="date-filter">To <input type="date" aria-label="Movement to date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
        <span className="result-count">{history.pagination.total} movements</span>
      </div>
      {historyError && <div className="form-feedback form-feedback-error" role="alert">{historyError}</div>}
      <div className="table-scroll"><table className="data-table movement-table"><thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Quantity</th><th>Previous stock</th><th>New stock</th><th>Reason</th><th>Recorded by</th></tr></thead><tbody>
        {historyLoading ? <tr><td className="table-empty" colSpan="8"><span className="inline-loader" />Loading movements…</td></tr> : history.movements.length ? history.movements.map((movement) => <tr key={movement._id}><td>{new Date(movement.createdAt).toLocaleString()}</td><td><div className="product-cell"><strong>{movement.productId?.name || "Deleted product"}</strong><small>{movement.productId?.sku || ""}</small></div></td><td><StatusBadge tone={movement.type === "MANUAL_DECREASE" ? "warning" : "success"}>{movementLabels[movement.type] || movement.type}</StatusBadge></td><td>{movement.type === "MANUAL_DECREASE" ? "−" : "+"}{movement.quantity}</td><td>{movement.previousStock}</td><td className="cell-strong">{movement.newStock}</td><td>{movement.reason}</td><td>{movement.createdBy?.name || "Unknown user"}</td></tr>) : <tr><td className="table-empty" colSpan="8">No stock movements recorded yet.</td></tr>}
      </tbody></table></div>
      <div className="pagination-controls"><span>Page {page} of {Math.max(history.pagination.totalPages, 1)}</span><div><button className="button button-secondary" type="button" disabled={historyLoading || page <= 1} onClick={() => setPage((value) => value - 1)}>← Previous</button><button className="button button-secondary" type="button" disabled={historyLoading || page >= history.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next →</button></div></div>
    </section>
  </>;
}

export function LowStockWorkspace() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState({ products: [], summary: { lowStock: 0, outOfStock: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    listLowStock(status, { signal: controller.signal })
      .then(setResult)
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey, status]);

  const visibleProducts = result.products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="panel table-panel low-stock-live-panel">
    <div className="panel-toolbar"><div><h2>Reorder watchlist</h2><p>Active products at or below reorder level</p></div><button className="button button-quiet" type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>↻ Refresh</button></div>
    <div className="filter-bar product-filters"><label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or SKU" aria-label="Search low-stock products" /></label><select aria-label="Filter low-stock category" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Low and out of stock</option><option value="low">Low stock only</option><option value="out">Out of stock only</option></select><span className="result-count">{result.summary.lowStock} low · {result.summary.outOfStock} out</span></div>
    {error && <div className="form-feedback form-feedback-error" role="alert">{error}</div>}
    <div className="table-scroll"><table className="data-table product-table"><thead><tr><th>Product</th><th>Category</th><th>Available stock</th><th>Reorder level</th><th>Status</th></tr></thead><tbody>
      {loading ? <tr><td className="table-empty" colSpan="5"><span className="inline-loader" />Loading low-stock products…</td></tr> : visibleProducts.length ? visibleProducts.map((product) => <tr key={product._id}><td><div className="product-cell"><span className="product-thumb">{product.name.slice(0, 1)}</span><span><strong>{product.name}</strong><small>SKU {product.sku}</small></span></div></td><td>{product.category}</td><td className={product.stock === 0 ? "stock-danger" : "stock-warning"}>{product.stock} units</td><td>{product.reorderLevel} units</td><td><StatusBadge tone={product.stock === 0 ? "danger" : "warning"}>{product.stock === 0 ? "Out of stock" : "Low stock"}</StatusBadge></td></tr>) : <tr><td className="table-empty" colSpan="5">{search ? "No products match this search." : "No active products are low or out of stock."}</td></tr>}
    </tbody></table></div>
  </section>;
}