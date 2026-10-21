const mongoose = require("mongoose");

const movementTypes = ["STOCK_RECEIVED", "MANUAL_INCREASE", "MANUAL_DECREASE", "SALE", "SALE_RETURN"];

const inventoryMovementSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  type: { type: String, enum: movementTypes, required: true },
  quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  previousStock: { type: Number, required: true, min: 0 },
  newStock: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, required: true, default: Date.now, index: true },
}, { versionKey: false });

inventoryMovementSchema.pre("validate", function validateStockTransition() {
  const increasesStock = ["STOCK_RECEIVED", "MANUAL_INCREASE", "SALE_RETURN"].includes(this.type);
  const expectedStock = increasesStock
    ? this.previousStock + this.quantity
    : this.previousStock - this.quantity;

  if (expectedStock < 0 || this.newStock !== expectedStock) {
    this.invalidate("newStock", "New stock must match the movement type and quantity.");
  }
});

inventoryMovementSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.models.InventoryMovement || mongoose.model("InventoryMovement", inventoryMovementSchema);
module.exports.movementTypes = movementTypes;