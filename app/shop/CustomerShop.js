"use client";

import { Banknote, CreditCard, Minus, Plus, Search, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "../data";
import { apiFetch, getSession } from "../lib/api";

const receiptStorageKey = "retail-last-receipt";
const pendingOrderStorageKey = "retail-pending-order";

export default function CustomerShop({ initialProducts = [] }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState(initialProducts || []);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(!initialProducts.length);
  const [message, setMessage] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryOption, setDeliveryOption] = useState("Home Delivery");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session?.name) setCustomerName(session.name);
    if (session?.email) setCustomerEmail(session.email);
  }, []);

  useEffect(() => {
    if (initialProducts.length) return;
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [productsData, cartData] = await Promise.all([
          apiFetch("/products/customer"),
          apiFetch("/cart")
        ]);
        if (cancelled) return;

        setProducts((productsData.products || []).filter((product) => product.frontDeskVisible !== false));
        setCartItems(cartData.cart?.items || []);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load the shop right now. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [
      product.name,
      product.sku,
      product.category,
      product.description
    ].filter(Boolean).join(" ").toLowerCase().includes(term));
  }, [products, query]);

  const cartMap = useMemo(() => {
    const map = {};
    cartItems.forEach((item) => { map[item.product_id] = item.quantity; });
    return map;
  }, [cartItems]);

  const totalItems = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

  async function syncCart(nextItems) {
    setCartItems(nextItems);
    try {
      await apiFetch("/cart", {
        method: "PUT",
        body: { items: nextItems.map((item) => ({ product_id: item.product_id, quantity: item.quantity })) }
      });
    } catch (error) {
      setMessage(error.message || "Could not update your cart.");
    }
  }

  function updateCart(product, nextQuantity) {
    const quantity = Math.max(0, Number(nextQuantity) || 0);
    const existing = cartItems.find((item) => item.product_id === product.id);

    let nextItems;
    if (!quantity) {
      nextItems = cartItems.filter((item) => item.product_id !== product.id);
    } else if (existing) {
      nextItems = cartItems.map((item) => (item.product_id === product.id ? { ...item, quantity } : item));
    } else {
      nextItems = [...cartItems, {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        price: Number(product.price || 0),
        stock: Number(product.stock || 0),
        quantity
      }];
    }

    syncCart(nextItems);
  }

  function addToCart(product) {
    updateCart(product, (cartMap[product.id] || 0) + 1);
  }

  function removeFromCart(productId) {
    syncCart(cartItems.filter((item) => item.product_id !== productId));
  }

  function buildOrderPayload(paymentStatus, paymentReference) {
    return {
      source: "Customer Shop",
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim() || null,
        email: customerEmail.trim() || null,
        address: deliveryOption === "Home Delivery" ? address.trim() : null
      },
      delivery_option: deliveryOption,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_reference: paymentReference || null,
      items: cartItems.map((item) => ({
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal: totalPrice,
      delivery_fee: 0,
      total: totalPrice
    };
  }

  function saveReceipt(order) {
    const receipt = {
      id: order.orderNumber || order.order_number || order.id,
      createdAt: new Date().toLocaleString(),
      items: cartItems.map((item, index) => ({
        cartKey: `${item.product_id}-${index}`,
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity
      })),
      total: totalPrice
    };
    localStorage.setItem(receiptStorageKey, JSON.stringify(receipt));
  }

  function validateCheckout() {
    if (!customerName.trim()) {
      setMessage("Please enter your name.");
      return false;
    }
    if (deliveryOption === "Home Delivery" && !address.trim()) {
      setMessage("Please enter a delivery address.");
      return false;
    }
    if (!cartItems.length) {
      setMessage("Your cart is empty.");
      return false;
    }
    return true;
  }

  async function handlePayOnDeliveryOrPickup(event) {
    event.preventDefault();
    if (!validateCheckout()) return;

    setSubmitting(true);
    try {
      const data = await apiFetch("/orders", { method: "POST", body: buildOrderPayload("Pending") });
      saveReceipt(data.order);
      await apiFetch("/cart", { method: "DELETE" });
      window.location.href = "/shop/orders";
    } catch (error) {
      setMessage(error.message || "Could not place your order.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayOnline(event) {
    event.preventDefault();
    if (!validateCheckout()) return;

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
      const reference = `SHOP-${Date.now()}`;
      localStorage.setItem(pendingOrderStorageKey, JSON.stringify({
        reference,
        gateway: paymentMethod.toLowerCase(),
        order: buildOrderPayload("Paid", reference)
      }));

      const callbackUrl = `${window.location.origin}/shop/scan-pay/callback`;
      const body = paymentMethod === "Paystack"
        ? { email: customerEmail.trim(), amount: totalPrice, reference, callback_url: callbackUrl }
        : paymentMethod === "DPO"
          ? { email: customerEmail.trim(), amount: totalPrice, reference, first_name: customerName.trim().split(" ")[0], last_name: customerName.trim().split(" ").slice(1).join(" "), currency: "RWF", callback_url: callbackUrl }
          : { amount: totalPrice, currency: "ZMW", reference, callback_url: callbackUrl, reason: `Order ${reference}` };

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
      const reference = `SHOP-${Date.now()}`;
      const data = await apiFetch("/payments/momo/initialize", {
        method: "POST",
        body: { amount: totalPrice, currency: "NGN", reference, phone: customerPhone.trim() }
      });

      setMessage(data.message || "A payment prompt was sent to your phone. Waiting for approval...");

      const orderPayload = buildOrderPayload("Paid", reference);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts += 1;
        try {
          const statusData = await apiFetch(`/payments/momo/verify/${data.gateway_reference}`);
          if (statusData.status === "success") {
            clearInterval(poll);
            const orderData = await apiFetch("/orders", { method: "POST", body: orderPayload });
            saveReceipt(orderData.order);
            await apiFetch("/cart", { method: "DELETE" });
            window.location.href = "/shop/orders";
          } else if (statusData.status === "failed") {
            clearInterval(poll);
            setMessage("The payment was declined or failed. Please try again.");
            setSubmitting(false);
          } else if (attempts >= 24) {
            clearInterval(poll);
            setMessage("Still waiting on approval. Check your phone, or try a different payment method.");
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

  function handleCheckoutSubmit(event) {
    if (["Paystack", "DPO", "PawaPay", "MoMo"].includes(paymentMethod)) return handlePayOnline(event);
    return handlePayOnDeliveryOrPickup(event);
  }

  return (
    <>
      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><ShoppingCart /> Customer Shop</h2>
            <p>{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"} available</p>
          </div>

          <label className="product-search">
            <Search />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product, SKU, or category..."
              aria-label="Search customer shop"
            />
          </label>

          {cartItems.length > 0 && (
            <button className="btn-gold" type="button" onClick={() => setShowCheckout(true)}>
              <ShoppingCart /> Proceed to Checkout — {formatNaira(totalPrice)}
            </button>
          )}
        </div>

        {message && <div className="front-desk-message">{message}</div>}

        <div className="cashier-panel">
          <div className="cart-selection-summary">
            <span>{totalItems} item{totalItems === 1 ? "" : "s"} in cart</span>
            <strong>{formatNaira(totalPrice)}</strong>
          </div>

          {loading && <div className="empty-table-cell">Loading products...</div>}
          {!loading && !filteredProducts.length && (
            <div className="empty-table-cell">No products available right now.</div>
          )}

          <div className="form-grid customer-form-grid">
            {filteredProducts.map((product) => {
              const quantity = Number(cartMap[product.id] || 0);
              const stock = Number(product.stock || 0);

              return (
                <div key={product.id} className="field-group" style={{
                  border: "1px solid rgba(201,160,32,0.22)",
                  borderRadius: "18px",
                  padding: "16px",
                  background: "rgba(255,255,255,0.6)",
                  gap: "8px"
                }}>
                  <div className="scan-pay-product-image">
                    <ShoppingCart />
                  </div>
                  <strong>{product.name}</strong>
                  <span>{product.sku || "No SKU"}</span>
                  <span>{product.category || "General"}</span>
                  <span className="gold-text">{formatNaira(Number(product.price || 0))}</span>
                  <span>{stock} in stock</span>

                  <div className="front-desk-sale-controls" style={{ marginTop: "8px" }}>
                    <button
                      className="icon-button sale-stepper"
                      type="button"
                      onClick={() => updateCart(product, quantity - 1)}
                      aria-label={`Reduce ${product.name} quantity`}
                    >
                      <Minus />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={stock}
                      value={quantity}
                      onChange={(event) => updateCart(product, event.target.value)}
                      aria-label={`${product.name} quantity`}
                    />
                    <button
                      className="btn-gold front-desk-sell-button"
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={stock <= 0}
                    >
                      <Plus /> Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {cartItems.length > 0 && (
            <div className="receipt-actions">
              <button className="btn-gold" type="button" onClick={() => setShowCheckout(true)}>
                <ShoppingCart /> Proceed to Checkout — {formatNaira(totalPrice)}
              </button>
            </div>
          )}
        </div>
      </section>

      {showCheckout && (
        <div className="product-edit-overlay" role="dialog" aria-modal="true" aria-label="Checkout">
          <div className="product-edit-modal section-card">
            <div className="section-header">
              <h2>Checkout</h2>
            </div>

            <div style={{ padding: "0 28px" }}>
              {cartItems.map((item) => (
                <div key={item.product_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(201,160,32,0.15)" }}>
                  <span>{item.name} × {item.quantity}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <strong>{formatNaira(item.price * item.quantity)}</strong>
                    <button className="icon-button" type="button" onClick={() => removeFromCart(item.product_id)} aria-label={`Remove ${item.name}`}>
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form className="product-edit-form" onSubmit={handleCheckoutSubmit}>
              <label className="field-group">
                <span>Full Name</span>
                <input type="text" value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
              </label>

              <label className="field-group">
                <span>Phone {paymentMethod === "MoMo" && "(required — this is where the PIN prompt is sent)"}</span>
                <input type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder={paymentMethod === "MoMo" ? "e.g. 2348012345678" : ""} required={paymentMethod === "MoMo"} />
              </label>

              <label className="field-group">
                <span>Email {(paymentMethod === "Paystack" || paymentMethod === "DPO") && "(required for this payment method)"}</span>
                <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required={paymentMethod === "Paystack" || paymentMethod === "DPO"} />
              </label>

              <label className="field-group">
                <span>Delivery Option</span>
                <select value={deliveryOption} onChange={(event) => setDeliveryOption(event.target.value)}>
                  <option>Home Delivery</option>
                  <option>In-Store Pickup</option>
                </select>
              </label>

              {deliveryOption === "Home Delivery" && (
                <label className="field-group" style={{ gridColumn: "1 / -1" }}>
                  <span>Delivery Address</span>
                  <textarea rows={2} value={address} onChange={(event) => setAddress(event.target.value)} required />
                </label>
              )}

              <label className="field-group" style={{ gridColumn: "1 / -1" }}>
                <span>Payment Method</span>
                <div className="front-desk-payment-options" role="group" aria-label="Payment method">
                  <button type="button" className={paymentMethod === "Cash on Delivery" ? "active" : ""} onClick={() => setPaymentMethod("Cash on Delivery")}>
                    <Banknote /> Pay on Delivery
                  </button>
                  <button type="button" className={paymentMethod === "POS on Delivery" ? "active" : ""} onClick={() => setPaymentMethod("POS on Delivery")}>
                    <CreditCard /> POS on Delivery
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
                {paymentMethod === "MoMo" && (
                  <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "4px" }}>
                    You'll get a PIN prompt on your phone to approve this payment.
                  </p>
                )}
              </label>

              <div className="product-edit-actions">
                <button className="btn-outline" type="button" onClick={() => setShowCheckout(false)} disabled={submitting}>Cancel</button>
                <button className="btn-gold" type="submit" disabled={submitting}>
                  {submitting ? "Processing..." : ["Cash on Delivery", "POS on Delivery"].includes(paymentMethod) ? `Place Order — ${formatNaira(totalPrice)}` : `Pay ${formatNaira(totalPrice)} via ${paymentMethod}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
