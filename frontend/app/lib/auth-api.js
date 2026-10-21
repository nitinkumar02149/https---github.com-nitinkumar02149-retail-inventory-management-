const apiRoot = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${apiRoot}/api/auth${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || "Authentication request failed.");
    error.status = response.status;
    error.code = body?.error?.code;
    throw error;
  }
  return body.data;
}

export function signIn(email, password) {
  return request("/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function getSession({ signal } = {}) {
  return request("/me", { signal, cache: "no-store" });
}

export function signOut() {
  return request("/logout", { method: "POST" });
}