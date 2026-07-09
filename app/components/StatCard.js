export default function StatCard({ icon, label, value, trend, index, alert = false }) {
  return (
    <article className={`stat-card ${alert ? "stat-card-alert" : ""}`} style={{ "--i": index }}>
      <h3>{icon}{label}</h3>
      <div className="stat-value">{value}</div>
      <div className="stat-trend">{trend}</div>
    </article>
  );
}
