import { Users } from "lucide-react";
import CustomersManager from "./CustomersManager";

export default function CustomersPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Users /> Customers</h1>
          <p>View customer records, segments, and purchase activity.</p>
        </div>
      </div>

      <CustomersManager />
    </>
  );
}
