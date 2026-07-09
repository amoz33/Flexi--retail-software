export const products = [
  { id: 1, name: "iPhone 14 Pro", sku: "APL-14PRO", costPrice: 710000, price: 850000, stock: 12, soldCount: 24, monthlySales: [1, 2, 1, 2, 2, 2, 3, 2, 2, 3, 2, 2], category: "Electronics", revenue: 20400000, expiryDate: "" },
  { id: 2, name: "Samsung Galaxy S23", sku: "SSG-S23", costPrice: 615000, price: 720000, stock: 8, soldCount: 31, monthlySales: [2, 2, 3, 2, 3, 3, 2, 3, 3, 3, 2, 3], category: "Electronics", revenue: 22320000, expiryDate: "" },
  { id: 3, name: "Premium Rice 5kg", sku: "GRC-RICE5", costPrice: 6200, price: 8500, stock: 45, soldCount: 112, monthlySales: [8, 9, 8, 10, 9, 10, 8, 9, 10, 11, 10, 10], category: "Groceries", revenue: 952000, expiryDate: "2026-12-31" },
  { id: 4, name: "Designer Handbag", sku: "FASH-BAG01", costPrice: 84000, price: 125000, stock: 6, soldCount: 18, monthlySales: [1, 1, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2], category: "Fashion", revenue: 2250000, expiryDate: "" },
  { id: 5, name: "AirPods Pro", sku: "APL-AIRPOD", costPrice: 146000, price: 195000, stock: 15, soldCount: 42, monthlySales: [3, 3, 4, 3, 4, 3, 4, 4, 3, 4, 3, 4], category: "Electronics", revenue: 8190000, expiryDate: "" }
];

export const equipmentInventory = [
  { id: 1, name: "Main Floor AC", category: "Air Conditioner", location: "Sales Floor", quantity: 2, status: "Working", note: "Serviced in June 2026." },
  { id: 2, name: "Ceiling Fan Set", category: "Fan", location: "Stock Room", quantity: 4, status: "Working", note: "Keep on low during receiving." },
  { id: 3, name: "Barcode Scanner", category: "POS Equipment", location: "Front Desk", quantity: 3, status: "Faulty", note: "One scanner disconnects during checkout." },
  { id: 4, name: "Receipt Printer", category: "Printer", location: "Front Desk", quantity: 1, status: "Working", note: "Thermal rolls restocked." }
];

export const staff = [
  { id: 1, name: "Amara Okafor", role: "Manager", sales: 2840000, orders: 124, icon: "Crown" },
  { id: 2, name: "Chidi Eze", role: "Cashier", sales: 1820000, orders: 98, icon: "Star" },
  { id: 3, name: "Folake Adeyemi", role: "Senior Cashier", sales: 3120000, orders: 156, icon: "Flame" }
];

export const customers = [
  {
    id: 1,
    name: "Sarah Adeleke",
    phone: "+234 802 110 4421",
    email: "sarah.adeleke@example.com",
    address: "12 Allen Avenue, Ikeja",
    segment: "VIP",
    lastPurchase: "Samsung Galaxy S23",
    totalSpent: 1335000,
    status: "Active"
  },
  {
    id: 2,
    name: "Michael Bello",
    phone: "+234 701 662 9088",
    email: "michael.bello@example.com",
    address: "8 Stadium Road, Port Harcourt",
    segment: "Regular",
    lastPurchase: "iPhone 14 Pro",
    totalSpent: 720000,
    status: "Active"
  },
  {
    id: 3,
    name: "Ngozi Okonkwo",
    phone: "+234 809 775 2100",
    email: "ngozi.okonkwo@example.com",
    address: "31 Awolowo Road, Ikoyi",
    segment: "Wholesale",
    lastPurchase: "Premium Rice 5kg",
    totalSpent: 975000,
    status: "Inactive"
  }
];

export const vendors = [
  {
    id: 1,
    name: "Prime Mobile Distributors",
    contactName: "Ifeoma Obi",
    phone: "+234 803 555 0112",
    email: "orders@primemobile.ng",
    accountNumber: "0123456789",
    address: "18 Marina Road, Lagos",
    status: "Active",
    notes: "Phones, tablets, and accessories"
  },
  {
    id: 2,
    name: "Green Basket Foods",
    contactName: "Sani Musa",
    phone: "+234 701 444 2800",
    email: "supply@greenbasket.ng",
    accountNumber: "2098765431",
    address: "42 Ahmadu Bello Way, Kano",
    status: "Active",
    notes: "Groceries and dry food supplies"
  },
  {
    id: 3,
    name: "Alero Fashion House",
    contactName: "Alero Johnson",
    phone: "+234 809 232 9910",
    email: "sales@alerofashion.ng",
    accountNumber: "1044556677",
    address: "7 Admiralty Way, Lekki",
    status: "Inactive",
    notes: "Handbags, apparel, and seasonal drops"
  }
];

