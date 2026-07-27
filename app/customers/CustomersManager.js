"use client";

import { Mail, MapPin, MessageSquareText, Phone, Search, Send, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";
import { apiFetch } from "../lib/api";

function customerMatchesQuery(customer, query) {
  if (!query) return true;

  const searchableText = [
    customer.name,
    customer.phone,
    customer.email,
    customer.address,
    customer.segment,
    customer.lastPurchase,
    customer.totalSpent,
    customer.status
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

export default function CustomersManager() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState("All");
  const [messageChannel, setMessageChannel] = useState("SMS");
  const [messageBody, setMessageBody] = useState("");
  const [sentMessages, setSentMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const filteredCustomers = customers.filter((customer) => customerMatchesQuery(customer, query.trim()));

  const selectedRecipients = useMemo(() => {
    if (selectedCustomerId === "All") return customers;
    return customers.filter((customer) => String(customer.id) === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        const data = await apiFetch("/customers");
        if (!cancelled) setCustomers(data.customers || []);
      } catch (error) {
        if (!cancelled) setNotice(error.message || "Could not load customers.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCustomers();
    return () => { cancelled = true; };
  }, []);

  function sendCustomerMessage(event) {
    event.preventDefault();
    const message = messageBody.trim();
    if (!message || !selectedRecipients.length) return;

    const sentMessage = {
      id: Date.now(),
      recipients: selectedCustomerId === "All" ? "All Customers" : selectedRecipients[0].name,
      recipientCount: selectedRecipients.length,
      channel: messageChannel,
      body: message,
      sentAt: new Date().toLocaleString()
    };

    setSentMessages((messages) => [sentMessage, ...messages]);
    setMessageBody("");
    setNotice(`Message queued for ${sentMessage.recipients}.`);
  }

  return (
    <>
      <section className="section-card product-create-section">
        <div className="section-header product-create-header">
          <h2><MessageSquareText /> Customer Messages</h2>
        </div>

        <form className="product-form" onSubmit={sendCustomerMessage}>
          {notice && <div className="form-message">{notice}</div>}

          <div className="form-grid customer-message-grid">
            <label className="field-group">
              <span>Recipient</span>
              <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                <option value="All">All Customers</option>
                {customers.map((customer) => (
                  <option value={customer.id} key={customer.id}>{customer.name}</option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span>Channel</span>
              <select value={messageChannel} onChange={(event) => setMessageChannel(event.target.value)}>
                <option>SMS</option>
                <option>Email</option>
                <option>WhatsApp</option>
              </select>
            </label>

            <label className="field-group field-span-2">
              <span>Message</span>
              <textarea
                rows="5"
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="Write a promo, pickup reminder, receipt follow-up, or loyalty message."
                required
              />
            </label>
          </div>

          <div className="message-recipient-summary">
            <Send /> {selectedRecipients.length} recipient{selectedRecipients.length === 1 ? "" : "s"} selected
          </div>

          <div className="form-actions">
            <button className="btn-outline" type="button" onClick={() => setMessageBody("")}>Clear Message</button>
            <button className="btn-gold" type="submit"><Send /> Send Message</button>
          </div>
        </form>

        {sentMessages.length > 0 && (
          <div className="message-history">
            {sentMessages.map((message) => (
              <div className="message-history-item" key={message.id}>
                <div>
                  <strong>{message.channel} to {message.recipients}</strong>
                  <span>{message.recipientCount} recipient{message.recipientCount === 1 ? "" : "s"} • {message.sentAt}</span>
                </div>
                <p>{message.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Customer Table</h2>
            <p>{loading ? "Loading customers..." : `${filteredCustomers.length} of ${customers.length} customer${customers.length === 1 ? "" : "s"}`}</p>
          </div>

          <label className="product-search">
            <Search />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customer, phone, email..."
              aria-label="Search customers"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear customer search">
                <X />
              </button>
            )}
          </label>
        </div>

        <DataTable
          columns={["Name", "Phone", "Email", "Address", "Segment", "Last Purchase", "Total Spent", "Status"]}
          rows={filteredCustomers}
          rowKey={(customer) => customer.id}
          emptyMessage={loading ? "Loading customers..." : "No customers match your search."}
          tableClassName="product-data-table"
          renderRow={(customer) => (
            <>
              <td><span className="customer-name"><UserRound /> {customer.name}</span></td>
              <td><span className="customer-name"><Phone /> {customer.phone}</span></td>
              <td>{customer.email ? <span className="customer-name"><Mail /> {customer.email}</span> : "-"}</td>
              <td className="description-cell">{customer.address ? <span className="customer-name"><MapPin /> {customer.address}</span> : "-"}</td>
              <td><span className="status-badge status-shipped">{customer.segment}</span></td>
              <td>{customer.lastPurchase || "-"}</td>
              <td className="gold-text">{formatNaira(customer.totalSpent || 0)}</td>
              <td><span className={`status-badge ${customer.status === "Active" ? "status-active" : "status-inactive"}`}>{customer.status}</span></td>
            </>
          )}
        />
      </section>
    </>
  );
}
