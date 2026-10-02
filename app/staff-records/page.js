"use client";

import { BarChart3, ClipboardList, Eye, ReceiptText, Recycle, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { formatNaira } from "../data";
import { apiFetch, getApiBaseUrl } from "../lib/api";

const sessionStorageKey = "retail-auth-session";
const fullAccessRoles = ["Admin", "Developer"];

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey) || "null");
  } catch {
    return null;
  }
}

function salesForStaff(sales, person) {
  return sales.filter((sale) => (sale.cashier || "").toLowerCase() === person.name.toLowerCase());
}

function statsForSales(sales) {
  return {
    revenue: sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
    transactions: sales.length,
    units: sales.reduce((sum, sale) => (
      sum + (sale.items?.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0) || 0)
    ), 0)
  };
}

export default function StaffRecordsPage() {
  const [session, setSession] = useState(null);
  const [staff, setStaff] = useState([]);
  const [sales, setSales] = useState([]);
  const [waste, setWaste] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("");

  const selectedStaff = staff.find((person) => person.id === selectedId) || staff[0] || null;
  const selectedSales = selectedStaff ? salesForStaff(sales, selectedStaff) : [];
  const selectedWaste = selectedStaff
    ? waste.filter((record) => Number(record.userId || 0) === Number(selectedStaff.id))
    : [];
  const selectedStats = statsForSales(selectedSales);
  const overallStats = statsForSales(sales);

  const staffRows = useMemo(() => staff.map((person) => {
    const personSales = salesForStaff(sales, person);
    return { ...person, ...statsForSales(personSales) };
  }), [staff, sales]);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSales() {
      try {
        const data = await apiFetch("/sales");
        if (!cancelled) setSales(data.sales || []);
      } catch {
        if (!cancelled) setSales([]);
      }
    }

    async function loadWaste() {
      try {
        const data = await apiFetch("/waste");
        if (!cancelled) setWaste(data.records || []);
      } catch {
        if (!cancelled) setWaste([]);
      }
    }

    loadSales();
    loadWaste();
    return () => { cancelled = true; };
  }, [session?.token]);

  useEffect(() => {
    if (!session?.token) return;

    async function loadStaff() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/staff`, {
          headers: {
            "Accept": "application/json",
            "Authorization": `${session.tokenType || "Bearer"} ${session.token}`
          },
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setMessage(data.message || "Staff records could not be loaded.");
          return;
        }

        setStaff(data.staff || []);
        setSelectedId((currentId) => currentId || data.staff?.[0]?.id || null);
      } catch {
        setMessage("Cannot reach the staff API. Start the Laravel backend and try again.");
      }
    }

    loadStaff();
  }, [session]);

  if (session && !fullAccessRoles.includes(session.role)) {
    return (
      <section className="section-card">
        <div className="empty-table-cell">Only admins or the developer account can view staff records.</div>
      </section>
    );
  }

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><BarChart3 /> Staff Records</h1>
          <p>Review cashier and staff sales performance from completed receipts.</p>
        </div>
        <div className="role-badge">Admin & Developer</div>
      </div>

      {message && <div className="front-desk-message staff-message">{message}</div>}

      <div className="cards-grid cashier-dashboard-stats">
        <StatCard icon={<ReceiptText />} label="Recorded Sales" value={formatNaira(overallStats.revenue)} trend="All staff receipts" index={1} />
        <StatCard icon={<ClipboardList />} label="Transactions" value={overallStats.transactions} trend="Completed receipts" index={2} />
        <StatCard icon={<Users />} label="Units Sold" value={overallStats.units} trend="Items across staff sales" index={3} />
      </div>

      <section className="section-card staff-records-grid">
        <div>
          <div className="section-header product-table-header">
            <div>
              <h2><Users /> Staff Summary</h2>
              <p>{staffRows.length} staff account{staffRows.length === 1 ? "" : "s"}</p>
            </div>
          </div>

          <DataTable
            columns={["Staff", "Role", "Transactions", "Units", "Sales", "View"]}
            rows={staffRows}
            rowKey={(person) => person.id}
            emptyMessage="No staff records to show."
            tableClassName="product-data-table"
            renderRow={(person) => (
              <>
                <td><strong>{person.name}</strong></td>
                <td>{person.role}</td>
                <td>{person.transactions}</td>
                <td>{person.units}</td>
                <td className="gold-text">{formatNaira(person.revenue)}</td>
                <td>
                  <button className="btn-outline staff-table-action" type="button" onClick={() => setSelectedId(person.id)}>
                    <Eye /> Details
                  </button>
                </td>
              </>
            )}
          />
        </div>

        <div className="staff-record-detail">
          <div className="section-header product-table-header">
            <div>
              <h2><ReceiptText /> {selectedStaff?.name || "Staff"} Sales</h2>
              <p>{selectedStats.transactions} sale{selectedStats.transactions === 1 ? "" : "s"} | {formatNaira(selectedStats.revenue)} total | {selectedStats.units} units</p>
            </div>
          </div>

          <DataTable
            columns={["Receipt", "Customer", "Products", "Units", "Payment", "Total", "Date"]}
            rows={selectedSales}
            rowKey={(sale, index) => `${sale.id}-${index}`}
            emptyMessage="No sales have been recorded for this staff member yet."
            tableClassName="product-data-table front-desk-history-table"
            renderRow={(sale) => (
              <>
                <td><span className="order-id">{sale.id}</span></td>
                <td>{sale.customerName || "Walk-in Customer"}</td>
                <td>{sale.items?.map((item) => item.name).join(", ") || "-"}</td>
                <td>{sale.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0}</td>
                <td>{sale.paymentMethod || "-"}</td>
                <td className="gold-text">{formatNaira(Number(sale.total || 0))}</td>
                <td>{sale.createdAt || "-"}</td>
              </>
            )}
          />

          <div className="section-header product-table-header" style={{ marginTop: "1.5rem" }}>
            <div>
              <h2><Recycle /> {selectedStaff?.name || "Staff"} Waste Log</h2>
              <p>{selectedWaste.length} waste record{selectedWaste.length === 1 ? "" : "s"}</p>
            </div>
          </div>

          <DataTable
            columns={["Item", "Reason", "Qty", "Action", "Note", "Date"]}
            rows={selectedWaste}
            rowKey={(record, index) => `${record.id}-${index}`}
            emptyMessage="No waste has been recorded for this staff member yet."
            tableClassName="product-data-table front-desk-history-table"
            renderRow={(record) => (
              <>
                <td><strong>{record.itemName}</strong></td>
                <td>{record.reason || "-"}</td>
                <td>{record.quantity || 0}</td>
                <td>{record.action || "-"}</td>
                <td className="description-cell">{record.note || "-"}</td>
                <td>{record.recordedAt || "-"}</td>
              </>
            )}
          />
        </div>
      </section>
    </>
  );
}