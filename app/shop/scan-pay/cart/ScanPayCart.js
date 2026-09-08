"use client";

import Link from "next/link";
import { Banknote, CreditCard, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatNaira } from "../../../data";
import { apiFetch, getSession } from "../../../lib/api";

const receiptStorageKey = "retail-last-receipt";
const pendingOrderStorageKey = "retail-pending-order";

export default function ScanPayCart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getSession();
    if (session?.name) setCustomerName(session.name);
    if (session?.email) setCustomerEmail(session.email);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      try {
        const data = await apiFetch("/cart");
        if (!cancelled) setItems(data.cart?.items || []);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load your cart.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCart();
    return () => { cancelled = true; };
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryFee = 0; // Scan & Pay is in-store pickup, no delivery fee
  const total = subtotal + deliveryFee;

  async function syncCart(nextItems) {
    setItems(nextItems);
    try {
      await apiFetch("/cart", {
        method: "PUT",
        body: { items: nextItems.map((item) => ({ product_id: item.product_id, quantity: item.quantity })) }
      });
    } catch (error) {
      setMessage(error.message || "Could not update cart.");
    }
  }

  function updateQuantity(productId, nextQuantity) {
    const quantity = Math.max(0, Number(nextQuantity) || 0);
    const nextItems = quantity
      ? items.map((item) => (item.product_id === productId ? { ...item, quantity } : item))
      : items.filter((item) => item.product_id !== productId);
    syncCart(nextItems);
  }

  function removeItem(productId) {
    syncCart(items.filter((item) => item.product_id !== productId));
  }

  function buildOrderPayload(paymentStatus, paymentReference) {
    return {
      source: "Scan & Pay",
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim() || null,
        email: customerEmail.trim() || null
      },
      delivery_option: "In-Store Pickup",
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_reference: paymentReference || null,
      items: items.map((item) => ({
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal,
      delivery_fee: deliveryFee,
      total
    };
  }

  function saveReceiptAndRedirect(order, router) {
    const receipt = {
      id: order.orderNumber || order.order_number || order.id,
      createdAt: new Date().toLocaleString(),
      items: items.map((item, index) => ({
        cartKey: `${item.product_id}-${index}`,
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity
      })),
      total
    };
    localStorage.setItem(receiptStorageKey, JSON.stringify(receipt));
  }

  async function handlePayInStore(event) {
    event.preventDefault();
    if (!customerName.trim()) {
      setMessage("Please enter the customer's name.");
      return;
    }
    if (!items.length) {
      setMessage("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch("/orders", {
        method: "POST",
        body: buildOrderPayload("Pending")
      });

      saveReceiptAndRedirect(data.order);
      await apiFetch("/cart", { method: "DELETE" });
      window.location.href = "/shop/scan-pay/receipt";
    } catch (error) {
      setMessage(error.message || "Could not complete the order.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayOnline(event) {
    event.preventDefault();
    if (!customerName.trim()) {
      setMessage("Please enter the customer's name.");
      return;
    }
    if (!items.length) {
      setMessage("Your cart is empty.");
      return;
    }

    if (paymentMethod === "MoMo") {
      return handlePayMomo();
    }

    const gatewayConfig = {
      Paystack: { endpoint: "/payments/initialize", requiresEmail: true },
      DPO: { endpoint: "/payments/dpo/initialize", requiresEmail: true },
      PawaPay: { endpoint: "/payments/pawapay/initialize", requiresEmail: false }
    }[paymentMethod];

    if (!gatewayConfig) return;

    if (gatewayConfig.requiresEmail && !customerEmail.trim()) {
      setMessage("An email address is required for this payment method.");
      return;
    }

    setSubmitting(true);
    try {
      const reference = `SCANPAY-${Date.now()}`;

      localStorage.setItem(pendingOrderStorageKey, JSON.stringify({
        reference,
        gateway: paymentMethod.toLowerCase(),
        order: buildOrderPayload("Paid", reference)
      }));

      const callbackUrl = `${window.location.origin}/shop/scan-pay/callback`;
      const body = paymentMethod === "Paystack"
        ? { email: customerEmail.trim(), amount: total, reference, callback_url: callbackUrl }
        : paymentMethod === "DPO"
          ? { email: customerEmail.trim(), amount: total, reference, first_name: customerName.trim().split(" ")[0], last_name: customerName.trim().split(" ").slice(1).join(" "), currency: "RWF", callback_url: callbackUrl }
          : { amount: total, currency: "ZMW", reference, callback_url: callbackUrl, reason: `Order ${reference}` };

      const data = await apiFetch(gatewayConfig.endpoint, { method: "POST", body });
      window.location.href = data.authorization_url;
    } catch (error) {
      setMessage(error.message || "Could not start online payment.");
      setSubmitting(false);
    }
  }

  async function handlePayMomo() {
    if (!customerPhone.trim()) {
      setMessage("A MoMo phone number is required.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const reference = `SCANPAY-${Date.now()}`;
      const data = await apiFetch("/payments/momo/initialize", {
        method: "POST",
        body: { amount: total, currency: "NGN", reference, phone: customerPhone.trim() }
      });

      setMessage(data.message || "A payment prompt was sent to the customer's phone. Waiting for approval...");

      const orderPayload = buildOrderPayload("Paid", reference);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts += 1;
        try {
          const statusData = await apiFetch(`/payments/momo/verify/${data.gateway_reference}`);
          if (statusData.status === "success") {
            clearInterval(poll);
            const orderData = await apiFetch("/orders", { method: "POST", body: orderPayload });
            saveReceiptAndRedirect(orderData.order);
            await apiFetch("/cart", { method: "DELETE" });
            window.location.href = "/shop/scan-pay/receipt";
          } else if (statusData.status === "failed") {
            clearInterval(poll);
            setMessage("The customer declined or the MoMo payment failed. Please try again.");
            setSubmitting(false);
          } else if (attempts >= 24) {
            // ~2 minutes at 5s intervals
            clearInterval(poll);
            setMessage("Still waiting on the customer's approval. Check again shortly, or try a different payment method.");
            setSubmitting(false);
          }
        } catch (error) {
          clearInterval(poll);
          setMessage(error.message || "Could not check MoMo payment status.");
          setSubmitting(false);
        }
      }, 5000);
    } catch (error) {
      setMessage(error.message || "Could not start MoMo payment.");
      setSubmitting(false);
    }
  }
      window.location.href = data.authorization_url;
    } catch (error) {
      setMessage(error.message || "Could not start online payment.");
      setSubmitting(false);
    }
  }

  function handlePay(event) {
    if (["Paystack", "DPO", "PawaPay", "MoMo"].includes(paymentMethod)) return handlePayOnline(event);
    return handlePayInStore(event);
  }

  return (
    <section className="section-card">
      <div className="section-header product-table-header">
        <div>
          <h2>Scan Pay Cart</h2>
          <p>{items.length} item{items.length === 1 ? "" : "s"} selected</p>
        </div>
      </div>

      <div className="cashier-panel">
        {message && <div className="front-desk-message">{message}</div>}

        {loading && <div className="empty-table-cell">Loading your cart...</div>}

        {!loading && items.length === 0 ? (
          <div className="empty-table-cell">Your cart is empty. Add products from the Scan & Pay page.</div>
        ) : (
          items.map((item) => (
            <div key={item.product_id} className="field-group" style={{
              border: "1px solid rgba(201,160,32,0.22)",
              borderRadius: "18px",
              padding: "16px",
              background: "rgba(255,255,255,0.6)",
              gap: "8px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.sku}</span>
                </div>
                <button className="icon-button" type="button" onClick={() => removeItem(item.product_id)} aria-label={`Remove ${item.name}`}>
                  <Trash2 />
                </button>
              </div>

              <div className="front-desk-sale-controls">
                <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}><Minus /></button>
                <input type="number" min="0" value={item.quantity} onChange={(event) => updateQuantity(item.product_id, event.target.value)} />
                <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}><Plus /></button>
              </div>

              <strong className="gold-text">{formatNaira(item.price * item.quantity)}</strong>
            </div>
          ))
        )}

        {items.length > 0 && (
          <form className="cashier-total-panel" onSubmit={handlePay}>
            <div className="field-group">
              <span>Customer Name</span>
              <input type="text" value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
            </div>
            <div className="field-group">
              <span>Phone {paymentMethod === "MoMo" && "(required — this is where the PIN prompt is sent)"}</span>
              <input type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder={paymentMethod === "MoMo" ? "e.g. 2348012345678" : ""} required={paymentMethod === "MoMo"} />
            </div>
            <div className="field-group">
              <span>Email {(paymentMethod === "Paystack" || paymentMethod === "DPO") && "(required for this payment method)"}</span>
              <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required={paymentMethod === "Paystack" || paymentMethod === "DPO"} />
            </div>

            <div className="field-group">
              <span>Payment Method</span>
              <div className="front-desk-payment-options" role="group" aria-label="Payment method">
                <button type="button" className={paymentMethod === "Cash" ? "active" : ""} onClick={() => setPaymentMethod("Cash")}>
                  <Banknote /> Cash
                </button>
                <button type="button" className={paymentMethod === "POS" ? "active" : ""} onClick={() => setPaymentMethod("POS")}>
                  <CreditCard /> POS
                </button>
                <button type="button" className={paymentMethod === "Paystack" ? "active" : ""} onClick={() => setPaymentMethod("Paystack")}>
                  <ShieldCheck /> Card (Paystack)
                </button>
                <button type="button" className={paymentMethod === "DPO" ? "active" : ""} onClick={() => setPaymentMethod("DPO")}>
                  <ShieldCheck /> DPO Pay
                </button>
                <button type="button" className={paymentMethod === "PawaPay" ? "active" : ""} onClick={() => setPaymentMethod("PawaPay")}>
                  <ShieldCheck /> PawaPay
                </button>
                <button type="button" className={paymentMethod === "MoMo" ? "active" : ""} onClick={() => setPaymentMethod("MoMo")}>
                  <ShieldCheck /> MoMo
                </button>
              </div>
              {["Cash", "POS"].includes(paymentMethod) && (
                <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "4px" }}>
                  Cash and POS are settled in person when the customer collects their order.
                </p>
              )}
              {paymentMethod === "MoMo" && (
                <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "4px" }}>
                  The customer will get a PIN prompt on their phone to approve this payment.
                </p>
              )}
            </div>

            <div className="cashier-total-lines">
              <div><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div>
              <div className="cashier-grand-total"><span>Total</span><strong>{formatNaira(total)}</strong></div>
            </div>

            <button className="btn-gold cashier-checkout-button" type="submit" disabled={submitting}>
              {submitting ? "Processing..." : ["Cash", "POS"].includes(paymentMethod) ? `Confirm Order — ${formatNaira(total)}` : `Pay ${formatNaira(total)} via ${paymentMethod}`}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