export const vendorTransactions = [
  {
    id: "VTX-001",
    vendorId: 1,
    vendorName: "Prime Mobile Distributors",
    productName: "iPhone 14 Pro",
    sku: "APL-14PRO",
    quantity: 8,
    unitCost: 710000,
    paymentAmount: 5680000,
    paymentStatus: "Paid",
    paymentMethod: "Bank Transfer",
    receiptSnapshot: "prime-mobile-iphone-receipt.jpg",
    vendorSignature: "Ifeoma Obi",
    date: "Jun 3, 2026"
  },
  {
    id: "VTX-002",
    vendorId: 1,
    vendorName: "Prime Mobile Distributors",
    productName: "AirPods Pro",
    sku: "APL-AIRPOD",
    quantity: 20,
    unitCost: 146000,
    paymentAmount: 2190000,
    paymentStatus: "Part Paid",
    paymentMethod: "Bank Transfer",
    receiptSnapshot: "airpods-balance-receipt.png",
    vendorSignature: "Ifeoma Obi",
    date: "Jun 8, 2026"
  },
  {
    id: "VTX-003",
    vendorId: 2,
    vendorName: "Green Basket Foods",
    productName: "Premium Rice 5kg",
    sku: "GRC-RICE5",
    quantity: 60,
    unitCost: 6200,
    paymentAmount: 372000,
    paymentStatus: "Paid",
    paymentMethod: "POS",
    receiptSnapshot: "green-basket-rice-receipt.jpg",
    vendorSignature: "Sani Musa",
    date: "Jun 10, 2026"
  },
  {
    id: "VTX-004",
    vendorId: 3,
    vendorName: "Alero Fashion House",
    productName: "Designer Handbag",
    sku: "FASH-BAG01",
    quantity: 6,
    unitCost: 84000,
    paymentAmount: 0,
    paymentStatus: "Unpaid",
    paymentMethod: "Pending",
    receiptSnapshot: "",
    vendorSignature: "",
    date: "Jun 14, 2026"
  }
];

export const orders = [
  { id: "ORD-001", customer: "John Doe", total: 850000, status: "Delivered", month: "Jan", monthIdx: 0, date: "Jan 15", progress: 100 },
  { id: "ORD-002", customer: "Sarah Adeleke", total: 133500, status: "Delivered", month: "Feb", monthIdx: 1, date: "Feb 10", progress: 100 },
  { id: "ORD-003", customer: "Michael Bello", total: 720000, status: "Delivered", month: "Mar", monthIdx: 2, date: "Mar 5", progress: 100 },
  { id: "ORD-004", customer: "Chioma Nwosu", total: 125000, status: "Delivered", month: "Apr", monthIdx: 3, date: "Apr 12", progress: 100 },
  { id: "ORD-005", customer: "Tunde Lawal", total: 850000, status: "Shipped", month: "May", monthIdx: 4, date: "May 20", progress: 65 },
  { id: "ORD-006", customer: "Ada Eze", total: 195000, status: "Shipped", month: "Jun", monthIdx: 5, date: "Jun 18", progress: 45 },
  { id: "ORD-007", customer: "Olu Jacobs", total: 915000, status: "Pending", month: "Jul", monthIdx: 6, date: "Jul 22", progress: 20 },
  { id: "ORD-008", customer: "Ngozi Okonkwo", total: 975000, status: "Delivered", month: "Aug", monthIdx: 7, date: "Aug 30", progress: 100 },
  { id: "ORD-009", customer: "Emeka Offor", total: 8500, status: "Delivered", month: "Sep", monthIdx: 8, date: "Sep 14", progress: 100 },
  { id: "ORD-010", customer: "Lola Ogun", total: 320000, status: "Shipped", month: "Oct", monthIdx: 9, date: "Oct 5", progress: 80 },
  { id: "ORD-011", customer: "Bola Tinubu", total: 850000, status: "Pending", month: "Nov", monthIdx: 10, date: "Nov 10", progress: 15 },
  { id: "ORD-012", customer: "Peter Obi", total: 728500, status: "Delivered", month: "Dec", monthIdx: 11, date: "Dec 1", progress: 100 }
];

export function formatNaira(value) {
  return `₦${value.toLocaleString()}`;
}

export function calcMonthlyIncome() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const income = new Array(12).fill(0);
  orders.forEach((order) => {
    if (order.status === "Delivered") income[order.monthIdx] += order.total;
  });
  return { months, income };
}

export function getStatusClass(status) {
  if (status === "Delivered") return "status-delivered";
  if (status === "Shipped") return "status-shipped";
  if (status === "Packed") return "status-shipped";
  return "status-pending";
}
