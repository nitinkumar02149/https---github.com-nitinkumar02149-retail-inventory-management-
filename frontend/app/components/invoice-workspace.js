"use client";

import { useEffect, useState } from "react";
import { getSale, listSales } from "../lib/sales-api";
import { formatMoney } from "../data/preview-data";
import { StatusBadge } from "./ui";

export default function InvoiceWorkspace() {
  const [search, setSearch] = useState("");
  const [sales, setSales] = useState({ sales: [], pagination: { total: 0, totalPages: 0 } });
  const [selectedId, setSelectedId] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    listSales({ page: 1, limit: 50, search }, { signal: controller.signal })
      .then((result) => {
        setSales(result);
        setSelectedId((current) => result.sales.some((sale) => sale._id === current) ? current : result.sales[0]?._id || "");
      })
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search]);

  useEffect(() => {
    if (!selectedId) { setInvoice(null); return undefined; }
    const controller = new AbortController();
    setDetailLoading(true);
    getSale(selectedId, { signal: controller.signal })
      .then(setInvoice)
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId]);

  return <div className="invoice-layout">
    <section className="panel table-panel invoice-list-panel">
      <div className="section-header"><div><h2>Sales and invoices</h2><p>{sales.pagination.total} persisted invoices</p></div></div>
      <div className="filter-bar compact-filters"><input aria-label="Search invoices" placeholder="Search invoice number" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {error && <div className="form-feedback form-feedback-error" role="alert">{error}</div>}
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Total</th><th>Created by</th></tr></thead><tbody>
        {loading ? <tr><td className="table-empty" colSpan="5"><span className="inline-loader" />Loading invoices…</td></tr> : sales.sales.length ? sales.sales.map((sale) => <tr className="invoice-select-row" key={sale._id} aria-selected={selectedId === sale._id} onClick={() => setSelectedId(sale._id)}><td><button className="text-button" type="button" onClick={() => setSelectedId(sale._id)}>{sale.invoiceNumber}</button></td><td>{new Date(sale.createdAt).toLocaleDateString()}</td><td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="cell-strong">{formatMoney(sale.total)}</td><td>{sale.createdBy?.name || "User"}</td></tr>) : <tr><td className="table-empty" colSpan="5">No invoices yet. Confirm a sale to create one.</td></tr>}
      </tbody></table></div>
    </section>
    <aside className="invoice-detail panel">
      {detailLoading ? <div className="table-empty"><span className="inline-loader" />Loading invoice…</div> : invoice ? <>
        <div className="invoice-detail-top"><div><p className="eyebrow">INVOICE</p><h2>{invoice.invoiceNumber}</h2></div><StatusBadge>Recorded</StatusBadge></div>
        <div className="invoice-brand"><span className="brand-mark">R</span><span><strong>Northline Goods</strong><small>SALES INVOICE</small></span></div>
        <div className="invoice-parties"><div><small>CREATED BY</small><strong>{invoice.createdBy?.name || "User"}</strong><span>{invoice.createdBy?.email || ""}</span></div><div><small>ISSUED</small><strong>{new Date(invoice.createdAt).toLocaleString()}</strong><span>{invoice.items.length} line items</span></div></div>
        <div className="invoice-lines"><div className="invoice-line invoice-line-head"><span>ITEM</span><span>QTY</span><span>AMOUNT</span></div>{invoice.items.map((item, index) => <div className="invoice-line" key={`${item.productId}-${index}`}><span>{item.productNameSnapshot}<small className="invoice-unit-price">{formatMoney(item.unitPriceSnapshot)} each</small></span><span>{item.quantity}</span><strong>{formatMoney(item.lineTotal)}</strong></div>)}</div>
        <div className="invoice-total"><span>Subtotal</span><strong>{formatMoney(invoice.subtotal)}</strong><span>Discount</span><strong>−{formatMoney(invoice.discount)}</strong><span>Tax ({(invoice.taxRate * 100).toFixed(2)}%)</span><strong>{formatMoney(invoice.taxAmount)}</strong><span>Total</span><strong>{formatMoney(invoice.total)}</strong></div>
        <button className="button button-secondary invoice-print" type="button" onClick={() => window.print()}>▣ Print invoice</button>
      </> : <div className="table-empty">Select an invoice to view its details.</div>}
    </aside>
  </div>;
}