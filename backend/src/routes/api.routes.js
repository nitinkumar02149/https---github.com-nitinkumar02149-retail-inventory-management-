const express = require("express");
const healthRoutes = require("./health.routes");
const productRoutes = require("./product.routes");
const authRoutes = require("./auth.routes");
const inventoryRoutes = require("./inventory.routes");
const salesRoutes = require("./sales.routes");
const reportRoutes = require("./report.routes");

const router = express.Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/sales", salesRoutes);
router.use("/reports", reportRoutes);

module.exports = router;