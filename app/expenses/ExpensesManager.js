"use client";

import { FileImage, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";
import { apiFetch } from "../lib/api";

const expenseCategories = [
  "Rent", "Utilities", "Salaries", "Supplies", "Maintenance",
  "Transport", "Marketing", "Equipment", "Miscellaneous"
];

const emptyExpense = {
  category: expenseCategories[0],
  description: "",
  amount: "",
  paymentMethod: "",
  receiptSnapshot: "",
  date: ""
};

function expenseMatchesQuery(expense, query) {
  if (!query) return true;
  const searchableText = [
    expense.id, expense.category, expense.description,
    expense.amount, expense.paymentMethod, expense.loggedBy, expense.date
  ].filter(Boolean).join(" ").toLowerCase();
  return searchableText.includes(query.toLowerCase());
}

export default function ExpensesManager() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [formExpense, setFormExpense] = useState(emptyExpense);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadExpenses() {
      try {
        const data = await apiFetch("/expenses");
        if (!cancelled) setExpenses(data.expenses || []);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load expenses.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExpenses();
    return () => { cancelled = true; };
  }, []);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = categoryFilter === "All" || expense.category === categoryFilter;
    return matchesCategory && expenseMatchesQuery(expense, query.trim());
  });

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [filteredExpenses]
  );

  function updateField(field, value) {
    setFormExpense((current) => ({ ...current, [field]: value }));
  }

  async function handleReceiptUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      updateField("receiptSnapshot", "");
      return;
    }

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const data = await apiFetch("/expenses/upload-receipt", { method: "POST", body: formData });
      updateField("receiptSnapshot", data.url);
    } catch (error) {
      setMessage(error.message || "Could not upload receipt.");
      updateField("receiptSnapshot", "");
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function addExpense(event) {
    event.preventDefault();

    if (!formExpense.description.trim() || !Number(formExpense.amount)) {
      setMessage("Description and a valid amount are required.");
      return;
    }

    setSaving(true);
    try {
      const data = await apiFetch("/expenses", {
        method: "POST",
        body: {
          category: formExpense.category,
          description: formExpense.description.trim(),
          amount: Number(formExpense.amount),
          paymentMethod: formExpense.paymentMethod.trim() || null,
          receiptSnapshot: formExpense.receiptSnapshot || null,
          date: formExpense.date || null
        }
      });

      setExpenses((current) => [data.expense, ...current]);
      setFormExpense(emptyExpense);
      setShowForm(false);
      setMessage(`Expense ${data.expense.id} logged.`);
    } catch (error) {
      setMessage(error.message || "Could not log expense.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(expense) {
    if (!window.confirm(`Delete expense "${expense.description}"? This cannot be undone.`)) return;

    try {
      await apiFetch(`/expenses/${expense.databaseId}`, { method: "DELETE" });
      setExpenses((current) => current.filter((item) => item.databaseId !== expense.databaseId));
      setMessage("Expense deleted.");
    } catch (error) {
      setMessage(error.message || "Could not delete expense.");
    }
  }

  const categories = ["All", ...expenseCategories];

  return (
    <>
      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Expenses</h2>
            <p>{filteredExpenses.length} expense{filteredExpenses.length === 1 ? "" : "s"} · Total {formatNaira(totalAmount)}</p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <label className="field-group" style={{ minWidth: "160px" }}>
              <span>Category</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>

            <label className="product-search">
              <Search />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search description, category..."
                aria-label="Search expenses"
              />
            </label>

            <button className="btn-gold" type="button" onClick={() => setShowForm(true)}>
              <Plus /> Log Expense
            </button>
          </div>
        </div>

        {message && <div className="front-desk-message">{message}</div>}

        <DataTable
          columns={["Expense", "Category", "Description", "Amount", "Payment Method", "Receipt", "Logged By", "Date", "Actions"]}
          rows={filteredExpenses}
          rowKey={(expense) => expense.id}
          emptyMessage={loading ? "Loading expenses..." : "No expenses logged yet."}
          tableClassName="product-data-table"
          renderRow={(expense) => (
            <>
              <td><span className="order-id">{expense.id}</span></td>
              <td>{expense.category}</td>
              <td className="description-cell">{expense.description}</td>
              <td className="gold-text">{formatNaira(Number(expense.amount || 0))}</td>
              <td>{expense.paymentMethod || "-"}</td>
              <td>
                {expense.receiptSnapshot ? (
                  <a className="customer-name receipt-view-link" href={expense.receiptSnapshot} target="_blank" rel="noopener noreferrer">
                    <Upload /> View Receipt
                  </a>
                ) : "-"}
              </td>
              <td>{expense.loggedBy || "-"}</td>
              <td>{expense.date || "-"}</td>
              <td>
                <button className="icon-button" type="button" onClick={() => deleteExpense(expense)} aria-label={`Delete ${expense.description}`}>
                  <Trash2 />
                </button>
              </td>
            </>
          )}
        />
      </section>

      {showForm && (
        <div className="product-edit-overlay" role="dialog" aria-modal="true" aria-label="Log Expense">
          <div className="product-edit-modal section-card">
            <div className="section-header">
              <h2>Log Expense</h2>
              <button className="icon-button" type="button" onClick={() => setShowForm(false)} aria-label="Close form">
                <X />
              </button>
            </div>

            <form className="product-edit-form" onSubmit={addExpense}>
              <label className="field-group">
                <span>Category</span>
                <select value={formExpense.category} onChange={(event) => updateField("category", event.target.value)}>
                  {expenseCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>

              <label className="field-group">
                <span>Amount (₦)</span>
                <input type="number" min="0" step="0.01" value={formExpense.amount} onChange={(event) => updateField("amount", event.target.value)} required />
              </label>

              <label className="field-group" style={{ gridColumn: "1 / -1" }}>
                <span>Description</span>
                <textarea rows={3} value={formExpense.description} onChange={(event) => updateField("description", event.target.value)} required />
              </label>

              <label className="field-group">
                <span>Payment Method</span>
                <input type="text" value={formExpense.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value)} placeholder="Cash, Bank Transfer..." />
              </label>

              <label className="field-group">
                <span>Date</span>
                <input type="date" value={formExpense.date} onChange={(event) => updateField("date", event.target.value)} />
              </label>

              <label className="receipt-upload" style={{ gridColumn: "1 / -1" }}>
                <FileImage />
                <span>Receipt</span>
                <strong>
                  {uploadingReceipt ? "Uploading..." : formExpense.receiptSnapshot ? "Receipt attached" : "Upload receipt image"}
                </strong>
                <input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} disabled={uploadingReceipt} />
              </label>

              <div className="product-edit-actions">
                <button className="btn-outline" type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                <button className="btn-gold" type="submit" disabled={saving || uploadingReceipt}>
                  <Save /> {saving ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
