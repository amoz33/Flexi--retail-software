"use client";

import Link from "next/link";
import { History, Minus, PackageCheck, Plus, Search, ShoppingBag, ShoppingCart, Store, Trash2, Truck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "../data";

const productStorageKey = "retail-products";
const productUpdateEvent = "retail-products-updated";
const shopCartStorageKey = "retail-shop-cart";
const homeOrdersStorageKey = "retail-home-orders";
const customerLookupStorageKey = "retail-customer-order-lookup";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";
const paidPaymentMethods = ["Card Payment", "Bank Transfer", "Online Payment"];

function normalizeProduct(product) {
  return {
    ...product,
    frontDeskVisible: product.frontDeskVisible !== false,
    expiryDate: product.expiryDate || ""
  };
}

function normalizeProducts(products) {
  return products.map(normalizeProduct);
}

function makeCartKey(product) {
  return `${product.sku}-${product.id}`;
}

function productMatchesQuery(product, query) {
  if (!query) return true;

  const searchableText = [
    product.name,
    product.sku,
    product.category,
    product.description,
    product.price
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

export default function CustomerShop({ initialProducts }) {
  const [products, setProducts] = useState(normalizeProducts(initialProducts));
  const [cartItems, setCartItems] = useState([]);
  const [homeOrders, setHomeOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [message, setMessage] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    deliveryNote: "",
    deliveryOption: "Home Delivery",
    paymentMethod: "Card Payment"
  });

  const visibleProducts = products.filter((product) => product.frontDeskVisible !== false);
  const categories = ["All", ...Array.from(new Set(visibleProducts.map((product) => product.category).filter(Boolean)))];

  const filteredProducts = visibleProducts.filter((product) => {
    const matchesCategory = category === "All" || product.category === category;
    return matchesCategory && productMatchesQuery(product, query.trim());
  });

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = cartItems.length && customer.deliveryOption === "Home Delivery" ? 1500 : 0;

    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      count: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [cartItems, customer.deliveryOption]);

  useEffect(() => {
    function loadProducts() {
      const savedProducts = localStorage.getItem(productStorageKey);
      if (!savedProducts) {
        setProducts(normalizeProducts(initialProducts));
        return;
      }

      try {
        setProducts(normalizeProducts(JSON.parse(savedProducts)));
      } catch {
        localStorage.removeItem(productStorageKey);
        setProducts(normalizeProducts(initialProducts));
      }
    }

    loadProducts();
    window.addEventListener("storage", loadProducts);
    window.addEventListener(productUpdateEvent, loadProducts);
    return () => {
      window.removeEventListener("storage", loadProducts);
      window.removeEventListener(productUpdateEvent, loadProducts);
    };
  }, [initialProducts]);

  useEffect(() => {
    try {
      setCartItems(JSON.parse(localStorage.getItem(shopCartStorageKey) || "[]"));
    } catch {
      localStorage.removeItem(shopCartStorageKey);
      setCartItems([]);
    }
  }, []);

  useEffect(() => {
    const savedOrders = localStorage.getItem(homeOrdersStorageKey);
    if (!savedOrders) return;

    try {
      setHomeOrders(JSON.parse(savedOrders));
    } catch {
      localStorage.removeItem(homeOrdersStorageKey);
    }
  }, []);

  function saveProducts(nextProducts) {
    const normalizedProducts = normalizeProducts(nextProducts);
    localStorage.setItem(productStorageKey, JSON.stringify(normalizedProducts));
    window.dispatchEvent(new Event(productUpdateEvent));
    return normalizedProducts;
  }

  function saveHomeOrders(nextOrders) {
    localStorage.setItem(homeOrdersStorageKey, JSON.stringify(nextOrders));
    return nextOrders;
  }

  function saveCart(nextItems) {
    localStorage.setItem(shopCartStorageKey, JSON.stringify(nextItems));
    return nextItems;
  }

  function updateCustomerField(field, value) {
    setCustomer((currentCustomer) => ({ ...currentCustomer, [field]: value }));
  }

  function updateDeliveryOption(value) {
    setCustomer((currentCustomer) => ({
      ...currentCustomer,
      deliveryOption: value,
      paymentMethod: value === "Pickup" && ["Pay on Delivery", "POS on Delivery", "Pay at Pickup"].includes(currentCustomer.paymentMethod)
        ? "Card Payment"
        : currentCustomer.paymentMethod
    }));
  }

  function addToCart(product) {
    const stock = Number(product.stock || 0);
    const cartKey = makeCartKey(product);

    if (stock <= 0) {
      setMessage(`${product.name} is out of stock.`);
      return;
    }

    setCartItems((items) => {
      const existing = items.find((item) => item.cartKey === cartKey);
      if (existing) {
        return saveCart(items.map((item) => (
          item.cartKey === cartKey ? { ...item, quantity: Math.min(stock, item.quantity + 1) } : item
        )));
      }

      return saveCart([{
        cartKey,
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        price: Number(product.price || 0),
        stock,
        quantity: 1
      }, ...items]);
    });
    setMessage(`${product.name} added to cart.`);
    setCartOpen(true);
  }

  function updateQuantity(cartKey, quantity) {
    setCartItems((items) => saveCart(items.map((item) => (
      item.cartKey === cartKey ? { ...item, quantity: Math.max(1, Math.min(item.stock, Number(quantity || 1))) } : item
    ))));
  }

  function removeCartItem(cartKey) {
    setCartItems((items) => saveCart(items.filter((item) => item.cartKey !== cartKey)));
  }

  function rememberCustomerLookup(orderCustomer) {
    localStorage.setItem(customerLookupStorageKey, JSON.stringify({
      email: orderCustomer.email || "",
      phone: orderCustomer.phone || ""
    }));
  }

  async function placeOrder(event) {
    event.preventDefault();

    if (!cartItems.length) {
      setMessage("Add at least one product before placing an order.");
      return;
    }

    const orderDraft = {
      id: `WEB-${String(Date.now()).slice(-6)}`,
      customerName: customer.name.trim(),
      phone: customer.phone.trim(),
      email: customer.email.trim().toLowerCase(),
      deliveryOption: customer.deliveryOption,
      address: customer.deliveryOption === "Pickup" ? "Paid pickup at store" : customer.address.trim(),
      deliveryNote: customer.deliveryNote.trim(),
      paymentMethod: customer.paymentMethod,
      items: cartItems,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      status: "Pending",
      paymentStatus: paidPaymentMethods.includes(customer.paymentMethod) ? "Paid" : "Pending",
      deliveryStatus: customer.deliveryOption === "Home Delivery" ? "Order Received" : "Ready for Store Pickup",
      createdAt: new Date().toLocaleString()
    };

    try {
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source: "Shop Order",
          customer: {
            name: orderDraft.customerName,
            phone: orderDraft.phone,
            email: orderDraft.email,
            address: customer.deliveryOption === "Pickup" ? "" : customer.address.trim()
          },
          delivery_option: orderDraft.deliveryOption,
          delivery_note: orderDraft.deliveryNote,
          payment_method: orderDraft.paymentMethod,
          payment_status: orderDraft.paymentStatus,
          items: orderDraft.items,
          subtotal: orderDraft.subtotal,
          delivery_fee: orderDraft.deliveryFee,
          total: orderDraft.total
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "Order could not be saved. Please try again.");
        return;
      }

      const order = data.order;

      setProducts((currentProducts) => saveProducts(currentProducts.map((product) => {
        const cartItem = cartItems.find((item) => item.id === product.id && item.sku === product.sku);
        if (!cartItem) return product;

        return {
          ...product,
          stock: Math.max(0, Number(product.stock || 0) - cartItem.quantity)
        };
      })));

      rememberCustomerLookup(orderDraft);
      setHomeOrders((orders) => saveHomeOrders([order, ...orders]));
      setCartItems(saveCart([]));
      setCustomer({
        name: "",
        phone: "",
        email: "",
        address: "",
        deliveryNote: "",
        deliveryOption: "Home Delivery",
        paymentMethod: "Card Payment"
      });
      setCartOpen(false);
      setMessage(customer.deliveryOption === "Pickup"
        ? `${order.id} placed and paid. Collect at the store.`
        : `${order.id} placed. We will contact you for delivery.`);
    } catch {
      setMessage("Cannot reach the order API. Start the backend and try again.");
    }
  }

  return (
    <>
      <section className="shop-hero">
        <div>
          <span className="shop-eyebrow"><Truck /> Home Delivery</span>
          <h2>Shop products from home</h2>
          <p>Browse available stock, add items to your cart, and send a delivery order to the store.</p>
        </div>
        <div className="shop-hero-summary">
          <strong>{visibleProducts.length}</strong>
          <span>available products</span>
        </div>
      </section>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><ShoppingBag /> Online Store</h2>
            <p>{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"} ready to order</p>
          </div>

          <div className="shop-controls">
            <Link className="shop-cart-icon-button" href="/shop/orders" aria-label="Open purchase history">
              <History />
            </Link>

            <label className="field-group shop-category-filter">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="product-search">
              <Search />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                aria-label="Search shop products"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear shop search">
                  <X />
                </button>
              )}
            </label>

            <button className="shop-cart-icon-button" type="button" onClick={() => setCartOpen(true)} aria-label="Open cart">
              <ShoppingCart />
              {totals.count > 0 && <span>{totals.count}</span>}
            </button>
          </div>
        </div>

        {message && <div className="front-desk-message">{message}</div>}

        <div className="shop-product-grid">
          {filteredProducts.map((product) => {
            const stock = Number(product.stock || 0);
            const inCart = cartItems.find((item) => item.cartKey === makeCartKey(product));

            return (
              <article className="shop-product-card" key={makeCartKey(product)}>
                <div className="shop-product-visual">
                  <PackageCheck />
                  <span>{product.category || "Product"}</span>
                </div>
                <div className="shop-product-body">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description || product.sku}</p>
                  </div>
                  <div className="shop-product-meta">
                    <span className="gold-text">{formatNaira(product.price || 0)}</span>
                    <span className={`status-badge ${stock > 0 ? "status-active" : "status-pending"}`}>
                      {stock > 0 ? `${stock} in stock` : "Out of stock"}
                    </span>
                  </div>
                  <button
                    className="btn-gold shop-add-button"
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={stock <= 0}
                  >
                    <ShoppingCart /> {inCart ? "Add More" : "Add to Cart"}
                  </button>
                </div>
              </article>
            );
          })}
          {!filteredProducts.length && <div className="empty-table-cell shop-empty">No products match your search.</div>}
        </div>
      </section>

      {cartOpen && (
        <div className="shop-cart-overlay" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <button className="shop-cart-backdrop" type="button" aria-label="Close cart" onClick={() => setCartOpen(false)} />
          <aside className="shop-cart-drawer">
            <div className="shop-cart-drawer-header">
              <div>
                <h2><ShoppingCart /> Cart</h2>
                <p>{totals.count} item{totals.count === 1 ? "" : "s"} selected</p>
              </div>
              <button className="sidebar-toggle-btn" type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">
                <X />
              </button>
            </div>

            <div className="shop-checkout-steps">
              <span className={cartItems.length ? "active" : ""}>1. Pick items</span>
              <span className={cartItems.length ? "active" : ""}>2. Add to cart</span>
              <span className={customer.deliveryOption ? "active" : ""}>3. Choose delivery</span>
              <span>4. Place order</span>
            </div>

            <div className="shop-cart-list">
              {cartItems.map((item) => (
                <div className="shop-cart-item" key={item.cartKey}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.sku} | {formatNaira(item.price)}</span>
                  </div>
                  <div className="front-desk-sale-controls">
                    <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}><Minus /></button>
                    <input type="number" min="1" max={item.stock} value={item.quantity} onChange={(event) => updateQuantity(item.cartKey, event.target.value)} />
                    <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}><Plus /></button>
                    <button className="icon-button" type="button" onClick={() => removeCartItem(item.cartKey)} aria-label={`Remove ${item.name}`}><Trash2 /></button>
                  </div>
                </div>
              ))}
              {!cartItems.length && <div className="empty-table-cell">Your cart is empty.</div>}
            </div>

            <form className="product-form shop-checkout-form" onSubmit={placeOrder}>
              <div className="shop-delivery-options" role="group" aria-label="Delivery option">
                <button
                  className={customer.deliveryOption === "Pickup" ? "active" : ""}
                  type="button"
                  onClick={() => updateDeliveryOption("Pickup")}
                >
                  <Store /> Pay and Pick Up
                </button>
                <button
                  className={customer.deliveryOption === "Home Delivery" ? "active" : ""}
                  type="button"
                  onClick={() => updateDeliveryOption("Home Delivery")}
                >
                  <Truck /> Home Delivery
                </button>
              </div>

              <label className="field-group">
                <span>Name</span>
                <input value={customer.name} onChange={(event) => updateCustomerField("name", event.target.value)} placeholder="Customer name" required />
              </label>
              <label className="field-group">
                <span>Phone</span>
                <input value={customer.phone} onChange={(event) => updateCustomerField("phone", event.target.value)} placeholder="+234..." required />
              </label>
              <label className="field-group">
                <span>Email</span>
                <input type="email" value={customer.email} onChange={(event) => updateCustomerField("email", event.target.value)} placeholder="customer@email.com" required />
              </label>
              {customer.deliveryOption === "Home Delivery" && (
                <label className="field-group">
                  <span>Address</span>
                  <textarea rows="4" value={customer.address} onChange={(event) => updateCustomerField("address", event.target.value)} placeholder="Delivery address" required />
                </label>
              )}
              <label className="field-group">
                <span>Payment</span>
                <select value={customer.paymentMethod} onChange={(event) => updateCustomerField("paymentMethod", event.target.value)}>
                  <option>Card Payment</option>
                  <option>Bank Transfer</option>
                  <option>Online Payment</option>
                  {customer.deliveryOption === "Home Delivery" && (
                    <>
                      <option>Pay on Delivery</option>
                      <option>POS on Delivery</option>
                    </>
                  )}
                </select>
              </label>
              <label className="field-group">
                <span>{customer.deliveryOption === "Pickup" ? "Pickup Note" : "Delivery Note"}</span>
                <textarea rows="3" value={customer.deliveryNote} onChange={(event) => updateCustomerField("deliveryNote", event.target.value)} placeholder={customer.deliveryOption === "Pickup" ? "Preferred pickup time after payment..." : "Gate code, landmark, preferred delivery time..."} />
              </label>

              <div className="shop-total-panel">
                <div><span>Subtotal</span><strong>{formatNaira(totals.subtotal)}</strong></div>
                <div><span>{customer.deliveryOption === "Pickup" ? "Pickup" : "Delivery"}</span><strong>{formatNaira(totals.deliveryFee)}</strong></div>
                <div><span>Total</span><strong>{formatNaira(totals.total)}</strong></div>
              </div>

              <button className="btn-gold shop-place-order" type="submit" disabled={!cartItems.length}>
                {customer.deliveryOption === "Pickup" ? <Store /> : <Truck />} Place Order
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
