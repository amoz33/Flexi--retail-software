import { CreditCard } from "lucide-react";
import PaymentSettingsManager from "./PaymentSettingsManager";

export default function PaymentSettingsPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><CreditCard /> Payment Settings</h1>
          <p>Connect your own payment gateway accounts for this business.</p>
        </div>
      </div>

      <PaymentSettingsManager />
    </>
  );
}
