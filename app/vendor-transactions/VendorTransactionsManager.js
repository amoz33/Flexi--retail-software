"use client";

import { Banknote, Boxes, CalendarDays, FileImage, PenLine, Plus, Save, Search, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";
import { apiFetch } from "../lib/api";

const emptyTransaction = {
  vendorId: "",
  productName: "",
  sku: "",
  quantity: "",
  unitCost: "",
  paymentAmount: "",
  paymentStatus: "Unpaid",
  paymentMethod: "",
  receiptSnapshot: "",
  vendorSignature: "",
  date: ""
};

function transactionMatchesQuery(transaction, query) {
  if (!query) return true;

  const searchableText = [
    transaction.id,
    transaction.vendorName,
    transaction.productName,
    transaction.sku,
    transaction.quantity,
    transaction.paymentAmount,
    transaction.paymentStatus,
    transaction.paymentMethod,
    transaction.receiptSnapshot,
    transaction.vendorSignature,
    transaction.date
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

function getPaymentStatusClass(status) {
  if (status === "Paid") return "status-delivered";
  if (status === "Part Paid") return "status-shipped";
  return "status-pending";
}

export default function VendorTransactionsManager() {
  const [transactions, setTransactions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formTransaction, setFormTransaction] = useState(emptyTransaction);
  const [query, setQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("All");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [transactionData, vendorData] = await Promise.all([
          apiFetch("/vendor-transactions"),
          apiFetch("/vendors")
        ]);
        if (cancelled) return;
        setTransactions(transactionData.transactions || []);
        setVendors(vendorData.vendors || []);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load vendor transactions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesVendor = selectedVendor === "All" || String(transaction.vendorId) === selectedVendor;
    return matchesVendor && transactionMatchesQuery(transaction, query.trim());
  });

  const summary = useMemo(() => {
    return filteredTransactions.reduce((totals, transaction) => {
      const totalCost = transaction.quantity * transaction.unitCost;
      return {
        products: totals.products + transaction.quantity,
        purchaseValue: totals.purchaseValue + totalCost,
        paid: totals.paid + transaction.paymentAmount,
        balance: totals.balance + Math.max(totalCost - transaction.paymentAmount, 0)
      };
    }, { products: 0, purchaseValue: 0, paid: 0, balance: 0 });
  }, [filteredTransactions]);

  function updateTransactionField(field, value) {
    setFormTransaction((transaction) => ({ ...transaction, [field]: value }));
  }

  function selectPaymentStatus(status) {
    const quantity = Number(formTransaction.quantity || 0);
    const unitCost = Number(formTransaction.unitCost || 0);
    const totalCost = quantity * unitCost;

    setFormTransaction((transaction) => ({
      ...transaction,
      paymentStatus: status,
      paymentAmount: status === "Paid" ? String(totalCost) : status === "Unpaid" ? "0" : transaction.paymentAmount
    }));
  }

  async function handleReceiptUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      updateTransactionField("receiptSnapshot", "");
      return;
    }

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const data = await apiFetch("/vendor-transactions/upload-receipt", {
        method: "POST",
        body: formData
      });
      updateTransactionField("receiptSnapshot", data.url);
    } catch (error) {
      setMessage(error.message || "Could not upload receipt.");
      updateTransactionField("receiptSnapshot", "");
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function addTransaction(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);

    try {
      const data = await apiFetch("/vendor-transactions", {
        method: "POST",
        body: {
          vendorId: Number(formTransaction.vendorId),
          productName: formTransaction.productName.trim(),
          sku: formTransaction.sku.trim() || null,
          quantity: Number(formTransaction.quantity || 0),
          unitCost: Number(formTransaction.unitCost || 0),
          paymentAmount: Number(formTransaction.paymentAmount || 0),
          paymentStatus: formTransaction.paymentStatus,
          paymentMethod: formTransaction.paymentMethod.trim() || null,
          receiptSnapshot: formTransaction.receiptSnapshot || null,
          vendorSignature: formTransaction.vendorSignature.trim() || null,
          date: formTransaction.date || null
        }
      });

      setTransactions((currentTransactions) => [data.transaction, ...currentTransactions]);
      setFormTransaction(emptyTransaction);
      setMessage(`${data.transaction.id} has been added for ${data.transaction.vendorName}.`);
      form.reset();
    } catch (error) {
      setMessage(error.message || "Transaction could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function updatePaymentStatus(transaction, status) {
    if (!transaction.databaseId) return;

    try {
      const data = await apiFetch(`/vendor-transactions/${transaction.databaseId}/status`, {
        method: "PATCH",
        body: { paymentStatus: status }
      });
      setTransactions((currentTransactions) => currentTransactions.map((item) => (
        item.databaseId === data.transaction.databaseId ? data.transaction : item
      )));
    } catch (error) {
      setMessage(error.message || "Payment status could not be updated.");
    }
  }

  return (
    <>
      <section className="section-card product-create-section">
        <div className="section-header product-create-header">
          <h2><Plus /> Add Vendor Transaction</h2>
        </div>

        <form className="product-form" onSubmit={addTransaction}>
          {message && <div className="form-message">{message}</div>}

          <div className="form-grid vendor-transaction-form-grid">
            <label className="field-group">
              <span>Vendor</span>
              <select
                value={formTransaction.vendorId}
                onChange={(event) => updateTransactionField("vendorId", event.target.value)}
                required
              >
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option value={vendor.id} key={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span>Product</span>
              <input
                type="text"
                value={formTransaction.productName}
                onChange={(event) => updateTransactionField("productName", event.target.value)}
                placeholder="iPhone 14 Pro"
                required
              />
            </label>

            <label className="field-group">
              <span>SKU</span>
              <input
                type="text"
                value={formTransaction.sku}
                onChange={(event) => updateTransactionField("sku", event.target.value)}
                placeholder="APL-14PRO"
                required
              />
            </label>

            <label className="field-group">
              <span>Quantity</span>
              <input
                type="number"
                min="1"
                value={formTransaction.quantity}
                onChange={(event) => updateTransactionField("quantity", event.target.value)}
                placeholder="8"
                required
              />
            </label>

            <label className="field-group">
              <span>Unit Cost</span>
              <input
                type="number"
                min="0"
                value={formTransaction.unitCost}
                onChange={(event) => updateTransactionField("unitCost", event.target.value)}
                placeholder="710000"
                required
              />
            </label>

            <label className="field-group">
              <span>Payment Amount</span>
              <input
                type="number"
                min="0"
                value={formTransaction.paymentAmount}
                onChange={(event) => updateTransactionField("paymentAmount", event.target.value)}
                placeholder="0"
              />
            </label>

            <div className="field-group">
              <span>Payment Status</span>
              <div className="payment-status-buttons" role="group" aria-label="Payment status">
                {["Paid", "Part Paid", "Unpaid"].map((status) => (
                  <button
                    className={`payment-status-button ${formTransaction.paymentStatus === status ? "active" : ""}`}
                    type="button"
                    key={status}
                    onClick={() => selectPaymentStatus(status)}
                  >
                    {status === "Unpaid" ? "Not Paid" : status}
                  </button>
                ))}
              </div>
            </div>

            <label className="field-group">
              <span>Payment Method</span>
              <input
                type="text"
                value={formTransaction.paymentMethod}
                onChange={(event) => updateTransactionField("paymentMethod", event.target.value)}
                placeholder="Bank Transfer"
              />
            </label>

            <label className="field-group">
              <span>Date</span>
              <input
                type="date"
                value={formTransaction.date}
                onChange={(event) => updateTransactionField("date", event.target.value)}
              />
            </label>

            <label className="receipt-upload">
              <FileImage />
              <span>Receipt Snapshot</span>
              <strong>
                {uploadingReceipt
                  ? "Uploading..."
                  : formTransaction.receiptSnapshot
                    ? "Receipt attached"
                    : "Upload receipt image"}
              </strong>
              <input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} disabled={uploadingReceipt} />
            </label>

            <label className="field-group field-span-2">
              <span>Vendor Signature</span>
              <input
                type="text"
                value={formTransaction.vendorSignature}
                onChange={(event) => updateTransactionField("vendorSignature", event.target.value)}
                placeholder="Vendor name or signature reference"
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="btn-outline" type="button" onClick={() => {
              setFormTransaction(emptyTransaction);
              setMessage("");
            }}>Clear</button>
            <button className="btn-gold" type="submit" disabled={saving}><Save /> {saving ? "Saving..." : "Save Transaction"}</button>
          </div>
        </form>
      </section>

      <div className="cards-grid vendor-summary-grid">
        <div className="stat-card" style={{ "--i": 0 }}>
          <h3><Boxes /> Products Received</h3>
          <div className="stat-value">{summary.products}</div>
          <div className="stat-trend">Across selected transactions</div>
        </div>

        <div className="stat-card" style={{ "--i": 1 }}>
          <h3><Banknote /> Purchase Value</h3>
          <div className="stat-value">{formatNaira(summary.purchaseValue)}</div>
          <div className="stat-trend">Total vendor cost</div>
        </div>

        <div className="stat-card" style={{ "--i": 2 }}>
          <h3><Banknote /> Paid</h3>
          <div className="stat-value">{formatNaira(summary.paid)}</div>
          <div className="stat-trend">Payments completed</div>
        </div>

        <div className="stat-card" style={{ "--i": 3 }}>
          <h3><Banknote /> Balance</h3>
          <div className="stat-value">{formatNaira(summary.balance)}</div>
          <div className="stat-trend">Outstanding amount</div>
        </div>
      </div>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Transaction Table</h2>
            <p>{loading ? "Loading transactions..." : `${filteredTransactions.length} of ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`}</p>
          </div>

          <div className="vendor-transaction-controls">
            <label className="field-group vendor-filter">
              <span>Vendor</span>
              <select value={selectedVendor} onChange={(event) => setSelectedVendor(event.target.value)}>
                <option value="All">All Vendors</option>
                {vendors.map((vendor) => (
                  <option value={vendor.id} key={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </label>

            <label className="product-search">
              <Search />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search product, payment, vendor..."
                aria-label="Search vendor transactions"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear transaction search">
                  <X />
                </button>
              )}
            </label>
          </div>
        </div>

        <DataTable
          columns={["Transaction", "Vendor", "Product", "SKU", "Qty", "Unit Cost", "Total Cost", "Payment", "Status", "Method", "Receipt", "Signature", "Date", "Actions"]}
          rows={filteredTransactions}
          rowKey={(transaction) => transaction.id}
          emptyMessage={loading ? "Loading transactions..." : "No vendor transactions match your filters."}
          tableClassName="product-data-table"
          renderRow={(transaction) => {
            const totalCost = transaction.quantity * transaction.unitCost;

            return (
              <>
                <td><span className="order-id">{transaction.id}</span></td>
                <td><strong>{transaction.vendorName}</strong></td>
                <td>{transaction.productName}</td>
                <td><span className="order-id">{transaction.sku}</span></td>
                <td>{transaction.quantity}</td>
                <td className="gold-text">{formatNaira(transaction.unitCost)}</td>
                <td className="gold-text">{formatNaira(totalCost)}</td>
                <td className="gold-text">{formatNaira(transaction.paymentAmount)}</td>
                <td><span className={`status-badge ${getPaymentStatusClass(transaction.paymentStatus)}`}>{transaction.paymentStatus}</span></td>
                <td>{transaction.paymentMethod}</td>
                <td>
                  {transaction.receiptSnapshot ? (
                    <a
                      className="customer-name receipt-view-link"
                      href={transaction.receiptSnapshot}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Upload /> View Receipt
                    </a>
                  ) : "-"}
                </td>
                <td>{transaction.vendorSignature ? <span className="customer-name"><PenLine /> {transaction.vendorSignature}</span> : "-"}</td>
                <td><span className="date-cell"><CalendarDays /> {transaction.date}</span></td>
                <td>
                  <div className="transaction-action-buttons">
                    <button type="button" onClick={() => updatePaymentStatus(transaction, "Paid")}>Paid</button>
                    <button type="button" onClick={() => updatePaymentStatus(transaction, "Unpaid")}>Not Paid</button>
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
