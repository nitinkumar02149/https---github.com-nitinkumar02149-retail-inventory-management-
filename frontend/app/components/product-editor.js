"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createProduct, getProduct, updateProduct } from "../lib/products-api";
import { useAuth } from "./auth-provider";
import { Field } from "./ui";

const categories = ["Kitchen", "Home", "Accessories", "Beauty", "Electronics"];
const fields = [
  { name: "name", label: "Product name", placeholder: "e.g. Ceramic pour-over set", required: true },
  { name: "sku", label: "SKU", placeholder: "e.g. KT-1042", required: true },
  { name: "category", label: "Category", options: categories, required: true },
  { name: "purchasePrice", label: "Purchase price", type: "number", min: 0, step: "0.01", placeholder: "0.00", required: true },
  { name: "sellingPrice", label: "Selling price", type: "number", min: 0, step: "0.01", placeholder: "0.00", required: true },
  { name: "stock", label: "Available stock", type: "number", min: 0, step: 1, placeholder: "0", required: true },
  { name: "reorderLevel", label: "Reorder level", type: "number", min: 0, step: 1, placeholder: "0", required: true },
];

export default function ProductEditor({ productId }) {
  const { user } = useAuth();
  const isEditing = Boolean(productId);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (user.role !== "Admin") {
    return <div className="form-feedback form-feedback-error" role="alert">Only Admin users can create or edit products.</div>;
  }

  useEffect(() => {
    if (!productId) return undefined;
    const controller = new AbortController();
    getProduct(productId, { signal: controller.signal })
      .then((result) => setProduct(result))
      .catch((error) => {
        if (error.name !== "AbortError") setFeedback({ kind: "error", message: error.message });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      sku: String(formData.get("sku")).trim(),
      name: String(formData.get("name")).trim(),
      category: String(formData.get("category")).trim(),
      purchasePrice: Number(formData.get("purchasePrice")),
      sellingPrice: Number(formData.get("sellingPrice")),
      reorderLevel: Number(formData.get("reorderLevel")),
    };
    if (!isEditing) payload.stock = Number(formData.get("stock"));

    try {
      const savedProduct = isEditing
        ? await updateProduct(productId, payload)
        : await createProduct(payload);
      setProduct(savedProduct);
      setFeedback({ kind: "success", message: isEditing ? "Product updated successfully." : "Product created successfully." });
    } catch (error) {
      const fieldErrors = error.details.map((detail) => `${detail.field}: ${detail.message}`);
      setFeedback({ kind: "error", message: [error.message, ...fieldErrors].join(" ") });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <section className="panel product-editor-loading" aria-busy="true"><span className="loading-title" /><span className="loading-description" /><span className="loading-table" /></section>;
  }

  if (feedback?.kind === "error" && isEditing && !product) {
    return <div className="form-feedback form-feedback-error" role="alert">{feedback.message} <Link href="/products">Return to products</Link></div>;
  }

  const editableFields = fields.filter((field) => !isEditing || field.name !== "stock").map((field) => ({
    ...field,
    options: field.name === "category" && product?.category && !categories.includes(product.category)
      ? [product.category, ...categories]
      : field.options,
    defaultValue: product?.[field.name] ?? "",
  }));

  return <div className="form-layout">
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="form-panel-heading"><h2>Product details</h2><p>Fields marked with an asterisk are required.</p></div>
      <div className="form-grid form-grid-2">{editableFields.map((field) => <Field key={field.name} {...field} />)}</div>
      {feedback && <div className={`form-feedback${feedback.kind === "error" ? " form-feedback-error" : ""}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</div>}
      <div className="form-actions"><span className="required-note">* Required fields</span><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Saving..." : isEditing ? "Save changes" : "Add product"}<span aria-hidden="true">→</span></button></div>
    </form>
    <aside className="aside-note"><span className="aside-icon">i</span><h2>{isEditing ? "Product status" : "Before you add"}</h2><p>{isEditing ? `${product?.isActive ? "Active" : "Inactive"} · SKU ${product?.sku}` : "Use a unique SKU. Set a reorder level that reflects supplier lead time."}</p><div className="aside-rule" /><small>Changes are stored in the connected database</small></aside>
  </div>;
}