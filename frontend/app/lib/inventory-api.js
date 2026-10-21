const apiRoot = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${apiRoot}/api/inventory${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || "Inventory request failed.");
    error.status = response.status;
    error.code = body?.error?.code;
    error.details = body?.error?.details || [];
    throw error;
  }
  return body.data;
}

export function listMovements(filters, { signal } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value !== undefined && value !== null) query.set(key, String(value));
  }
  return request(`/movements?${query}`, { signal, cache: "no-store" });
}

export function listLowStock(status = "all", { signal } = {}) {
  return request(`/low-stock?status=${encodeURIComponent(status)}`, { signal, cache: "no-store" });
}

export function createAdjustment(adjustment) {
  return request("/adjustments", { method: "POST", body: JSON.stringify(adjustment) });
}