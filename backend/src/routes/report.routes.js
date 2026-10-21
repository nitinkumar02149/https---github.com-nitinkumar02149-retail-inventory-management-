const express = require("express");
const reportController = require("../controllers/report.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const { validateReportRange } = require("../middleware/report-validation");

const router = express.Router();

router.use(authenticate, authorizeRoles("Admin", "Staff"), validateReportRange);
router.get("/sales", reportController.salesReport);
router.get("/profit", reportController.profitReport);

module.exports = router;