"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import RecentOrdersTable from "../components/RecentOrdersTable";
import { apiFetch } from "../lib/api";
import OrderCreationDropdown from "./OrderCreationDropdown";

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

export default function OrdersManager() {
  const [tableOrders, setTableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const filteredOrders = tableOrders.filter((order) => orderMatchesQuery(order, query.trim()));

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const data = await apiFetch("/orders");
        if (!cancelled) setTableOrders(data.orders || []);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();
    return () => { cancelled = true; };
  }, []);

  function addOrder(order) {
    setTableOrders((currentOrders) => mergeByOrderId(currentOrders, order));
  }

  async function updateOrderStatus(order, status) {
    if (!order.databaseId) {
      setMessage("This order has no database record and cannot be updated.");
      return;
    }

    try {
      const data = await apiFetch(`/orders/${order.databaseId}/status`, {
        method: "PATCH",
        body: { status }
      });
      setTableOrders((currentOrders) => currentOrders.map((item) => (
        item.databaseId === data.order.databaseId ? data.order : item
      )));
      setMessage(`${data.order.id} is now ${data.order.status}.`);
    } catch (error) {
      setMessage(error.message || "Order status could not be updated.");
    }
  }

  return (
    <>
      <OrderCreationDropdown onCreateOrder={addOrder} />

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Order Table</h2>
            <p>
              {loading
                ? "Loading orders..."
                : `${filteredOrders.length} of ${tableOrders.length} order${tableOrders.length === 1 ? "" : "s"}`}
            </p>
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