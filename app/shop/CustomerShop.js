"use client";

import { Minus, Plus, Search, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { formatNaira } from "../data";

export default function CustomerShop({ initialProducts = [] }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const products = initialProducts || [];

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

  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + Number(quantity || 0), 0);
  const totalPrice = products.reduce((sum, product) => {
    const quantity = Number(cart[product.id] || 0);
    return sum + quantity * Number(product.price || 0);
  }, 0);

  function updateCart(productId, nextQuantity) {
    const quantity = Math.max(0, Number(nextQuantity) || 0);
    setCart((currentCart) => {
      const nextCart = { ...currentCart };
      if (!quantity) delete nextCart[productId];
      else nextCart[productId] = quantity;
      return nextCart;
    });
  }

  function addToCart(product) {
    updateCart(product.id, (cart[product.id] || 0) + 1);
  }

  return (
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
      </div>

      <div className="cashier-panel">
        <div className="cart-selection-summary">
          <span>{totalItems} item{totalItems === 1 ? "" : "s"} in cart</span>
          <strong>{formatNaira(totalPrice)}</strong>
        </div>

        <div className="form-grid customer-form-grid">
          {filteredProducts.map((product) => {
            const quantity = Number(cart[product.id] || 0);
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
                    onClick={() => updateCart(product.id, (quantity || 0) - 1)}
                    aria-label={`Reduce ${product.name} quantity`}
                  >
                    <Minus />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={stock}
                    value={quantity}
                    onChange={(event) => updateCart(product.id, event.target.value)}
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
      </div>
    </section>
  );
}
