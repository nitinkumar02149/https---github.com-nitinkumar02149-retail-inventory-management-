const apiRoot = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${apiRoot}/api/sales${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || "Sales request failed.");
    error.status = response.status;
    error.code = body?.error?.code;
    error.details = body?.error?.details || [];
    throw error;
  }
  return body.data;
}

export function createSale(payload) {
  return request("", { method: "POST", body: JSON.stringify(payload) });
}

export function listSales(filters = {}, { signal } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value !== undefined && value !== null) query.set(key, String(value));
  }
  return request(`?${query}`, { signal, cache: "no-store" });
}

export function getSale(id, { signal } = {}) {
  return request(`/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
}