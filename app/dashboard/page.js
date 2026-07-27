"use client";

import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Flame, LineChart, PackageCheck, Recycle, Star, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import RecentOrdersTable from "../components/RecentOrdersTable";
import { formatNaira } from "../data";
import { apiFetch } from "../lib/api";
import { chartMonths, monthlyIncomeFromOrders } from "../components/Charts";

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
  const [liveProducts, setLiveProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const load = async (path, apply) => {
        try {
          const data = await apiFetch(path);
          if (!cancelled) apply(data);
        } catch {
          /* individual sections fail independently */
        }
      };

      await Promise.all([
        load("/products", (data) => setLiveProducts(data.products || [])),
        load("/orders", (data) => setOrders(data.orders || [])),
        load("/sales", (data) => setSales(data.sales || [])),
        load("/staff", (data) => setStaff(data.staff || data.users || []))
      ]);

      if (!cancelled) setLoading(false);
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  async function moveProductToWaste(product, expiry) {
    const confirmed = window.confirm(`Move ${product.name} to the waste register and clear its stock?`);
    if (!confirmed) return;

    try {
      await apiFetch("/waste", {
        method: "POST",
        body: {
          itemName: product.name,
          itemType: "Product",
          reason: expiry.status === "Expired" ? "Expired" : "Unsafe",
          quantity: Math.max(1, Number(product.stock || 1)),
          action: "Quarantine",
          note: `Moved from dashboard expiry alert. SKU: ${product.sku}.`,
          productId: Number(product.stock || 0) > 0 ? product.id : null
        }
      });

      setLiveProducts((current) => current.map((item) => (
        item.id === product.id ? { ...item, stock: 0 } : item
      )));
      setMessage(`${product.name} has been moved to waste.`);
    } catch (error) {
      setMessage(error.message || "Could not move the product to waste.");
    }
  }

  const deliveredOrders = orders.filter((order) => order.status === "Delivered");
  const orderRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const salesRevenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalRevenue = orderRevenue + salesRevenue;
  const totalOrders = orders.length;
  const delivered = deliveredOrders.length;
  const unitsSold = liveProducts.reduce((sum, product) => sum + Number(product.soldCount || 0), 0);
  const expiryAlerts = liveProducts
    .map((product) => ({ product, expiry: getExpiryState(product) }))
    .filter((item) => item.expiry)
    .sort((a, b) => a.expiry.expiryDate - b.expiry.expiryDate);
  const bestProduct = [...liveProducts].sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0))[0] || null;

  const staffSales = staff.map((person) => ({
    ...person,
    salesTotal: sales
      .filter((sale) => (sale.cashier || "").toLowerCase() === (person.name || "").toLowerCase())
      .reduce((sum, sale) => sum + Number(sale.total || 0), 0)
  }));
  const topStaff = [...staffSales].sort((a, b) => b.salesTotal - a.salesTotal)[0] || null;

  const monthlyIncome = monthlyIncomeFromOrders(orders);
  const bestMonthValue = Math.max(...monthlyIncome.income);
  const peakMonth = bestMonthValue > 0 ? chartMonths[monthlyIncome.income.indexOf(bestMonthValue)] : "-";
  const recentOrders = orders.slice(0, 5);

  const stats = [
    { icon: <TrendingUp />, label: "Total Revenue", value: formatNaira(totalRevenue), trend: "Orders + cashier sales" },
    { icon: <CheckCircle2 />, label: "Success Rate", value: totalOrders ? `${Math.round((delivered / totalOrders) * 100)}%` : "0%", trend: `${delivered}/${totalOrders} delivered` },
    { icon: <Flame />, label: "Top Product", value: bestProduct ? bestProduct.name.split(" ")[0] : "-", trend: bestProduct ? `${bestProduct.soldCount || 0} units` : "No sales yet" },
    { icon: <Star />, label: "MVP Staff", value: topStaff ? topStaff.name : "-", trend: topStaff ? formatNaira(topStaff.salesTotal) : "No cashier sales yet" },
    { icon: <PackageCheck />, label: "Units Moved", value: unitsSold.toLocaleString(), trend: "All-time sales" },
    {
      icon: <AlertTriangle />,
      label: "Expiry Alerts",
      value: expiryAlerts.length,
      trend: expiryAlerts.length ? "Action required now" : "No products within 3 months",
      alert: expiryAlerts.length > 0
    },
    { icon: <LineChart />, label: "Avg Order", value: delivered ? formatNaira(Math.round(orderRevenue / delivered)) : formatNaira(0), trend: "Delivered orders" },
    { icon: <CalendarDays />, label: "Peak Month", value: peakMonth, trend: "Highest revenue" }
  ];

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><LineChart /> Flexi Command</h1>
          <p>{loading ? "Loading retail intelligence..." : "Retail intelligence live pulse"}</p>
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
        <strong>Flexi Insight:</strong> {bestProduct
          ? `${bestProduct.name} is the current top seller with ${bestProduct.soldCount || 0} units moved.`
          : "Sales insights will appear here as transactions are recorded."}
      </div>
    </>
  );
}
