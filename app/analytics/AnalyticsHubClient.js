"use client";

import { BarChart3, ChartPie, Hash, LineChart, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { MonthlyIncomeChart, ProductPerformanceChart, chartMonths, getMonthlySales, monthlyIncomeFromOrders } from "../components/Charts";
import { formatNaira } from "../data";
import { apiFetch } from "../lib/api";

function formatUnits(value) {
  return Number(value || 0).toLocaleString();
}

export default function AnalyticsHubClient() {
  const [viewMode, setViewMode] = useState("graph");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [productData, orderData] = await Promise.all([
          apiFetch("/products"),
          apiFetch("/orders")
        ]);
        if (cancelled) return;
        setProducts(productData.products || []);
        setOrders(orderData.orders || []);
      } catch {
        /* empty analytics until data loads */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const { months, income } = monthlyIncomeFromOrders(orders);
  const total = income.reduce((sum, value) => sum + value, 0);
  const average = income.length ? total / income.length : 0;
  const bestIncome = Math.max(...income);
  const lowestIncome = Math.min(...income);
  const bestMonthIndex = income.indexOf(bestIncome);
  const lowestMonthIndex = income.indexOf(lowestIncome);
  const activeMonths = income.filter((value) => value > 0).length;
  const topProduct = [...products].sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0))[0] || null;
  const rankedProducts = [...products]
    .map((product) => {
      const monthlySales = getMonthlySales(product);
      const bestSales = Math.max(...monthlySales);
      return {
        ...product,
        averageMonthlySales: Number(product.soldCount || 0) / monthlySales.length,
        bestSales,
        bestSalesMonth: chartMonths[monthlySales.indexOf(bestSales)]
      };
    })
    .sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0));
  const isGraphView = viewMode === "graph";

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><ChartPie /> Analytics Hub</h1>
        </div>
        <div className="analytics-top-actions">
          <div className="analytics-view-toggle" role="group" aria-label="Analytics view">
            <button
              className={isGraphView ? "active" : ""}
              type="button"
              onClick={() => setViewMode("graph")}
              aria-pressed={isGraphView}
            >
              <LineChart /> Graph
            </button>
            <button
              className={!isGraphView ? "active" : ""}
              type="button"
              onClick={() => setViewMode("numbers")}
              aria-pressed={!isGraphView}
            >
              <Hash /> Numbers
            </button>
          </div>
          <div className="role-badge">Total: {formatNaira(total)}</div>
        </div>
      </div>

      <section className="section-card">
        <div className="section-header">
          <h2><BarChart3 /> Monthly Income Flow</h2>
        </div>
        {isGraphView ? (
          <div className="chart-container analytics-chart-container">
            <div className="chart-box analytics-chart-box"><MonthlyIncomeChart months={months} income={income} /></div>
          </div>
        ) : (
          <div className="analytics-number-view">
            <div className="analytics-summary-grid">
              <div className="analytics-number-card">
                <span>Total income</span>
                <strong>{formatNaira(total)}</strong>
              </div>
              <div className="analytics-number-card">
                <span>Average per month</span>
                <strong>{formatNaira(Math.round(average))}</strong>
              </div>
              <div className="analytics-number-card">
                <span>Best month</span>
                <strong>{months[bestMonthIndex]} - {formatNaira(bestIncome)}</strong>
              </div>
              <div className="analytics-number-card">
                <span>Lowest month</span>
                <strong>{months[lowestMonthIndex]} - {formatNaira(lowestIncome)}</strong>
              </div>
            </div>
            <div className="analytics-table-wrap">
              <table className="analytics-number-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Income</th>
                    <th>Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month, index) => {
                    const value = income[index];
                    const note = value === bestIncome && value > 0
                      ? "Highest income month"
                      : value === 0
                        ? "No delivered income recorded"
                        : value >= average
                          ? "Above monthly average"
                          : "Below monthly average";

                    return (
                      <tr key={month}>
                        <td>{month}</td>
                        <td>{formatNaira(value)}</td>
                        <td>{note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="insight-text"><Trophy /> Income was active in {activeMonths} of 12 months{bestIncome > 0 ? `, with ${months[bestMonthIndex]} producing the strongest result.` : "."}</div>
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2><BarChart3 /> Product Sales Leaderboard</h2>
        </div>
        {isGraphView ? (
          <div className="chart-container analytics-chart-container">
            <div className="chart-box analytics-chart-box"><ProductPerformanceChart products={products} /></div>
          </div>
        ) : (
          <div className="analytics-number-view">
            <div className="analytics-table-wrap">
              <table className="analytics-number-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product</th>
                    <th>Units sold</th>
                    <th>Revenue</th>
                    <th>Avg/month</th>
                    <th>Best month</th>
                    <th>Stock left</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedProducts.map((product, index) => (
                    <tr key={product.id}>
                      <td>#{index + 1}</td>
                      <td>{product.name}</td>
                      <td>{formatUnits(product.soldCount)}</td>
                      <td>{formatNaira(product.revenue || 0)}</td>
                      <td>{product.averageMonthlySales.toFixed(1)}</td>
                      <td>{product.bestSalesMonth} ({formatUnits(product.bestSales)} units)</td>
                      <td>{formatUnits(product.stock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="insight-text"><Trophy /> {loading ? "Loading product analytics..." : topProduct ? `Top performer: ${topProduct.name} | Compare every product across all 12 months.` : "Product analytics will appear as sales are recorded."}</div>
      </section>
    </>
  );
}
