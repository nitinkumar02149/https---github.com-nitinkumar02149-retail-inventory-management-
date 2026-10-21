"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listProducts } from "../lib/products-api";
import { createSale } from "../lib/sales-api";
import { formatMoney } from "../data/preview-data";

export default function SalesWorkspaceLive() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState("0");
  const [taxPercent, setTaxPercent] = useState("8");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confirmedSale, setConfirmedSale] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    listProducts({ page: 1, limit: 100, isActive: true, outOfStock: false, sortBy: "name", sortOrder: "asc" }, { signal: controller.signal })
      .then((result) => {
        setProducts(result.products);
        setSelectedProductId(result.products[0]?._id || "");
      })
      .catch((error) => { if (error.name !== "AbortError") setLoadError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoadingProducts(false); });
    return () => controller.abort();
  }, []);

  const availableProducts = products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase()));
  const cartItems = useMemo(() => cart.map((item) => ({ ...item, product: products.find((product) => product._id === item.productId) })).filter((item) => item.product), [cart, products]);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const discountAmount = Number(discount || 0);
  const taxRate = Number(taxPercent || 0) / 100;
  const taxAmount = Math.max(0, Math.round((subtotal - discountAmount) * taxRate * 100) / 100);
  const total = Math.max(0, Math.round((subtotal - discountAmount + taxAmount) * 100) / 100);

  function addProduct() {
    if (!selectedProductId) return;
    setFeedback(null);
    setCart((current) => {
      const found = current.find((item) => item.productId === selectedProductId);
      if (found) return current.map((item) => item.productId === selectedProductId ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { productId: selectedProductId, quantity: 1 }];
    });
  }

  function updateQuantity(productId, quantity) {
    setCart((current) => current.map((item) => item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item));
  }

  function removeProduct(productId) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  async function completeSale() {
    setFeedback(null);
    setConfirmedSale(null);
    if (!cartItems.length) return setFeedback({ kind: "error", message: "Add at least one product to the cart." });
    if (!Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > subtotal) return setFeedback({ kind: "error", message: "Discount must be between $0 and the subtotal." });
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) return setFeedback({ kind: "error", message: "Tax rate must be between 0% and 100%." });

    setSubmitting(true);
    try {
      const sale = await createSale({
        items: cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        discount: discountAmount,
        taxRate,
      });
      setConfirmedSale(sale);
      setFeedback({ kind: "success", message: `Sale recorded. Invoice ${sale.invoiceNumber} created.` });
      setCart([]);
      listProducts({ page: 1, limit: 100, isActive: true, outOfStock: false, sortBy: "name", sortOrder: "asc" })
        .then((refreshed) => setProducts(refreshed.products))
        .catch(() => setLoadError("Sale saved; product availability could not be refreshed. Reload to check stock."));
    } catch (error) {
      const details = error.details.map((detail) => `${detail.field}: ${detail.message}`);
      setFeedback({ kind: "error", message: [error.message, ...details].join(" ") });
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="sales-layout">
    <section className="sales-products panel">
      <div className="panel-heading"><div><p className="eyebrow">NEW TRANSACTION</p><h2>Build a sale</h2></div><span className="sample-pill">LIVE INVENTORY</span></div>
      {loadError && <div className="form-feedback form-feedback-error" role="alert">Could not load products: {loadError}</div>}
      <label className="field" htmlFor="sale-search"><span className="field-label">Search products</span><input id="sale-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or SKU" /></label>
      <label className="field sale-product-picker" htmlFor="product-selector"><span className="field-label">Select available product</span><select id="product-selector" value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} disabled={loadingProducts || !availableProducts.length}><option value="">{loadingProducts ? "Loading products…" : "Select a product"}</option>{availableProducts.map((product) => <option value={product._id} key={product._id}>{product.name} · {product.sku} · {formatMoney(product.sellingPrice)} · {product.stock} available</option>)}</select></label>
      <button className="button button-secondary add-to-sale" type="button" onClick={addProduct} disabled={!selectedProductId || loadingProducts}>＋ Add to sale</button>
      <div className="cart-heading"><h3>Cart</h3><span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} units</span></div>
      <div className="cart-list">{cartItems.map((item) => <div className="cart-line" key={item.productId}><span className="product-thumb">{item.product.name.slice(0, 1)}</span><div className="cart-product"><strong>{item.product.name}</strong><small>{formatMoney(item.product.sellingPrice)} each · {item.product.stock} available</small></div><div className="quantity-control"><button aria-label={`Decrease ${item.product.name} quantity`} onClick={() => updateQuantity(item.productId, item.quantity - 1)} type="button" disabled={item.quantity <= 1}>−</button><input aria-label={`${item.product.name} quantity`} type="number" min="1" max={item.product.stock} value={item.quantity} onChange={(event) => updateQuantity(item.productId, Number(event.target.value))} /><button aria-label={`Increase ${item.product.name} quantity`} onClick={() => updateQuantity(item.productId, item.quantity + 1)} type="button" disabled={item.quantity >= item.product.stock}>＋</button></div><strong>{formatMoney(item.product.sellingPrice * item.quantity)}</strong><button className="icon-button row-action" type="button" onClick={() => removeProduct(item.productId)} aria-label={`Remove ${item.product.name}`}>×</button></div>)}{!cartItems.length && <p className="empty-inline">{loadingProducts ? "Loading active products…" : "No items in this sale yet."}</p>}</div>
      {confirmedSale && <Link className="text-link confirmed-invoice-link" href="/invoices">View invoice {confirmedSale.invoiceNumber}<span aria-hidden="true">→</span></Link>}
      {feedback && <div className={`form-feedback${feedback.kind === "error" ? " form-feedback-error" : ""}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</div>}
      <p className="checkout-note">The server rechecks prices, activity, and stock before saving.</p>
    </section>
    <aside className="order-summary panel">
      <div className="panel-heading"><div><p className="eyebrow">CHECKOUT</p><h2>Order summary</h2></div></div>
      <div className="summary-row"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
      <label className="summary-row discount-row" htmlFor="discount"><span>Discount</span><span className="discount-input"><span>$</span><input id="discount" type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></span></label>
      <label className="summary-row discount-row" htmlFor="tax-rate"><span>Tax rate</span><span className="discount-input"><input id="tax-rate" type="number" min="0" max="100" step="0.01" value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)} /><span>%</span></span></label>
      <div className="summary-row"><span>Tax</span><strong>{formatMoney(taxAmount)}</strong></div>
      <div className="summary-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
      <button className="button button-primary checkout-button" type="button" onClick={completeSale} disabled={submitting || !cartItems.length}>{submitting ? "Recording sale…" : "Confirm sale"}<span aria-hidden="true">→</span></button>
      <p className="checkout-note">Stock and invoice are saved together only after confirmation.</p>
    </aside>
  </div>;
}