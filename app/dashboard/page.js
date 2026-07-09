"use client";

import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Flame, LineChart, PackageCheck, Recycle, Star, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import RecentOrdersTable from "../components/RecentOrdersTable";
import { calcMonthlyIncome, formatNaira, orders, products, staff } from "../data";

const productStorageKey = "retail-products";
const productUpdateEvent = "retail-products-updated";
const wasteStorageKey = "retail-waste-register";

function getExpiryState(product) {
  if (!product.expiryDate) return null;

  const expiryDate = new Date(`${product.expiryDate}T23:59:59`);
  if (Number.isNaN(expiryDate.getTime())) return null;

  const now = new Date();
  const warningDate = new Date(now);
  warningDate.setMonth(warningDate.getMonth() + 3);

  if (expiryDate < now) return { status: "Expired", urgent: true, expiryDate };
  if (expiryDate <= warningDate) return { status: "Expiring soon", urgent: true, expiryDate };
  return null;
}

export default function DashboardPage() {
  const [liveProducts, setLiveProducts] = useState(products);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function loadProducts() {
      const savedProducts = localStorage.getItem(productStorageKey);
      if (!savedProducts) {
        setLiveProducts(products);
        return;
      }

      try {
        setLiveProducts(JSON.parse(savedProducts));
      } catch {
        localStorage.removeItem(productStorageKey);
        setLiveProducts(products);
      }
    }

    loadProducts();
    window.addEventListener("storage", loadProducts);
    window.addEventListener(productUpdateEvent, loadProducts);
    return () => {
      window.removeEventListener("storage", loadProducts);
      window.removeEventListener(productUpdateEvent, loadProducts);
    };
  }, []);

  function saveProducts(nextProducts) {
    localStorage.setItem(productStorageKey, JSON.stringify(nextProducts));
    window.dispatchEvent(new Event(productUpdateEvent));
    setLiveProducts(nextProducts);
  }

  function saveWasteRecord(product, expiry) {
    let currentWaste = [];
    try {
      currentWaste = JSON.parse(localStorage.getItem(wasteStorageKey) || "[]");
    } catch {
      currentWaste = [];
    }
    const wasteRecord = {
      id: Date.now(),
      itemName: product.name,
      itemType: "Product",
      reason: expiry.status === "Expired" ? "Expired" : "Unsafe",
      quantity: Math.max(1, Number(product.stock || 1)),
      action: "Quarantine",
      note: `Moved from dashboard expiry alert. SKU: ${product.sku}.`,
      recordedAt: new Date().toLocaleString()
    };

    localStorage.setItem(wasteStorageKey, JSON.stringify([wasteRecord, ...currentWaste]));
    return wasteRecord;
  }

  function moveProductToWaste(product, expiry) {
    const confirmed = window.confirm(`Move ${product.name} to the waste register and remove it from inventory?`);
    if (!confirmed) return;

    const wasteRecord = saveWasteRecord(product, expiry);
    saveProducts(liveProducts.filter((item) => item.id !== product.id || item.sku !== product.sku));
    setMessage(`${wasteRecord.itemName} has been moved to waste.`);
  }

  const totalRevenue = orders.filter((order) => order.status === "Delivered").reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;
  const delivered = orders.filter((order) => order.status === "Delivered").length;
  const unitsSold = liveProducts.reduce((sum, product) => sum + Number(product.soldCount || 0), 0);
  const expiryAlerts = liveProducts
    .map((product) => ({ product, expiry: getExpiryState(product) }))
    .filter((item) => item.expiry)
    .sort((a, b) => a.expiry.expiryDate - b.expiry.expiryDate);
  const bestProduct = [...liveProducts].sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0))[0] || products[0];
  const topStaff = [...staff].sort((a, b) => b.sales - a.sales)[0];
  const monthlyIncome = calcMonthlyIncome();
  const peakMonth = monthlyIncome.months[monthlyIncome.income.indexOf(Math.max(...monthlyIncome.income))];
  const recentOrders = [...orders].reverse().slice(0, 5);

  const stats = [
    { icon: <TrendingUp />, label: "Total Revenue", value: formatNaira(totalRevenue), trend: "+18.3%" },
    { icon: <CheckCircle2 />, label: "Success Rate", value: `${Math.round((delivered / totalOrders) * 100)}%`, trend: `${delivered}/${totalOrders} delivered` },
    { icon: <Flame />, label: "Top Product", value: bestProduct.name.split(" ")[0], trend: `${bestProduct.soldCount} units` },
    { icon: <Star />, label: "MVP Staff", value: topStaff.name, trend: formatNaira(topStaff.sales) },
    { icon: <PackageCheck />, label: "Units Moved", value: unitsSold.toLocaleString(), trend: "All-time sales" },
    {
      icon: <AlertTriangle />,
      label: "Expiry Alerts",
      value: expiryAlerts.length,
      trend: expiryAlerts.length ? "Action required now" : "No products within 3 months",
      alert: expiryAlerts.length > 0
    },
    { icon: <LineChart />, label: "Avg Order", value: formatNaira(Math.round(totalRevenue / delivered)), trend: "Premium basket" },
    { icon: <CalendarDays />, label: "Peak Month", value: peakMonth, trend: "Highest revenue" }
  ];

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><LineChart /> Flexi Command</h1>
          <p>Retail intelligence live pulse</p>
        </div>
        <div className="role-badge">Flexi Access</div>
      </div>

      <div className="cards-grid">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} index={index + 1} {...stat} />
        ))}
      </div>

      {expiryAlerts.length > 0 && (
        <section className="section-card expiry-alert-panel">
          <div className="section-header">
            <div>
              <h2><AlertTriangle /> Expired Product Alert</h2>
              <p>These products are expired or will expire within three months.</p>
            </div>
            <Link className="btn-outline" href="/products">Review Products</Link>
          </div>
          {message && <div className="front-desk-message">{message}</div>}
          <div className="expiry-alert-list">
            {expiryAlerts.map(({ product, expiry }) => (
              <div className="expiry-alert-item" key={`${product.sku}-${product.id}`}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.sku} · {product.stock || 0} in stock</span>
                </div>
                <div>
                  <span className="expiry-alert-status"><Clock3 /> {expiry.status}</span>
                  <strong>{expiry.expiryDate.toLocaleDateString()}</strong>
                </div>
                <button className="btn-outline product-row-button waste-action-button" type="button" onClick={() => moveProductToWaste(product, expiry)}>
                  <Recycle />
                  Move to Waste
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section-card">
        <div className="section-header">
          <h2>Recent Orders</h2>
          <Link className="btn-outline" href="/orders">View All Orders →</Link>
        </div>
        <RecentOrdersTable orders={recentOrders} />
      </section>

      <div className="insight-text">
        <LineChart />
        <strong>Flexi Insight:</strong> Revenue surged 18% this quarter. {bestProduct.name} is the star product. Staff performance is at an all-time high.
      </div>
    </>
  );
}
