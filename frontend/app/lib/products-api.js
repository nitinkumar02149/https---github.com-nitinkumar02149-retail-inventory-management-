const apiRoot = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${apiRoot}/api${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(body?.message || "The API request failed.");
    error.status = response.status;
    error.code = body?.error?.code;
    error.details = body?.error?.details || [];
    throw error;
  }

  return body.data;
}

export function listProducts(filters, { signal } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value !== undefined && value !== null) query.set(key, String(value));
  }
  return request(`/products?${query.toString()}`, { signal, cache: "no-store" });
}

export function getProduct(id, { signal } = {}) {
  return request(`/products/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
}

export function createProduct(product) {
  return request("/products", { method: "POST", body: JSON.stringify(product) });
}

export function updateProduct(id, product) {
  return request(`/products/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(product) });
}

export function updateProductStatus(id, isActive) {
  return request(`/products/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}