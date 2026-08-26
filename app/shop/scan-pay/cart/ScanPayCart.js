"use client";

import Link from "next/link";
import { Banknote, CreditCard, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatNaira } from "../../../data";

const demoProducts = [
  { id: 1, name: "iPhone 14 Pro", sku: "APL-14PRO", price: 850000, stock: 12 },
  { id: 2, name: "Samsung Galaxy S23", sku: "SSG-S23", price: 720000, stock: 8 },
  { id: 3, name: "Premium Rice 5kg", sku: "GRC-RICE5", price: 8500, stock: 45 }
];

export default function ScanPayCart() {
  const [cart, setCart] = useState({
    1: 1,
    3: 2
  });
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const items = useMemo(() => demoProducts
    .filter((product) => cart[product.id])
    .map((product) => ({
      ...product,
      quantity: Number(cart[product.id] || 0)
    })), [cart]);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryFee = subtotal > 0 ? 2500 : 0;
  const total = subtotal + deliveryFee;

  function updateQuantity(productId, nextQuantity) {
    const quantity = Math.max(0, Number(nextQuantity) || 0);
    setCart((currentCart) => {
      const nextCart = { ...currentCart };
      if (!quantity) delete nextCart[productId];
      else nextCart[productId] = quantity;
      return nextCart;
    });
  }

  function removeItem(productId) {
    updateQuantity(productId, 0);
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
        {items.length === 0 ? (
          <div className="empty-table-cell">Your cart is empty. Add products from the Scan & Pay page.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="field-group" style={{
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
                <button className="icon-button" type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>
                  <Trash2 />
                </button>
              </div>

              <div className="front-desk-sale-controls">
                <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus /></button>
                <input type="number" min="0" value={item.quantity} onChange={(event) => updateQuantity(item.id, event.target.value)} />
                <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus /></button>
              </div>

              <strong className="gold-text">{formatNaira(item.price * item.quantity)}</strong>
            </div>
          ))
        )}

        <div className="cashier-total-panel">
          <div className="field-group">
            <span>Payment Method</span>
            <div className="front-desk-payment-options" role="group" aria-label="Payment method">
              <button className={paymentMethod === "Cash" ? "active" : ""} type="button" onClick={() => setPaymentMethod("Cash")}>
                <Banknote /> Cash
              </button>
              <button className={paymentMethod === "POS" ? "active" : ""} type="button" onClick={() => setPaymentMethod("POS")}>
                <CreditCard /> POS
              </button>
            </div>
          </div>

          <div className="cashier-total-lines">
            <div><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div>
            <div><span>Delivery</span><strong>{formatNaira(deliveryFee)}</strong></div>
            <div className="cashier-grand-total"><span>Total</span><strong>{formatNaira(total)}</strong></div>
          </div>

          <Link className="btn-gold cashier-checkout-button" href="/shop/scan-pay/callback">
            Pay {formatNaira(total)}
          </Link>
        </div>
      </div>
    </section>
  );
}
