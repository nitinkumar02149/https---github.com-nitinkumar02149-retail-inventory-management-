"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProfitReport, getSalesReport } from "../lib/reports-api";
import { formatMoney } from "../data/preview-data";
import { StatusBadge } from "./ui";

function Metric({ label, value, tone = "green", icon, detail }) {
  return <article className={`stat-card tone-${tone}`}><div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon" aria-hidden="true">{icon}</span></div><strong className="stat-value">{value}</strong><div className="stat-foot">{detail}</div></article>;
}

function ReportError({ error }) {
  if (!error) return null;
  return <div className="form-feedback form-feedback-error" role="alert">{error}</div>;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardOverview() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getSalesReport({}, { signal: controller.signal })
      .then(setReport)
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey]);

  return <>
    <div className="page-heading"><div className="heading-copy"><p className="eyebrow">STORE PERFORMANCE</p><h1>Dashboard</h1><p className="page-description">Current month summary · {report ? `${formatDate(report.period.startDate)} – ${formatDate(report.period.endDate)}` : "Loading reporting period…"}</p></div><div className="heading-actions"><button className="button button-secondary" type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>↻ Refresh</button></div></div>
    <ReportError error={error} />
    {loading && !report ? <div className="report-loading"><span className="inline-loader" />Loading dashboard data…</div> : report && <>
      <section className="stats-grid dashboard-report-stats" aria-label="Dashboard summary">
        <Metric label="Active products" value={report.summary.totalActiveProducts.toLocaleString()} detail="Currently active" icon="□" tone="green" />
        <Metric label="Total sales" value={formatMoney(report.summary.totalSales)} detail="After discount · includes tax" icon="$" tone="coral" />
        <Metric label="Transactions" value={report.summary.transactionCount.toLocaleString()} detail="Recorded invoices" icon="↔" tone="blue" />
        <Metric label="Low stock" value={report.summary.lowStockCount.toLocaleString()} detail="Above zero · at reorder level" icon="!" tone="amber" />
        <Metric label="Out of stock" value={report.summary.outOfStockCount.toLocaleString()} detail="Active products with zero units" icon="×" tone="coral" />
      </section>
      <section className="dashboard-grid report-dashboard-grid">
        <article className="panel recent-panel"><div className="section-header"><div><h2>Recent sales</h2><p>Successful, persisted transactions only</p></div><Link className="text-link" href="/invoices">All invoices <span>→</span></Link></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Total</th><th>Created by</th></tr></thead><tbody>{report.recentSales.length ? report.recentSales.map((sale) => <tr key={sale._id}><td><Link className="text-button" href="/invoices">{sale.invoiceNumber}</Link></td><td>{new Date(sale.createdAt).toLocaleString()}</td><td>{sale.itemCount}</td><td className="cell-strong">{formatMoney(sale.total)}</td><td>{sale.createdBy?.name || "User"}</td></tr>) : <tr><td className="table-empty" colSpan="5">No sales recorded for this period.</td></tr>}</tbody></table></div></article>
        <article className="panel top-products-panel"><div className="section-header"><div><h2>Top-selling products</h2><p>By units sold in this period</p></div><Link className="text-link" href="/reports">Reports <span>→</span></Link></div><div className="top-product-list">{report.topSellingProducts.length ? report.topSellingProducts.map((product, index) => <div className="top-product" key={product.productId}><span className={`rank rank-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><span className="top-product-copy"><strong>{product.productName}</strong><small>{product.quantitySold} units · {formatMoney(product.revenue)} sales</small></span></div>) : <p className="empty-inline">No products sold for this period.</p>}</div></article>
        <article className="panel low-stock-panel"><div className="section-header"><div><h2>Low-stock products</h2><p>Live stock at or below reorder level</p></div><Link className="text-link" href="/low-stock">Inventory <span>→</span></Link></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Product</th><th>Stock</th><th>Reorder</th><th>Status</th></tr></thead><tbody>{report.lowStockProducts.length ? report.lowStockProducts.map((product) => <tr key={product._id}><td><div className="product-cell"><strong>{product.name}</strong><small>{product.sku}</small></div></td><td>{product.stock}</td><td>{product.reorderLevel}</td><td><StatusBadge tone={product.stock === 0 ? "danger" : "warning"}>{product.stock === 0 ? "Out of stock" : "Low stock"}</StatusBadge></td></tr>) : <tr><td className="table-empty" colSpan="4">No active products need reordering.</td></tr>}</tbody></table></div></article>
      </section>
    </>}
  </>;
}

export function ReportsWorkspace() {
  const today = new Date();
  const todayValue = today.toISOString().slice(0, 10);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(todayValue);
  const [appliedRange, setAppliedRange] = useState({ startDate: monthStart, endDate: todayValue });
  const [sales, setSales] = useState(null);
  const [profit, setProfit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSales(null);
    setProfit(null);
    Promise.all([
      getSalesReport(appliedRange, { signal: controller.signal }),
      getProfitReport(appliedRange, { signal: controller.signal }),
    ]).then(([salesResult, profitResult]) => {
      setSales(salesResult);
      setProfit(profitResult);
    }).catch((requestError) => {
      if (requestError.name !== "AbortError") setError(requestError.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [appliedRange]);

  function submitRange(event) {
    event.preventDefault();
    if (!startDate || !endDate || startDate > endDate) {
      setError("Choose a valid date range where the start is before or equal to the end.");
      return;
    }
    setAppliedRange({ startDate, endDate });
  }

  const maxDailySales = Math.max(...(sales?.dailySales || []).map((day) => day.sales), 0);
  return <>
    <div className="page-heading"><div className="heading-copy"><p className="eyebrow">INSIGHTS</p><h1>Reports</h1><p className="page-description">Sales are completed invoices only. Profit excludes collected tax and uses saved purchase-cost snapshots.</p></div></div>
    <form className="report-filters panel" onSubmit={submitRange}><div className="report-range"><label className="field" htmlFor="report-from"><span className="field-label">Start date</span><input id="report-from" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label><label className="field" htmlFor="report-to"><span className="field-label">End date</span><input id="report-to" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label></div><button className="button button-primary" type="submit" disabled={loading}>Apply dates</button></form>
    <ReportError error={error} />
    {loading && !sales ? <div className="report-loading"><span className="inline-loader" />Loading report data…</div> : sales && profit && <>
      <section className="stats-grid"><Metric label="Total sales" value={formatMoney(sales.summary.totalSales)} detail="Invoice totals, including tax" icon="$" tone="green" /><Metric label="Transactions" value={sales.summary.transactionCount.toLocaleString()} detail="Successful recorded sales" icon="↔" tone="blue" /><Metric label="Gross profit" value={formatMoney(profit.summary.grossProfit)} detail="After discount and cost of goods" icon="↗" tone="coral" /><Metric label="Cost of goods" value={formatMoney(profit.summary.costOfGoods)} detail="Historical purchase-cost snapshots" icon="□" tone="amber" /></section>
      <div className="reports-grid"><section className="panel chart-panel"><div className="panel-toolbar"><div><h2>Daily sales</h2><p>{appliedRange.startDate} to {appliedRange.endDate} · Includes tax</p></div></div>{sales.dailySales.length ? <><div className="chart-summary"><strong>{formatMoney(sales.summary.totalSales)}</strong><span>{sales.summary.transactionCount} transactions</span></div><div className="bar-chart" role="img" aria-label="Daily sales chart"><div className="chart-guides"><i>{formatMoney(maxDailySales)}</i><i>{formatMoney(maxDailySales / 2)}</i><i>$0</i></div><div className="bar-list">{sales.dailySales.map((day) => <span className="chart-bar" style={{ height: `${maxDailySales > 0 ? Math.max(4, (day.sales / maxDailySales) * 100) : 4}%` }} title={`${day.date}: ${formatMoney(day.sales)}`} key={day.date} />)}</div></div><div className="chart-axis"><span>{sales.dailySales[0].date}</span><span>{sales.dailySales[sales.dailySales.length - 1].date}</span></div></> : <div className="empty-inline report-empty">No sales in this date range.</div>}</section>
        <section className="panel category-panel"><div className="panel-toolbar"><div><h2>Profit summary</h2><p>Revenue less proportional discount and historical cost</p></div></div><div className="category-breakdown"><div className="category-row"><span>Merchandise revenue</span><strong>{formatMoney(profit.summary.merchandiseRevenue)}</strong></div><div className="category-row"><span>Cost of goods</span><strong>{formatMoney(profit.summary.costOfGoods)}</strong></div><div className="category-row"><span>Gross profit</span><strong>{formatMoney(profit.summary.grossProfit)}</strong></div><div className="category-row"><span>Transactions</span><strong>{profit.summary.transactionCount}</strong></div></div></section></div>
      <section className="panel table-panel report-products"><div className="panel-toolbar"><div><h2>Top-selling products</h2><p>Ranked by quantity sold</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Product</th><th>Units sold</th><th>Line sales</th></tr></thead><tbody>{sales.topSellingProducts.length ? sales.topSellingProducts.map((product) => <tr key={product.productId}><td>{product.productName}</td><td>{product.quantitySold}</td><td>{formatMoney(product.revenue)}</td></tr>) : <tr><td className="table-empty" colSpan="3">No products sold in this date range.</td></tr>}</tbody></table></div></section>
      <section className="panel table-panel report-products"><div className="panel-toolbar"><div><h2>Top product profit</h2><p>Historical cost snapshots with invoice discount allocated by line value</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Product snapshot</th><th>Units sold</th><th>Revenue after discount</th><th>Historical cost</th><th>Gross profit</th></tr></thead><tbody>{profit.topProductProfits.length ? profit.topProductProfits.map((product) => <tr key={product.productId}><td>{product.productName}</td><td>{product.quantitySold}</td><td>{formatMoney(product.merchandiseRevenue)}</td><td>{formatMoney(product.costOfGoods)}</td><td className="cell-strong">{formatMoney(product.grossProfit)}</td></tr>) : <tr><td className="table-empty" colSpan="5">No profit data in this date range.</td></tr>}</tbody></table></div></section>
      <p className="report-footnote">No cancellations or returns are currently recorded. Failed transactions are excluded because they are never committed.</p>
    </>}
  </>;
}