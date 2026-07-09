"use client";

import Link from "next/link";
import { Banknote, CreditCard, FileUp, Minus, Plus, Printer, ScanLine, ShoppingCart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../../components/DataTable";
import { formatNaira } from "../../data";

const productStorageKey = "retail-products";
const productUpdateEvent = "retail-products-updated";
const receiptStorageKey = "retail-last-receipt";
const receiptHistoryStorageKey = "retail-receipt-history";
const receiptHistoryUpdateEvent = "retail-receipt-history-updated";
const sessionStorageKey = "retail-auth-session";

function normalizeProduct(product) {
  return { ...product, frontDeskVisible: product.frontDeskVisible !== false };
}

function normalizeProducts(products) {
  return products.map(normalizeProduct);
}

function makeCartKey(product) {
  return `${product.sku}-${product.id}`;
}

function findProduct(products, code) {
  const lookup = code.trim().toLowerCase();
  if (!lookup) return null;

  return products.find((product) => (
    String(product.sku || "").toLowerCase() === lookup ||
    String(product.barcode || "").toLowerCase() === lookup
  )) || products.find((product) => (
    String(product.name || "").toLowerCase() === lookup
  )) || products.find((product) => (
    String(product.name || "").toLowerCase().includes(lookup) ||
    String(product.sku || "").toLowerCase().includes(lookup) ||
    String(product.barcode || "").toLowerCase().includes(lookup)
  ));
}

function parseImportedItems(value) {
  return value.split(/\r?\n/).map((line) => {
    const [code, quantity] = line.split(",").map((item) => item.trim());
    return { code, quantity: Math.max(1, Number(quantity || 1)) };
  }).filter((item) => item.code);
}

export default function FrontDeskSale({ initialProducts, customers, staff }) {
  const router = useRouter();
  const [products, setProducts] = useState(normalizeProducts(initialProducts));
  const [cartItems, setCartItems] = useState([]);
  const [scanCode, setScanCode] = useState("");
  const [scanQuantity, setScanQuantity] = useState("1");
  const [importText, setImportText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cashier, setCashier] = useState(staff[0]?.name || "Front Desk");
  const [discount, setDiscount] = useState("");
  const [message, setMessage] = useState("");

  const visibleProducts = products.filter((product) => product.frontDeskVisible !== false);
  const productSuggestions = scanCode.trim()
    ? visibleProducts.filter((product) => {
      const lookup = scanCode.trim().toLowerCase();
      return [
        product.name,
        product.sku,
        product.barcode,
        product.category
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(lookup));
    }).slice(0, 6)
    : [];

  useEffect(() => {
    try {
      const savedSession = JSON.parse(localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey) || "null");
      if (savedSession?.name && savedSession.role !== "Admin") {
        setCashier(savedSession.name);
      }
    } catch {
      setCashier(staff[0]?.name || "Front Desk");
    }
  }, [staff]);

  useEffect(() => {
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
  }, [initialProducts]);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = Math.min(subtotal, Math.max(0, Number(discount || 0)));
    return {
      subtotal,
      discount: discountAmount,
      total: subtotal - discountAmount,
      count: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [cartItems, discount]);

  function saveProducts(nextProducts) {
    const normalizedProducts = normalizeProducts(nextProducts);
    localStorage.setItem(productStorageKey, JSON.stringify(normalizedProducts));
    window.dispatchEvent(new Event(productUpdateEvent));
    return normalizedProducts;
  }

  function addToCart(product, quantity = 1) {
    const stock = Number(product.stock || 0);
    if (stock <= 0) {
      setMessage(`${product.name} is out of stock.`);
      return;
    }

    const cartKey = makeCartKey(product);
    setCartItems((currentItems) => {
      const existing = currentItems.find((item) => item.cartKey === cartKey);
      const currentQuantity = existing?.quantity || 0;
      const nextQuantity = Math.min(stock, currentQuantity + quantity);

      if (existing) {
        return currentItems.map((item) => item.cartKey === cartKey ? { ...item, quantity: nextQuantity } : item);
      }

      return [{
        cartKey,
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: Number(product.price || 0),
        stock,
        quantity: Math.min(stock, quantity)
      }, ...currentItems];
    });
    setMessage(`${product.name} added to cart.`);
  }

  function scanItem(event) {
    event.preventDefault();
    const product = findProduct(visibleProducts, scanCode);
    if (!product) {
      setMessage("No cashier-visible product matched that scan/code.");
      return;
    }

    addToCart(product, Math.max(1, Number(scanQuantity || 1)));
    setScanCode("");
    setScanQuantity("1");
  }

  function addSuggestedProduct(product) {
    addToCart(product, Math.max(1, Number(scanQuantity || 1)));
    setScanCode("");
    setScanQuantity("1");
  }

  function importItems(event) {
    event.preventDefault();
    const importedItems = parseImportedItems(importText);
    if (!importedItems.length) {
      setMessage("Add one item per line, like SKU,2.");
      return;
    }

    importedItems.forEach((item) => {
      const product = findProduct(visibleProducts, item.code);
      if (product) addToCart(product, item.quantity);
    });
    setImportText("");
    setMessage(`${importedItems.length} imported line${importedItems.length === 1 ? "" : "s"} processed.`);
  }

  function updateQuantity(cartKey, quantity) {
    setCartItems((currentItems) => currentItems.map((item) => {
      if (item.cartKey !== cartKey) return item;
      return { ...item, quantity: Math.max(1, Math.min(item.stock, Number(quantity || 1))) };
    }));
  }

  function removeCartItem(cartKey) {
    setCartItems((currentItems) => currentItems.filter((item) => item.cartKey !== cartKey));
  }

  function chooseCustomer(customerId) {
    if (!customerId) {
      setCustomerName("");
      setCustomerPhone("");
      return;
    }

    const customer = customers.find((item) => String(item.id) === customerId);
    setCustomerName(customer?.name || "");
    setCustomerPhone(customer?.phone || "");
  }

  function checkout() {
    if (!cartItems.length) {
      setMessage("Add items before checkout.");
      return;
    }

    const receipt = {
      id: `RCT-${String(Date.now()).slice(-6)}`,
      customerName: customerName.trim() || "Walk-in Customer",
      customerPhone: customerPhone.trim(),
      paymentMethod,
      items: cartItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      cashier,
      createdAt: new Date().toLocaleString()
    };

    setProducts((currentProducts) => saveProducts(currentProducts.map((product) => {
      const cartItem = cartItems.find((item) => item.id === product.id && item.sku === product.sku);
      if (!cartItem) return product;
      return {
        ...product,
        stock: Math.max(0, Number(product.stock || 0) - cartItem.quantity),
        soldCount: Number(product.soldCount || 0) + cartItem.quantity
      };
    })));

    localStorage.setItem(receiptStorageKey, JSON.stringify(receipt));
    let receiptHistory = [];
    try {
      receiptHistory = JSON.parse(localStorage.getItem(receiptHistoryStorageKey) || "[]");
    } catch {
      receiptHistory = [];
    }
    localStorage.setItem(receiptHistoryStorageKey, JSON.stringify([receipt, ...receiptHistory]));
    window.dispatchEvent(new Event(receiptHistoryUpdateEvent));
    setCartItems([]);
    setDiscount("");
    setMessage(`${receipt.id} paid by ${paymentMethod}. Opening receipt print page.`);
    router.push("/front-desk/receipt");
  }

  return (
    <div className="cashier-sale-layout">
      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><ScanLine /> Scan or Import Items</h2>
            <p>{visibleProducts.length} cashier-visible product{visibleProducts.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        <div className="cashier-panel">
          {message && <div className="front-desk-message">{message}</div>}

          <div className="cashier-scan-box">
            <form className="cashier-scan-row" onSubmit={scanItem}>
              <label className="field-group cashier-search-field">
                <span>Scan / Search Product</span>
                <input
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="Scan barcode, type SKU, or search item name"
                  autoFocus
                  autoComplete="off"
                  inputMode="search"
                />
              </label>
              <label className="field-group cashier-scan-qty">
                <span>Qty</span>
                <input
                  type="number"
                  min="1"
                  value={scanQuantity}
                  onChange={(event) => setScanQuantity(event.target.value)}
                />
              </label>
              <button className="btn-gold" type="submit"><ScanLine /> Add</button>
            </form>

            {productSuggestions.length > 0 && (
              <div className="cashier-product-suggestions">
                {productSuggestions.map((product) => (
                  <button type="button" key={makeCartKey(product)} onClick={() => addSuggestedProduct(product)}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.sku || "No SKU"} | {product.barcode || "No barcode"}</span>
                    </div>
                    <div>
                      <strong>{formatNaira(product.price || 0)}</strong>
                      <span>{product.stock || 0} in stock</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="cashier-import-block" onSubmit={importItems}>
            <label className="field-group">
              <span>Import Items</span>
              <textarea
                rows="6"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder={"One item per line: SKU,quantity\nAPL-14PRO,2\nGRC-RICE5,5"}
              />
            </label>
            <button className="btn-outline" type="submit"><FileUp /> Import List</button>
          </form>
        </div>
      </section>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><ShoppingCart /> Customer Basket</h2>
            <p>{totals.count} item{totals.count === 1 ? "" : "s"} scanned</p>
          </div>
          <Link className="btn-outline" href="/front-desk/receipt"><Printer /> Receipt</Link>
        </div>

        <div className="cashier-panel">
          <div className="form-grid cashier-customer-grid">
            <label className="field-group">
              <span>Cashier</span>
              <select value={cashier} onChange={(event) => setCashier(event.target.value)}>
                {!staff.some((person) => person.name === cashier) && <option value={cashier}>{cashier}</option>}
                {staff.map((person) => (
                  <option value={person.name} key={person.id}>{person.name}</option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>Saved Customer</span>
              <select onChange={(event) => chooseCustomer(event.target.value)} defaultValue="">
                <option value="">Walk-in / Manual</option>
                {customers.map((customer) => (
                  <option value={customer.id} key={customer.id}>{customer.name}</option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>Customer Name</span>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Walk-in Customer" />
            </label>
            <label className="field-group">
              <span>Phone</span>
              <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="+234..." />
            </label>
            <div className="field-group">
              <span>Mark Paid</span>
              <div className="front-desk-payment-options" role="group" aria-label="Payment method">
                <button
                  className={paymentMethod === "Cash" ? "active" : ""}
                  type="button"
                  onClick={() => setPaymentMethod("Cash")}
                >
                  <Banknote /> Cash
                </button>
                <button
                  className={paymentMethod === "POS" ? "active" : ""}
                  type="button"
                  onClick={() => setPaymentMethod("POS")}
                >
                  <CreditCard /> POS
                </button>
              </div>
            </div>
          </div>

          <DataTable
            columns={["Product", "SKU", "Price", "Qty", "Line Total", "Remove"]}
            rows={cartItems}
            rowKey={(item) => item.cartKey}
            emptyMessage="No scanned or imported items yet."
            tableClassName="product-data-table cashier-cart-table"
            renderRow={(item) => (
              <>
                <td><strong>{item.name}</strong></td>
                <td><span className="order-id">{item.sku}</span></td>
                <td className="gold-text">{formatNaira(item.price)}</td>
                <td>
                  <div className="front-desk-sale-controls">
                    <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}><Minus /></button>
                    <input type="number" min="1" max={item.stock} value={item.quantity} onChange={(event) => updateQuantity(item.cartKey, event.target.value)} />
                    <button className="icon-button sale-stepper" type="button" onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}><Plus /></button>
                  </div>
                </td>
                <td className="gold-text">{formatNaira(item.price * item.quantity)}</td>
                <td><button className="icon-button" type="button" onClick={() => removeCartItem(item.cartKey)} aria-label={`Remove ${item.name}`}><Trash2 /></button></td>
              </>
            )}
          />

          <div className="cashier-total-panel">
            <label className="field-group">
              <span>Discount</span>
              <input type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="0" />
            </label>
            <div className="cashier-total-lines">
              <div><span>Subtotal</span><strong>{formatNaira(totals.subtotal)}</strong></div>
              <div><span>Discount</span><strong>{formatNaira(totals.discount)}</strong></div>
              <div className="cashier-grand-total"><span>Total</span><strong>{formatNaira(totals.total)}</strong></div>
            </div>
            <button className="btn-gold cashier-checkout-button" type="button" onClick={checkout}><Printer /> Mark Paid & Print Receipt</button>
          </div>
        </div>
      </section>
    </div>
  );
}
