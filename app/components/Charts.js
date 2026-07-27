"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const productColors = ["#C9A020", "#2563eb", "#10b981", "#db2777", "#7c3aed", "#ea580c"];

export const chartMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthlyIncomeFromOrders(orders = []) {
  const income = new Array(12).fill(0);
  orders.forEach((order) => {
    if (order.status === "Delivered") {
      const monthIdx = Number(order.monthIdx);
      if (Number.isInteger(monthIdx) && monthIdx >= 0 && monthIdx < 12) {
        income[monthIdx] += Number(order.total || 0);
      }
    }
  });
  return { months: chartMonths, income };
}

export function getMonthlySales(product) {
  if (Array.isArray(product.monthlySales) && product.monthlySales.length === 12) {
    return product.monthlySales;
  }

  const total = Math.max(0, Number(product.soldCount || 0));
  const base = Math.floor(total / 12);
  const remainder = total % 12;
  return Array.from({ length: 12 }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function MonthlyIncomeChart({ months = chartMonths, income = new Array(12).fill(0) }) {
  const average = income.reduce((sum, value) => sum + value, 0) / income.length;
  const best = Math.max(...income);
  const colors = income.map((value) => {
    if (value === best && best > 0) return "#C9A020";
    if (value >= average && value > 0) return "#10b981";
    return "#ef4444";
  });

  return (
    <Bar
      data={{
        labels: months,
        datasets: [{
          label: "Income (₦)",
          data: income,
          backgroundColor: colors,
          borderRadius: 12
        }]
      }}
      options={{
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 1000, easing: "easeOutBounce" },
        plugins: { legend: { display: false } }
      }}
    />
  );
}

export function ProductPerformanceChart({ products = [] }) {
  const sorted = [...products].sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0)).slice(0, 6);

  return (
    <Line
      data={{
        labels: chartMonths,
        datasets: sorted.map((product, index) => ({
          label: product.name,
          data: getMonthlySales(product),
          borderColor: productColors[index % productColors.length],
          backgroundColor: productColors[index % productColors.length],
          borderWidth: 1.5,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.25,
          fill: false
        }))
      }}
      options={{
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 800, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Units Sold" },
            ticks: { precision: 0 }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 8, padding: 16 }
          }
        }
      }}
    />
  );
}
