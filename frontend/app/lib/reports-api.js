const apiRoot = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

async function request(path, { signal } = {}) {
  const response = await fetch(`${apiRoot}/api/reports/${path}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || "Report request failed.");
    error.status = response.status;
    error.code = body?.error?.code;
    error.details = body?.error?.details || [];
    throw error;
  }
  return body.data;
}

function dateQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  return params.size ? `?${params}` : "";
}

export function getSalesReport(filters, options) {
  return request(`sales${dateQuery(filters)}`, options);
}

export function getProfitReport(filters, options) {
  return request(`profit${dateQuery(filters)}`, options);
}