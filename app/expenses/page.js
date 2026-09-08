import { Receipt } from "lucide-react";
import ExpensesManager from "./ExpensesManager";

export default function ExpensesPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Receipt /> Expenses Tracker</h1>
          <p>Log and review all expenses made by this store.</p>
        </div>
      </div>

      <ExpensesManager />
    </>
  );
}
