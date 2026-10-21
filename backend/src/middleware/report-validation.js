const ApiError = require("../utils/api-error");

function dateValue(value, endOfDay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value);
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
}

function validateReportRange(req, res, next) {
  const query = req.query;
  const details = [];
  for (const key of Object.keys(query)) {
    if (!["startDate", "endDate"].includes(key)) details.push({ field: key, message: "This query parameter is not supported." });
  }
  for (const field of ["startDate", "endDate"]) {
    if (query[field] !== undefined && typeof query[field] !== "string") {
      details.push({ field, message: "Provide one valid date value." });
    } else if (query[field] !== undefined && Number.isNaN(Date.parse(query[field]))) {
      details.push({ field, message: "Provide a valid date." });
    } else if (typeof query[field] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query[field])) {
      const parsed = new Date(`${query[field]}T00:00:00.000Z`);
      if (parsed.toISOString().slice(0, 10) !== query[field]) {
        details.push({ field, message: "Provide a real calendar date." });
      }
    }
  }

  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startDate = query.startDate ? dateValue(query.startDate, false) : defaultStart;
  const endDate = query.endDate ? dateValue(query.endDate, true) : now;
  if (startDate > endDate) details.push({ field: "startDate", message: "Start date must be before or equal to end date." });
  if (details.length) return next(new ApiError(400, "Report date filters are invalid.", "VALIDATION_ERROR", details));

  req.reportRange = { startDate, endDate, match: { createdAt: { $gte: startDate, $lte: endDate } } };
  return next();
}

module.exports = { validateReportRange };