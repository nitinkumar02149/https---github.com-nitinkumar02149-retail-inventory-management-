const express = require("express");
const inventoryController = require("../controllers/inventory.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const { validateAdjustment, validateLowStockQuery, validateMovementQuery } = require("../middleware/inventory-validation");

const router = express.Router();

router.use(authenticate);
router.post("/adjustments", authorizeRoles("Admin"), validateAdjustment, inventoryController.createAdjustment);
router.get("/movements", validateMovementQuery, inventoryController.listMovements);
router.get("/low-stock", validateLowStockQuery, inventoryController.listLowStock);

module.exports = router;