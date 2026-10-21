const express = require("express");
const salesController = require("../controllers/sales.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const { validateCreateSale, validateSaleListQuery } = require("../middleware/sales-validation");

const router = express.Router();

router.use(authenticate);
router.post("/", authorizeRoles("Admin", "Staff"), validateCreateSale, salesController.createSale);
router.get("/", authorizeRoles("Admin", "Staff"), validateSaleListQuery, salesController.listSales);
router.get("/:id", authorizeRoles("Admin", "Staff"), salesController.getSale);

module.exports = router;