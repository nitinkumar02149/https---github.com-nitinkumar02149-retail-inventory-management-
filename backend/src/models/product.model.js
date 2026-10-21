const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    minlength: 1,
    maxlength: 64,
  },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
  category: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  purchasePrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    validate: { validator: Number.isInteger, message: "Stock must be a whole number." },
  },
  reorderLevel: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    validate: { validator: Number.isInteger, message: "Reorder level must be a whole number." },
  },
  isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true, versionKey: false });

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ stock: 1, reorderLevel: 1 });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);