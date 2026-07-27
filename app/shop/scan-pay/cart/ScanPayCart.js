"use client";

import Link from "next/link";
import { CreditCard, Landmark, Minus, ReceiptText, ScanLine, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/DataTable";
import { formatNaira } from "../../../data";
import { createPaymentReference } from "../../../lib/paystack";
import { apiFetch } from "../../../lib/api";

const scanPayCartStorageKey = "retail-scan-pay-cart";
const homeOrdersStorageKey = "retail-home-orders";
const customerLookupStorageKey = "retail-customer-order-lookup";
const receiptStorageKey = "retail-last-receipt";

export default function ScanPayCart() {
  const [cartItems, setCartItems] = useState([]);
  const [selectedCartKeys, setSelectedCartKeys] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentChannel, setPaymentChannel] = useState("card");
  const [message, setMessage] = useState("");
  const [paying, setPaying] = useState(false);

  const selectedItems = useMemo(() => (
    cartItems.filter((item) => selectedCartKeys.includes(item.cartKey))
  ), [cartItems, selectedCartKeys]);

  const totals = useMemo(() => {
    const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return {
      subtotal,
      total: subtotal,
      count: selectedItems.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [selectedItems]);

  useEffect(() => {
    let cancelled = false;

    try {
      const savedCart = localStorage.getItem(scanPayCartStorageKey);
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];
      setCartItems(parsedCart);
      setSelectedCartKeys(parsedCart.map((item) => item.cartKey));
    } catch {
      localStorage.removeItem(scanPayCartStorageKey);
    }

    async function loadProducts() {
      try {
        const data = await apiFetch("/products");
        if (!cancelled) setProducts(data.products || []);
      } catch {
        if (!cancelled) setProducts([]);
      }
    }

    loadProducts();
    return () => { cancelled = true; };
  }, []);

  function saveCart(nextItems) {
    localStorage.setItem(scanPayCartStorageKey, JSON.stringify(nextItems));
    setCartItems(nextItems);
    setSelectedCartKeys((keys) => keys.filter((key) => nextItems.some((item) => item.cartKey === key)));
  }

  function updateQuantity(cartKey, quantity) {
    const nextItems = cartItems.map((item) => (
      item.cartKey === cartKey ? { ...item, quantity: Math.max(1, Math.min(item.stock, Number(quantity || 1))) } : item
    ));
    saveCart(nextItems);
  }

  function removeCartItem(cartKey) {
    saveCart(cartItems.filter((item) => item.cartKey !== cartKey));
  }

  function toggleCartItem(cartKey) {
    setSelectedCartKeys((keys) => (
      keys.includes(cartKey) ? keys.filter((key) => key !== cartKey) : [...keys, cartKey]
    ));
  }

  function toggleAllCartItems() {
    setSelectedCartKeys((keys) => (
      keys.length === cartItems.length ? [] : cartItems.map((item) => item.cartKey)
    ));
  }

  function buildPaidOrder(items) {
    const reference = createPaymentReference("SCAN");
    const createdAt = new Date().toLocaleString();
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return {
      id: reference,
      reference,
      customerName: customerName.trim() || "Walk-in Customer",
      phone: customerPhone.trim(),
      email: customerEmail.trim(),
      deliveryOption: "Scan and Pay Pickup",
      address: "Paid pickup at store",
      deliveryNote: "Customer scanned/searched and paid before pickup.",
      paymentMethod: paymentChannel === "card" ? "Card" : "Transfer",
      paymentChannel,
      paymentStatus: "Paid",
      items,
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      status: "Pending Pickup",
      deliveryStatus: "Ready for Store Pickup",
      createdAt
    };
  }

  function saveOrder(order) {
    const savedOrders = localStorage.getItem(homeOrdersStorageKey);
    let orders = [];

    try {
      orders = savedOrders ? JSON.parse(savedOrders) : [];
    } catch {
      orders = [];
    }

    localStorage.setItem(homeOrdersStorageKey, JSON.stringify([order, ...orders]));
  }

  function saveReceipt(order) {
    const receipt = {
      id: order.id.replace("SCAN", "RCT"),
      customerName: order.customerName,
      customerPhone: order.phone,
      paymentMethod: order.paymentMethod,
      paymentReference: order.reference,
      items: order.items,
      subtotal: order.subtotal,
      discount: 0,
      total: order.total,
      cashier: "Customer Scan Pay",
      createdAt: order.createdAt
    };

    localStorage.setItem(receiptStorageKey, JSON.stringify(receipt));
  }

  function rememberCustomerLookup(order) {
    localStorage.setItem(customerLookupStorageKey, JSON.stringify({
      email: order.email || "",
      phone: order.phone || ""
    }));
  }

  async function saveBackendOrder(order) {
    const data = await apiFetch("/orders", {
      method: "POST",
      body: {
        source: "Scan & Pay",
        customer: {
          name: order.customerName,
          phone: order.phone,
          email: order.email,
          address: ""
        },
        delivery_option: order.deliveryOption,
        delivery_note: order.deliveryNote,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus,
        items: order.items,
        subtotal: order.subtotal,
        delivery_fee: order.deliveryFee,
        total: order.total
      }
    });

    return data.order;
  }

  function saveProductsAfterPayment(items) {
    setProducts((currentProducts) => currentProducts.map((product) => {
      const cartItem = items.find((item) => item.id === product.id && item.sku === product.sku);
      if (!cartItem) return product;

      return {
        ...product,
        stock: Math.max(0, Number(product.stock || 0) - cartItem.quantity),
        soldCount: Number(product.soldCount || 0) + cartItem.quantity
      };
    }));
  }

  async function payForCart(event) {
    event.preventDefault();

    if (!cartItems.length) {
      setMessage("Add at least one item before paying.");
      return;
    }

    if (!selectedItems.length) {
      setMessage("Select at least one cart item before paying.");
      return;
    }

    if (!customerEmail.trim()) {
      setMessage("Enter customer email before payment.");
      return;
    }

    const unavailableItem = selectedItems.find((item) => item.quantity > Number(products.find((product) => product.id === item.id && product.sku === item.sku)?.stock || item.stock || 0));
    if (unavailableItem) {
      setMessage(`Only ${unavailableItem.stock} ${unavailableItem.name} available.`);
      return;
    }

    const order = buildPaidOrder(selectedItems);
    setPaying(true);

    window.setTimeout(async () => {
      try {
        const backendOrder = await saveBackendOrder(order);
        const syncedOrder = { ...order, ...backendOrder };
        saveProductsAfterPayment(order.items);
        saveOrder(syncedOrder);
        saveReceipt(syncedOrder);
        rememberCustomerLookup(order);
        saveCart(cartItems.filter((item) => !selectedCartKeys.includes(item.cartKey)));
        setMessage(`Payment approved by ${order.paymentMethod}. Receipt is ready for customer and cashier.`);
      } catch (error) {
        setMessage(error.message || "Payment was approved, but the backend order could not be saved.");
      }
      setPaying(false);
    }, 700);
  }

  return (
    <>
      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><ShoppingCart /> Scanned Cart</h2>
            <p>{totals.count} selected item{totals.count === 1 ? "" : "s"} ready for payment</p>
          </div>
          <div className="receipt-actions">
            <Link className="btn-outline" href="/shop/scan-pay"><ScanLine /> Scan Items</Link>
            <Link className="btn-outline" href="/shop/scan-pay/receipt"><ReceiptText /> Receipt</Link>
          </div>
        </div>

        <div className="cashier-panel">
          {message && <div className="front-desk-message">{message}</div>}

          <DataTable
            columns={["Pay", "Product", "SKU", "Price", "Qty", "Line Total", "Remove"]}
            rows={cartItems}
            rowKey={(item) => item.cartKey}
            emptyMessage="No scanned items yet."
            tableClassName="product-data-table cashier-cart-table"
            renderRow={(item) => (
              <>
                <td>
                  <label className="cart-pay-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedCartKeys.includes(item.cartKey)}
                      onChange={() => toggleCartItem(item.cartKey)}
                      aria-label={`Select ${item.name} for payment`}
                    />
                    <span />
                  </label>
                </td>
                <td><strong>{item.name}</strong></td>
                <td><span className="order-id">{item.sku}</span></td>
                <td className="gold-text">{formatNaira(item.price)}</td>
                <td>
                  <div className="front-desk-sale-controls">
                    <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}><Minus /></button>
                    <input type="number" min="1" max={item.stock} value={item.quantity} onChange={(event) => updateQuantity(item.cartKey, event.target.value)} />
                    <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}>+</button>
                  </div>
                </td>
                <td className="gold-text">{formatNaira(item.price * item.quantity)}</td>
                <td><button className="icon-button" type="button" onClick={() => removeCartItem(item.cartKey)} aria-label={`Remove ${item.name}`}><Trash2 /></button></td>
              </>
            )}
          />

          {!!cartItems.length && (
            <div className="cart-selection-summary">
              <button className="btn-outline" type="button" onClick={toggleAllCartItems}>
                {selectedCartKeys.length === cartItems.length ? "Clear Selection" : "Select All"}
              </button>
              <span>{selectedItems.length} of {cartItems.length} product{cartItems.length === 1 ? "" : "s"} selected for payment</span>
            </div>
          )}

          <form className="cashier-total-panel scan-pay-total-panel" onSubmit={payForCart}>
            <div className="form-grid scan-pay-customer-grid">
              <label className="field-group">
                <span>Name</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" />
              </label>
              <label className="field-group">
                <span>Phone</span>
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="+234..." />
              </label>
              <label className="field-group">
                <span>Email</span>
                <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="customer@email.com" required />
              </label>
            </div>

            <div className="scan-pay-payment-options" role="group" aria-label="Payment channel">
              <button
                className={paymentChannel === "card" ? "active" : ""}
                type="button"
                onClick={() => setPaymentChannel("card")}
              >
                <CreditCard /> Card
              </button>
              <button
                className={paymentChannel === "bank_transfer" ? "active" : ""}
                type="button"
                onClick={() => setPaymentChannel("bank_transfer")}
              >
                <Landmark /> Transfer
              </button>
            </div>

            <div className="cashier-total-lines">
              <div><span>Subtotal</span><strong>{formatNaira(totals.subtotal)}</strong></div>
              <div className="cashier-grand-total"><span>Total</span><strong>{formatNaira(totals.total)}</strong></div>
            </div>
            <button className="btn-gold cashier-checkout-button" type="submit" disabled={!selectedItems.length || paying}>
              <ShoppingCart /> {paying ? "Processing..." : "Pay"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
