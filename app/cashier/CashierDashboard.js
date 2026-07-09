"use client";

import Link from "next/link";
import { ClipboardList, Printer, ScanLine, ShoppingCart, Store, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import { formatNaira } from "../data";

const receiptHistoryStorageKey = "retail-receipt-history";
const receiptHistoryUpdateEvent = "retail-receipt-history-updated";

const cashierTools = [
  {
    href: "/front-desk",
    icon: Store,
    title: "Front Desk",
    description: "View products, current prices, stock, and quick-sale controls."
  },
  {
    href: "/front-desk/sell",
    icon: ShoppingCart,
    title: "Cashier Sale",
    description: "Scan products, build the customer basket, and complete payment."
  },
  {
    href: "/front-desk/receipt",
    icon: Printer,
    title: "Receipts",
    description: "Open, review, and print completed customer receipts."
  },
  {
    href: "/front-desk/sales-history",
    icon: ClipboardList,
    title: "Sales History",
    description: "Review products sold, cashiers, totals, and transaction dates."
  }
];

export default function CashierDashboard() {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    function loadSales() {
      try {
        setSales(JSON.parse(localStorage.getItem(receiptHistoryStorageKey) || "[]"));
      } catch {
        localStorage.removeItem(receiptHistoryStorageKey);
        setSales([]);
      }
    }

    loadSales();
    window.addEventListener("storage", loadSales);
    window.addEventListener(receiptHistoryUpdateEvent, loadSales);
    return () => {
      window.removeEventListener("storage", loadSales);
      window.removeEventListener(receiptHistoryUpdateEvent, loadSales);
    };
  }, []);

  const totals = useMemo(() => ({
    revenue: sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
    transactions: sales.length,
    units: sales.reduce((sum, sale) => (
      sum + (sale.items?.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0) || 0)
    ), 0)
  }), [sales]);

  return (
    <div className="cashier-page-frame">
      <div className="top-bar">
        <div className="page-title">
          <h1><ScanLine /> Cashier Dashboard</h1>
          <p>Everything needed to sell products, print receipts, and review sales.</p>
        </div>
        <div className="role-badge">Cashier Access</div>
      </div>

      <div className="cards-grid cashier-dashboard-stats">
        <StatCard icon={<TrendingUp />} label="Recorded Sales" value={formatNaira(totals.revenue)} trend="All saved cashier sales" index={1} />
        <StatCard icon={<ClipboardList />} label="Transactions" value={totals.transactions} trend="Completed receipts" index={2} />
        <StatCard icon={<ShoppingCart />} label="Units Sold" value={totals.units} trend="Items across all sales" index={3} />
      </div>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>Cashier Tools</h2>
            <p>Only cashier-approved areas are available from this dashboard.</p>
          </div>
        </div>
        <div className="cashier-dashboard-tools">
          {cashierTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link className="front-desk-portal-tile" href={tool.href} key={tool.href}>
                <Icon />
                <div>
                  <strong>{tool.title}</strong>
                  <span>{tool.description}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
