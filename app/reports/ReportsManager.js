"use client";

import { FileSpreadsheet, FileText, Mail, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";
import { apiFetch } from "../lib/api";

const periods = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" }
];

export default function ReportsManager() {
  const [period, setPeriod] = useState("daily");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [showEmailField, setShowEmailField] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  async function loadReport() {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ period, date });
      const data = await apiFetch(`/reports/sales?${params.toString()}`);
      setSummary(data.summary);
      setSales(data.sales || []);
    } catch (error) {
      setMessage(error.message || "Could not load the report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, date]);

  function handleExportExcel() {
    if (!sales.length) {
      setMessage("Nothing to export for this period.");
      return;
    }

    const rows = sales.map((sale) => ({
      "Sale #": sale.saleNumber,
      "Date": sale.date,
      "Cashier": sale.cashier,
      "Customer": sale.customer || "-",
      "Payment Method": sale.paymentMethod,
      "Subtotal": sale.subtotal,
      "Discount": sale.discount,
      "Total": sale.total
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    XLSX.writeFile(workbook, `sales-report-${summary?.period}-${summary?.startDate}.xlsx`);
  }

  function handleExportPdf() {
    if (!sales.length) {
      setMessage("Nothing to export for this period.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Sales Report — ${summary?.label}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Total Revenue: ${formatNaira(summary?.totalRevenue || 0)}`, 14, 26);
    doc.text(`Total Transactions: ${summary?.totalTransactions || 0}`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [["Sale #", "Date", "Cashier", "Payment", "Total"]],
      body: sales.map((sale) => [
        sale.saleNumber,
        sale.date,
        sale.cashier,
        sale.paymentMethod,
        formatNaira(sale.total)
      ])
    });

    doc.save(`sales-report-${summary?.period}-${summary?.startDate}.pdf`);
  }

  async function handleEmailReport() {
    if (!emailAddress.trim()) {
      setMessage("Enter an email address first.");
      return;
    }

    setSendingEmail(true);
    setMessage("");
    try {
      const data = await apiFetch("/reports/sales/email", {
        method: "POST",
        body: { period, date, email: emailAddress.trim() }
      });
      setMessage(data.message || "Report sent.");
      setShowEmailField(false);
    } catch (error) {
      setMessage(error.message || "Could not send the report.");
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <section className="section-card">
      <div className="section-header product-table-header">
        <div>
          <h2>Sales Report</h2>
          <p>{summary ? summary.label : "Loading..."}</p>
        </div>

        <div className="front-desk-payment-options" role="group" aria-label="Report period">
          {periods.map((item) => (
            <button
              key={item.value}
              type="button"
              className={period === item.value ? "active" : ""}
              onClick={() => setPeriod(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <input
          type={period === "yearly" ? "number" : period === "monthly" ? "month" : "date"}
          value={period === "yearly" ? date.slice(0, 4) : period === "monthly" ? date.slice(0, 7) : date}
          onChange={(event) => {
            const value = event.target.value;
            if (period === "yearly") setDate(`${value}-01-01`);
            else if (period === "monthly") setDate(`${value}-01`);
            else setDate(value);
          }}
        />
      </div>

      <div className="cashier-panel">
        {message && <div className="front-desk-message">{message}</div>}

        {summary && (
          <div className="cashier-total-lines">
            <div><span>Total Revenue</span><strong>{formatNaira(summary.totalRevenue)}</strong></div>
            <div><span>Transactions</span><strong>{summary.totalTransactions}</strong></div>
            <div className="cashier-grand-total"><span>Average Sale</span><strong>{formatNaira(summary.averageSale)}</strong></div>
          </div>
        )}

        <div className="front-desk-payment-options" role="group" aria-label="Export options">
          <button type="button" onClick={loadReport} disabled={loading}>
            <RefreshCw /> Refresh
          </button>
          <button type="button" onClick={handleExportExcel}>
            <FileSpreadsheet /> Export Excel
          </button>
          <button type="button" onClick={handleExportPdf}>
            <FileText /> Export PDF
          </button>
          <button type="button" onClick={() => setShowEmailField((current) => !current)}>
            <Mail /> Email Report
          </button>
        </div>

        {showEmailField && (
          <div className="field-group" style={{ display: "flex", gap: "10px", alignItems: "end" }}>
            <label className="field-group" style={{ flex: 1 }}>
              <span>Send to</span>
              <input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="owner@business.com" />
            </label>
            <button className="btn-gold" type="button" disabled={sendingEmail} onClick={handleEmailReport}>
              {sendingEmail ? "Sending..." : "Send"}
            </button>
          </div>
        )}

        <DataTable
          columns={["Sale #", "Date", "Cashier", "Customer", "Payment", "Subtotal", "Discount", "Total"]}
          rows={sales}
          rowKey={(sale) => sale.id}
          emptyMessage={loading ? "Loading report..." : "No sales in this period."}
          renderRow={(sale) => (
            <>
              <td><span className="order-id">{sale.saleNumber}</span></td>
              <td>{sale.date}</td>
              <td>{sale.cashier}</td>
              <td>{sale.customer || "-"}</td>
              <td>{sale.paymentMethod}</td>
              <td>{formatNaira(sale.subtotal)}</td>
              <td>{formatNaira(sale.discount)}</td>
              <td className="gold-text">{formatNaira(sale.total)}</td>
            </>
          )}
        />
      </div>
    </section>
  );
}
