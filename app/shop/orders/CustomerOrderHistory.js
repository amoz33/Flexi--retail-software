"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, MessageSquareText, PackageCheck, Truck } from "lucide-react";
import DataTable from "../../components/DataTable";
import { formatNaira, getStatusClass } from "../../data";
import { apiFetch, getSession } from "../../lib/api";

const customerLookupStorageKey = "retail-customer-order-lookup";

export default function CustomerOrderHistory() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [lookup, setLookup] = useState({ email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getSession();
    const savedLookup = localStorage.getItem(customerLookupStorageKey);
    let initialLookup = { email: "", phone: "" };

    if (savedLookup) {
      try {
        initialLookup = JSON.parse(savedLookup);
      } catch {
        localStorage.removeItem(customerLookupStorageKey);
      }
    }

    // A logged-in customer's own account email always takes priority over
    // whatever was previously saved, so their history loads automatically.
    if (session?.email) {
      initialLookup = { ...initialLookup, email: session.email };
    }

    setLookup(initialLookup);

    if (initialLookup.email || initialLookup.phone) {
      loadOrders(initialLookup);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackingSteps = [
    "Order Received",
    "Payment Confirmed",
    "Preparing Order",
    "Out for Delivery",
    "Delivered"
  ];

  function getTrackingIndex(order) {
    if (!order) return 0;
    if (order.status === "Delivered" || order.deliveryStatus === "Delivered") return 4;
    if (order.status === "Shipped" || order.deliveryStatus === "Out for Delivery") return 3;
    if (order.status === "Packed" || order.deliveryStatus === "Preparing Order") return 2;
    if (order.paymentStatus === "Paid") return 1;
    return 0;
  }

  function getItemsTotal(order) {
    return order?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  }

  function toggleOrderDetails(order) {
    setSelectedOrder((currentOrder) => currentOrder?.id === order.id ? null : order);
    setComment(order.deliveryComment || "");
  }

  async function loadOrders(nextLookup = lookup) {
    if (!nextLookup.email && !nextLookup.phone) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextLookup.email) params.set("email", nextLookup.email);
      if (nextLookup.phone) params.set("phone", nextLookup.phone);
      
      const data = await apiFetch(`/orders/customer?${params.toString()}`);
      setOrders(data.orders || []);
    } catch (error) {
      setMessage(error.message || "Cannot reach the order API.");
    } finally {
      setLoading(false);
    }
  }

  function saveLookup(event) {
    event.preventDefault();
    localStorage.setItem(customerLookupStorageKey, JSON.stringify(lookup));
    loadOrders(lookup);
  }

  async function confirmDelivered(order) {
    if (!order.databaseId) return;

    try {
      const data = await apiFetch(`/orders/${order.databaseId}/delivered`, {
        method: "PATCH",
        body: { comment }
      });

      setOrders((currentOrders) => currentOrders.map((item) => item.databaseId === data.order.databaseId ? data.order : item));
      setSelectedOrder(data.order);
      setMessage(`${data.order.id} has been confirmed delivered.`);
    } catch (error) {
      setMessage(error.message || "Delivery could not be confirmed.");
    }
  }

  return (
    <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Purchase History</h2>
            <p>{orders.length} purchase record{orders.length === 1 ? "" : "s"} saved</p>
          </div>
        </div>

        <div className="cashier-panel">
          <form className="customer-order-lookup" onSubmit={saveLookup}>
            {message && <div className="front-desk-message">{message}</div>}
            <label className="field-group">
              <span>Email</span>
              <input type="email" value={lookup.email} onChange={(event) => setLookup((current) => ({ ...current, email: event.target.value }))} placeholder="customer@email.com" />
            </label>
            <label className="field-group">
              <span>Phone</span>
              <input value={lookup.phone} onChange={(event) => setLookup((current) => ({ ...current, phone: event.target.value }))} placeholder="+234..." />
            </label>
            <button className="btn-gold" type="submit">Refresh Orders</button>
          </form>

          {loading && <div className="empty-table-cell">Loading your orders...</div>}

          <DataTable
          columns={["Order", "Customer", "Items", "Option", "Payment", "Payment Status", "Total", "Status", "Details"]}
          rows={orders}
          rowKey={(order) => order.id}
          emptyMessage="No purchases or orders yet."
          tableClassName="product-data-table shop-orders-table"
          renderRow={(order) => (
            <>
              <td><span className="order-id">{order.id}</span></td>
              <td><strong>{order.customerName}</strong></td>
              <td>{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</td>
              <td>{order.deliveryOption || "Home Delivery"}</td>
              <td>{order.paymentMethod}</td>
              <td><span className={`status-badge ${order.paymentStatus === "Paid" ? "status-active" : "status-pending"}`}>{order.paymentStatus || "Pending"}</span></td>
              <td className="gold-text">{formatNaira(order.total || 0)}</td>
              <td><span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span></td>
              <td>
                <button
                  className={`btn-outline product-row-button shop-order-view-button ${selectedOrder?.id === order.id ? "active" : ""}`}
                  type="button"
                  onClick={() => toggleOrderDetails(order)}
                  aria-expanded={selectedOrder?.id === order.id}
                  aria-controls="shop-order-details"
                >
                  Details <ChevronDown />
                </button>
              </td>
            </>
          )}
        />
        </div>
      {selectedOrder && (
        <div className="shop-order-detail shop-order-dropdown" id="shop-order-details">
          <div className="section-header product-table-header">
            <div>
              <h2><PackageCheck /> Order Details</h2>
              <p>{selectedOrder.id} | {selectedOrder.createdAt || "No date"}</p>
            </div>
            <span className={`status-badge ${selectedOrder.paymentStatus === "Paid" ? "status-active" : "status-pending"}`}>
              {selectedOrder.paymentStatus || "Pending"}
            </span>
          </div>

          <div className="shop-order-detail-grid">
            <div className="shop-order-summary-panel">
              <h3>Customer</h3>
              <p><strong>{selectedOrder.customerName}</strong></p>
              <p>{selectedOrder.phone || "No phone"}</p>
              <p>{selectedOrder.address}</p>
              {selectedOrder.deliveryNote && <p>{selectedOrder.deliveryNote}</p>}
            </div>

            <div className="shop-order-summary-panel">
              <h3>Payment</h3>
              <div><span>Method</span><strong>{selectedOrder.paymentMethod}</strong></div>
              <div><span>Items</span><strong>{formatNaira(getItemsTotal(selectedOrder))}</strong></div>
              <div><span>Delivery</span><strong>{formatNaira(selectedOrder.deliveryFee || 0)}</strong></div>
              <div><span>Total Paid</span><strong>{formatNaira(selectedOrder.total || 0)}</strong></div>
            </div>
          </div>

          <div className="shop-order-items">
            <h3>Items Ordered</h3>
            {selectedOrder.items?.map((item) => (
              <div className="shop-order-item" key={item.cartKey || item.sku}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.sku}</span>
                </div>
                <div>
                  <span>{item.quantity} x {formatNaira(item.price)}</span>
                  <strong>{formatNaira(item.price * item.quantity)}</strong>
                </div>
              </div>
            ))}
          </div>

          {(selectedOrder.deliveryOption || "Home Delivery") === "Home Delivery" && (
            <div className="shop-delivery-tracker">
              <h3><Truck /> Delivery Tracking</h3>
              <div className="shop-tracking-steps">
                {trackingSteps.map((step, index) => (
                  <div className={`shop-tracking-step ${index <= getTrackingIndex(selectedOrder) ? "active" : ""}`} key={step}>
                    <span>{index + 1}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedOrder.status === "Shipped" && (
            <div className="delivery-confirm-panel">
              <h3><MessageSquareText /> Delivery Feedback</h3>
              <label className="field-group">
                <span>Comment</span>
                <textarea rows="4" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Tell us how the delivery went." />
              </label>
              <button className="btn-gold" type="button" onClick={() => confirmDelivered(selectedOrder)}>
                <CheckCircle2 /> Confirm Delivered
              </button>
            </div>
          )}

          {selectedOrder.status === "Delivered" && selectedOrder.deliveryComment && (
            <div className="delivery-confirm-panel">
              <h3><CheckCircle2 /> Delivery Confirmed</h3>
              <p>{selectedOrder.deliveryComment}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
