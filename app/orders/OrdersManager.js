"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import RecentOrdersTable from "../components/RecentOrdersTable";
import OrderCreationDropdown from "./OrderCreationDropdown";

const sessionStorageKey = "retail-auth-session";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

function orderMatchesQuery(order, query) {
  if (!query) return true;

  const searchableText = [
    order.id,
    order.customer,
    order.total,
    order.status,
    order.progress,
    order.date,
    order.month
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

function mergeByOrderId(currentOrders, incomingOrder) {
  const existingIndex = currentOrders.findIndex((order) => order.id === incomingOrder.id);
  if (existingIndex === -1) return [incomingOrder, ...currentOrders];

  return currentOrders.map((order, index) => (
    index === existingIndex ? { ...order, ...incomingOrder } : order
  ));
}

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey) || "null");
  } catch {
    return null;
  }
}

export default function OrdersManager({ initialOrders }) {
  const [tableOrders, setTableOrders] = useState([...initialOrders].reverse());
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState(null);
  const filteredOrders = tableOrders.filter((order) => orderMatchesQuery(order, query.trim()));

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  useEffect(() => {
    if (!session?.token) return;

    async function loadOrders() {
      try {
        const response = await fetch(`${apiBaseUrl}/orders`, {
          headers: {
            "Accept": "application/json",
            "Authorization": `${session.tokenType || "Bearer"} ${session.token}`
          },
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setMessage(data.message || "Could not load backend orders.");
          return;
        }

        setTableOrders(data.orders || []);
      } catch {
        setMessage("Cannot reach the order API. Showing local sample orders for now.");
      }
    }

    loadOrders();
  }, [session]);

  function addOrder(order) {
    setTableOrders((currentOrders) => mergeByOrderId(currentOrders, order));
  }

  async function updateOrderStatus(order, status) {
    if (!session?.token || !order.databaseId) return;

    try {
      const response = await fetch(`${apiBaseUrl}/orders/${order.databaseId}/status`, {
        method: "PATCH",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `${session.tokenType || "Bearer"} ${session.token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "Order status could not be updated.");
        return;
      }

      setTableOrders((currentOrders) => currentOrders.map((item) => item.databaseId === data.order.databaseId ? data.order : item));
      setMessage(`${data.order.id} is now ${data.order.status}.`);
    } catch {
      setMessage("Cannot reach the order API. Try again when the backend is running.");
    }
  }

  return (
    <>
      <OrderCreationDropdown onCreateOrder={addOrder} />

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Order Table</h2>
            <p>{filteredOrders.length} of {tableOrders.length} order{tableOrders.length === 1 ? "" : "s"}</p>
          </div>

          <label className="product-search">
            <Search />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order ID, customer, status..."
              aria-label="Search orders"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear order search">
                <X />
              </button>
            )}
          </label>
        </div>

        {message && <div className="front-desk-message">{message}</div>}

        <RecentOrdersTable orders={filteredOrders} onUpdateStatus={updateOrderStatus} />
      </section>
    </>
  );
}
