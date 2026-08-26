"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, Boxes, ClipboardList, HandCoins, Handshake, Home, MessageSquareText, PackageCheck, Recycle, ScanLine, Store, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

const activeOutletStorageKey = "retail-active-outlet";

const modules = [
  { href: "/products", label: "Inventory", description: "Manage this outlet's stock and products.", icon: Boxes },
  { href: "/front-desk", label: "Front Desk", description: "Open the sales counter for this outlet.", icon: ScanLine },
  { href: "/orders", label: "Orders", description: "Track orders belonging to this outlet.", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", description: "Review this outlet's performance.", icon: BarChart3 },
  { href: "/customers", label: "Customers", description: "View customers served by this outlet.", icon: MessageSquareText },
  { href: "/vendors", label: "Vendors", description: "Manage this outlet's supplier relationships.", icon: Handshake },
  { href: "/vendor-transactions", label: "Purchasing", description: "Review outlet purchasing activity.", icon: HandCoins },
  { href: "/inventory", label: "Assets", description: "Track equipment at this outlet.", icon: PackageCheck },
  { href: "/staff", label: "Staff", description: "Manage people assigned to this outlet.", icon: Users },
  { href: "/waste-management", label: "Waste", description: "Review stock and equipment waste.", icon: Recycle }
];

export default function OutletWorkspace({ params }) {
  const [outlet, setOutlet] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const outletId = String(params.id);
    localStorage.setItem(activeOutletStorageKey, outletId);

    Promise.all([
      apiFetch(`/outlets/${outletId}/statistics`),
      apiFetch("/outlets")
    ]).then(([workspace, list]) => {
      setOutlet(workspace.outlet);
      localStorage.setItem(activeOutletStorageKey, JSON.stringify(workspace.outlet));
      window.dispatchEvent(new Event("active-outlet-changed"));
      setStatistics(workspace.statistics);
      setOutlets(list.outlets || []);
    }).catch((error) => setMessage(error.message || "Could not load this outlet."));
  }, [params.id]);

  function moduleHref(href) {
    return `${href}?outlet_id=${params.id}`;
  }

  if (message) return <div className="workspace-page"><div className="section-card"><p>{message}</p><Link className="btn-outline" href="/dashboard">Back to Dashboard</Link></div></div>;
  if (!outlet) return <div className="workspace-page"><div className="section-card"><p>Loading outlet workspace...</p></div></div>;

  return (
    <>
      <style jsx>{`
        .workspace-page { margin: 14px 0 32px; }
        .workspace-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 26px; padding: 28px; border-radius: 14px; color: #fff; background: linear-gradient(120deg, #000000, #151515 58%, #5b4611); box-shadow: 0 18px 35px rgba(0, 0, 0, .22); }
        .workspace-kicker { color: #e7c85b; font-size: 11px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
        .workspace-title { display: flex; align-items: center; gap: 11px; margin: 8px 0; }
        .workspace-title h1 { margin: 0; color: #fff; font-size: clamp(1.8rem, 4vw, 2.7rem); }
        .workspace-meta { color: rgba(255,255,255,.72); margin: 0; }
        .workspace-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
        .outlet-switcher { min-width: 180px; padding: 10px 12px; border: 1px solid rgba(201,160,32,.55); border-radius: 7px; background: rgba(255,255,255,.95); }
        .workspace-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 26px; }
        .workspace-stat { padding: 19px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; box-shadow: 0 8px 20px rgba(15, 23, 42, .05); }
        .workspace-stat strong { display: block; font-size: 26px; color: #172033; }
        .workspace-stat span { color: #64748b; font-size: 13px; }
        .module-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 8px 28px 42px; }
        .workspace-modules { padding-bottom: 12px; }
        .module-card { display: block; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; color: inherit; text-decoration: none; transition: transform .2s, border-color .2s, box-shadow .2s; }
        .module-card:hover { transform: translateY(-2px); border-color: #d97706; box-shadow: 0 8px 20px rgb(15 23 42 / .08); }
        .module-icon { display: inline-flex; padding: 10px; color: #9a7400; background: #fff7d6; border-radius: 7px; }
        .module-card h2 { margin: 14px 0 6px; font-size: 17px; }
        .module-card p { margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; }
        @media (max-width: 900px) { .module-grid { grid-template-columns: repeat(2, 1fr); } .workspace-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .workspace-page { margin: 8px 0 22px; } .workspace-header { flex-direction: column; padding: 22px; } .workspace-actions { justify-content: flex-start; } .module-grid { grid-template-columns: 1fr; padding: 8px 16px 30px; } }
      `}</style>

      <div className="workspace-page">
        <div className="workspace-header">
        <div>
          <div className="workspace-kicker">Outlet workspace</div>
          <div className="workspace-title"><Store /><h1>{outlet.name}</h1></div>
          <p className="workspace-meta">{outlet.code}{outlet.city ? ` · ${outlet.city}` : ""} · {outlet.is_active ? "Active" : "Inactive"}</p>
        </div>
        <div className="workspace-actions">
          <select className="outlet-switcher" value={String(outlet.id)} onChange={(event) => { window.location.href = `/outlets/${event.target.value}`; }} aria-label="Switch outlet">
            {outlets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Link className="btn-outline" href="/dashboard"><ArrowLeft size={15} /> All Outlets</Link>
          <Link className="btn-outline" href={moduleHref("/dashboard")}><Home size={15} /> Overview</Link>
        </div>
        </div>

        <div className="workspace-stats">
        <div className="workspace-stat"><strong>{statistics?.total_products || 0}</strong><span>Products</span></div>
        <div className="workspace-stat"><strong>{statistics?.total_orders || 0}</strong><span>Orders</span></div>
        <div className="workspace-stat"><strong>{statistics?.total_sales || 0}</strong><span>Counter sales</span></div>
        <div className="workspace-stat"><strong>{statistics?.active_staff || 0}</strong><span>Active staff</span></div>
        </div>

        <section className="section-card workspace-modules">
        <div className="section-header"><div><h2>Operate {outlet.name}</h2><p>Every module below is scoped to this outlet.</p></div></div>
        <div className="module-grid">
          {modules.map(({ href, label, description, icon: Icon }) => <Link className="module-card" href={moduleHref(href)} key={href}><span className="module-icon"><Icon size={20} /></span><h2>{label}</h2><p>{description}</p></Link>)}
        </div>
        </section>
      </div>
    </>
  );
}
