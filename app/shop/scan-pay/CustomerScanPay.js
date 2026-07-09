"use client";

import Link from "next/link";
import { ImageIcon, Plus, ReceiptText, ScanLine, Search, ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import { formatNaira } from "../../data";

const productStorageKey = "retail-products";
const productUpdateEvent = "retail-products-updated";
const scanPayCartStorageKey = "retail-scan-pay-cart";
const receiptStorageKey = "retail-last-receipt";

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

function productMatchesQuery(product, query) {
  if (!query) return true;

  const searchableText = [
    product.name,
    product.sku,
    product.barcode,
    product.category,
    product.description,
    product.price
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

function getProductImage(product) {
  const image = product.images?.[0];
  if (!image) return "";
  return /^(data:image\/|https?:\/\/|\/)/i.test(image) ? image : "";
}

export default function CustomerScanPay({ initialProducts }) {
  const [products, setProducts] = useState(normalizeProducts(initialProducts));
  const [cartItems, setCartItems] = useState([]);
  const [scanCode, setScanCode] = useState("");
  const [query, setQuery] = useState("");
  const [buyQuantities, setBuyQuantities] = useState({});
  const [hasReceipt, setHasReceipt] = useState(false);
  const [message, setMessage] = useState("");

  const visibleProducts = products.filter((product) => product.frontDeskVisible !== false);
  const filteredProducts = visibleProducts.filter((product) => productMatchesQuery(product, query.trim()));
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    function loadProducts() {
      const savedProducts = localStorage.getItem(productStorageKey);
      if (!savedProducts) {
        const normalizedProducts = normalizeProducts(initialProducts);
        localStorage.setItem(productStorageKey, JSON.stringify(normalizedProducts));
        setProducts(normalizedProducts);
        return;
      }

      try {
        setProducts(normalizeProducts(JSON.parse(savedProducts)));
      } catch {
        localStorage.removeItem(productStorageKey);
        setProducts(normalizeProducts(initialProducts));
      }
    }

    function loadCart() {
      const savedCart = localStorage.getItem(scanPayCartStorageKey);
      setCartItems(savedCart ? JSON.parse(savedCart) : []);
      setHasReceipt(Boolean(localStorage.getItem(receiptStorageKey)));
    }

    loadProducts();
    loadCart();
    window.addEventListener("storage", loadProducts);
    window.addEventListener(productUpdateEvent, loadProducts);
    return () => {
      window.removeEventListener("storage", loadProducts);
      window.removeEventListener(productUpdateEvent, loadProducts);
    };
  }, [initialProducts]);

  function saveCart(nextItems) {
    localStorage.setItem(scanPayCartStorageKey, JSON.stringify(nextItems));
    setCartItems(nextItems);
  }

  function getProductQuantity(product) {
    return Math.max(1, Number(buyQuantities[makeCartKey(product)] || 1));
  }

  function updateBuyQuantity(product, quantity) {
    const stock = Number(product.stock || 0);
    setBuyQuantities((quantities) => ({
      ...quantities,
      [makeCartKey(product)]: String(Math.max(1, Math.min(stock || 1, Number(quantity || 1))))
    }));
  }

  function addToCart(product, quantity = getProductQuantity(product)) {
    const stock = Number(product.stock || 0);
    const cartKey = makeCartKey(product);

    if (stock <= 0) {
      setMessage(`${product.name} is out of stock.`);
      return;
    }

    if (quantity > stock) {
      setMessage(`Only ${stock} ${product.name} available.`);
      return;
    }

    const nextItems = (() => {
      const existing = cartItems.find((item) => item.cartKey === cartKey);
      if (existing) {
        return cartItems.map((item) => (
          item.cartKey === cartKey ? { ...item, quantity: Math.min(stock, item.quantity + quantity) } : item
        ));
      }

      return [{
        cartKey,
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: Number(product.price || 0),
        stock,
        quantity
      }, ...cartItems];
    })();

    saveCart(nextItems);
    setMessage(`${quantity} ${product.name} added to cart.`);
  }

  function scanItem(event) {
    event.preventDefault();
    const product = findProduct(visibleProducts, scanCode);

    if (!product) {
      setMessage("No product matched that scan, SKU, barcode, or name.");
      return;
    }

    addToCart(product, 1);
    setScanCode("");
  }

  function buyNow(product) {
    addToCart(product, getProductQuantity(product));
    window.location.href = "/shop/scan-pay/cart";
  }

  return (
    <>
      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><ScanLine /> Scan Product</h2>
            <p>Scan or search for items, then open cart to pay.</p>
          </div>
          <div className="shop-controls">
            <Link className="shop-cart-icon-button" href="/shop/scan-pay/cart" aria-label="Open scanned cart">
              <ShoppingCart />
              {cartCount > 0 && <span>{cartCount}</span>}
            </Link>
            <Link className="shop-cart-icon-button" href="/shop/scan-pay/receipt" aria-label="Open scan pay receipt">
              <ReceiptText />
              {hasReceipt && <span>1</span>}
            </Link>
          </div>
        </div>

        <div className="cashier-panel">
          {message && <div className="front-desk-message">{message}</div>}

          <form className="cashier-scan-row" onSubmit={scanItem}>
            <label className="field-group">
              <span>Scan / SKU / Barcode</span>
              <input
                value={scanCode}
                onChange={(event) => setScanCode(event.target.value)}
                placeholder="APL-14PRO"
                autoFocus
                autoComplete="off"
                inputMode="search"
              />
            </label>
            <button className="btn-gold" type="submit"><Plus /> Add to Cart</button>
          </form>

          <label className="product-search scan-pay-search">
            <Search />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search item by name, SKU, barcode..."
              aria-label="Search scan pay products"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear scan pay search">
                <X />
              </button>
            )}
          </label>
        </div>
      </section>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Available Items</h2>
            <p>{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"} customers can scan or buy</p>
          </div>
        </div>

        <DataTable
          columns={["Image", "Product", "SKU", "Price", "Stock", "Qty", "Actions"]}
          rows={filteredProducts}
          rowKey={(product) => makeCartKey(product)}
          emptyMessage="No products match your search."
          tableClassName="product-data-table"
          renderRow={(product) => {
            const stock = Number(product.stock || 0);
            const quantity = getProductQuantity(product);
            const productImage = getProductImage(product);

            return (
              <>
                <td>
                  <div className="scan-pay-product-image">
                    {productImage
                      ? <img src={productImage} alt={product.name} />
                      : <ImageIcon aria-label="No product image" />}
                  </div>
                </td>
                <td><strong>{product.name}</strong></td>
                <td><span className="order-id">{product.sku}</span></td>
                <td className="gold-text">{formatNaira(product.price || 0)}</td>
                <td>
                  <span className={`status-badge ${stock > 0 ? "status-active" : "status-pending"}`}>
                    {stock > 0 ? stock : "Out"}
                  </span>
                </td>
                <td>
                  <input
                    className="scan-pay-quantity-input"
                    type="number"
                    min="1"
                    max={stock || 1}
                    value={quantity}
                    onChange={(event) => updateBuyQuantity(product, event.target.value)}
                    aria-label={`${product.name} quantity`}
                  />
                </td>
                <td>
                  <div className="scan-pay-row-actions">
                    <button className="btn-gold product-row-button" type="button" onClick={() => buyNow(product)} disabled={stock <= 0}>
                      Buy
                    </button>
                    <button className="btn-outline product-row-button" type="button" onClick={() => addToCart(product, quantity)} disabled={stock <= 0}>
                      Add to Cart
                    </button>
                  </div>
                </td>
              </>
            );
          }}
        />
      </section>
    </>
  );
}
