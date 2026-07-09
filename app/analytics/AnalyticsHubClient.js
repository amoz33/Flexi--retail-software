"use client";

import { BarChart3, ChartPie, Hash, LineChart, Trophy } from "lucide-react";
import { useState } from "react";
import { MonthlyIncomeChart, ProductPerformanceChart } from "../components/Charts";
import { calcMonthlyIncome, formatNaira, products } from "../data";

function getMonthlySales(product) {
  if (Array.isArray(product.monthlySales) && product.monthlySales.length === 12) {
    return product.monthlySales;
  }

  const total = Math.max(0, Number(product.soldCount || 0));
  const base = Math.floor(total / 12);
  const remainder = total % 12;
  return Array.from({ length: 12 }, (_, index) => base + (index < remainder ? 1 : 0));
}

function formatUnits(value) {
  return value.toLocaleString();
}

export default function AnalyticsHubClient() {
  const [viewMode, setViewMode] = useState("graph");
  const { months, income } = calcMonthlyIncome();
  const total = income.reduce((sum, value) => sum + value, 0);
  const average = total / income.length;
  const bestIncome = Math.max(...income);
  const lowestIncome = Math.min(...income);
  const bestMonthIndex = income.indexOf(bestIncome);
  const lowestMonthIndex = income.indexOf(lowestIncome);
  const activeMonths = income.filter((value) => value > 0).length;
  const topProduct = [...products].sort((a, b) => b.soldCount - a.soldCount)[0];
  const rankedProducts = [...products]
    .map((product) => {
      const monthlySales = getMonthlySales(product);
      const bestSales = Math.max(...monthlySales);
      return {
        ...product,
        averageMonthlySales: product.soldCount / monthlySales.length,
        bestSales,
        bestSalesMonth: months[monthlySales.indexOf(bestSales)]
      };
    })
    .sort((a, b) => b.soldCount - a.soldCount);
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
            <div className="chart-box analytics-chart-box"><MonthlyIncomeChart /></div>
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
                    const note = value === bestIncome
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
            <div className="insight-text"><Trophy /> Income was active in {activeMonths} of 12 months, with {months[bestMonthIndex]} producing the strongest result.</div>
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2><BarChart3 /> Product Sales Leaderboard</h2>
        </div>
        {isGraphView ? (
          <div className="chart-container analytics-chart-container">
            <div className="chart-box analytics-chart-box"><ProductPerformanceChart /></div>
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
                      <td>{formatNaira(product.revenue)}</td>
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
        <div className="insight-text"><Trophy /> Top performer: {topProduct.name} | Compare every product across all 12 months.</div>
      </section>
    </>
  );
}
