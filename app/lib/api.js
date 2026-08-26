import { products as fallbackProducts } from "../data";

const sessionStorageKey = "retail-auth-session";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001/api";
const cartStorageKey = "retail-customer-cart";

function getLocalCart() {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(cartStorageKey);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveLocalCart(items) {
  if (typeof window !== "undefined") window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
}

export function getSession() {
  if (typeof window === "undefined") return null;

  const saved = localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey);
  if (!saved) return null;

  try {
    const session = JSON.parse(saved);
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(sessionStorageKey);
  sessionStorage.removeItem(sessionStorageKey);
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function fallbackApiFetch(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/products/customer") {
    return { products: fallbackProducts.map((product) => ({ ...product, frontDeskVisible: product.frontDeskVisible ?? true, barcode: product.barcode || product.sku, images: product.images || [] })) };
  }
  if (normalizedPath === "/cart") {
    if (options.method && options.method.toUpperCase() === "PUT") {
      const items = Array.isArray(options.body?.items) ? options.body.items.map((item) => ({ id: item.product_id, product_id: item.product_id, quantity: Number(item.quantity || 1), cartKey: `${item.product_id}-${item.product_id}` })) : [];
      saveLocalCart(items);
      return { cart: { items } };
    }
    return { cart: { items: getLocalCart() } };
  }
  throw new Error("Request failed.");
}

export async function apiFetch(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isFallbackEndpoint = normalizedPath === "/products/customer" || normalizedPath === "/cart";
  let activeOutletId = typeof window !== "undefined"
    ? window.localStorage.getItem("retail-active-outlet")
    : null;
  if (activeOutletId) {
    try {
      const parsedOutlet = JSON.parse(activeOutletId);
      activeOutletId = parsedOutlet?.id ? String(parsedOutlet.id) : activeOutletId;
    } catch {
      // The stored value is already the outlet ID.
    }
  }
  activeOutletId ||= typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("outlet_id")
    : null;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  const requestPath = activeOutletId && !normalizedPath.startsWith("/outlets")
    ? `${normalizedPath}${separator}outlet_id=${encodeURIComponent(activeOutletId)}`
    : normalizedPath;
  const session = getSession();
  const fetchOptions = {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `${session.tokenType || "Bearer"} ${session.token}` } : {}),
      ...(options.headers || {})
    },
    ...options,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  };
  try {
    const response = await fetch(`${apiBaseUrl}${requestPath}`, fetchOptions);
    if (!response.ok) {
      if (isFallbackEndpoint) return fallbackApiFetch(normalizedPath, options);
      let message = "Request failed.";
      let data = {};
      try { data = await response.json(); if (data?.message) message = data.message; } catch {}
      if (response.status === 401) {
        clearSession();
        if (typeof window !== "undefined") window.location.href = "/login";
      }
      throw new ApiError(message, response.status, data);
    }
    if (response.status === 204) return null;
    try { return await response.json(); } catch { return null; }
  } catch (error) {
    if (isFallbackEndpoint) return fallbackApiFetch(normalizedPath, options);
    throw error;
  }
}

export default apiFetch;
