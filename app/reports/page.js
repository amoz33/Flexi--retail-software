import { FileBarChart } from "lucide-react";
import ReportsManager from "./ReportsManager";

export default function ReportsPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><FileBarChart /> Reports</h1>
          <p>Daily, monthly, and yearly sales — export to Excel, PDF, or email it directly.</p>
        </div>
      </div>

      <ReportsManager />
    </>
  );
}
