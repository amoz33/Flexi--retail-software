"use client";

import { CalendarDays, CheckCircle2, Clock, Truck, UserCircle } from "lucide-react";
import DataTable from "./DataTable";
import { formatNaira, getStatusClass } from "../data";

function statusIcon(status) {
  if (status === "Delivered") return <CheckCircle2 />;
  if (status === "Shipped") return <Truck />;
  if (status === "Packed") return <Truck />;
  return <Clock />;
}

export default function RecentOrdersTable({ orders, onUpdateStatus }) {
  const showOrderControls = Boolean(onUpdateStatus);
  const canAdvance = (order) => order.databaseId && ["Pending", "Packed"].includes(order.status);
  const nextStatus = (status) => status === "Pending" ? "Packed" : "Shipped";

  return (
    <DataTable
      columns={showOrderControls
        ? ["Order ID", "Customer", "Price", "Status", "Progress", "Date", "Feedback", "Action"]
        : ["Order ID", "Customer", "Price", "Status", "Progress", "Date"]}
      rows={orders}
      rowKey={(order) => order.id}
      emptyMessage="No orders to show."
      renderRow={(order) => (
        <>
          <td><span className="order-id">{order.id}</span></td>
          <td><span className="customer-name"><UserCircle />{order.customer}</span></td>
          <td><span className="amount-value">{formatNaira(order.total)}</span></td>
          <td>
            <span className={`status-badge ${getStatusClass(order.status)}`}>
              {statusIcon(order.status)}
              {order.status}
            </span>
          </td>
          <td>
            <div className="progress-wrapper">
              <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${order.progress}%` }} /></div>
              <span className="progress-text">{order.progress}%</span>
            </div>
          </td>
          <td><span className="date-cell"><CalendarDays />{order.date}</span></td>
          {showOrderControls && (
            <>
              <td className="description-cell">{order.deliveryComment || "-"}</td>
              <td>
                {canAdvance(order) ? (
                  <button className="btn-outline product-row-button" type="button" onClick={() => onUpdateStatus(order, nextStatus(order.status))}>
                    Mark {nextStatus(order.status)}
                  </button>
                ) : (
                  <span className="status-badge status-active">{order.status === "Delivered" ? "Confirmed" : "No action"}</span>
                )}
              </td>
            </>
          )}
        </>
      )}
    />
  );
}
