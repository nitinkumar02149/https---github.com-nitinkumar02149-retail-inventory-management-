const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productNameSnapshot: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  unitPriceSnapshot: { type: Number, required: true, min: 0 },
  purchaseCostSnapshot: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, immutable: true },
  items: { type: [saleItemSchema], required: true, validate: { validator: (items) => items.length > 0, message: "A sale must contain at least one item." } },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, required: true, min: 0, max: 1 },
  taxAmount: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

saleSchema.index({ createdAt: -1 });
saleSchema.index({ createdBy: 1, createdAt: -1 });
saleSchema.index({ "items.productId": 1, createdAt: -1 });

module.exports = mongoose.models.Sale || mongoose.model("Sale", saleSchema);