import { MessageSquareText } from "lucide-react";
import { customers } from "../data";
import CustomersManager from "./CustomersManager";

export default function CustomersPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><MessageSquareText /> Customers</h1>
          <p>Keep customer contact information and send customer messages from one place.</p>
        </div>
      </div>

      <CustomersManager initialCustomers={customers} />
    </>
  );
}
