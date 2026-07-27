-- =====================================================================
-- flexi_retail seed data — REMAINING TABLES ONLY
-- products, staff, equipment_inventory already populated — skipped here.
-- Existing users (admin/cashier/customer@flexiretail.ng) are untouched.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- vendors  (explicit ids so vendor_transactions.vendor_id lines up below)
-- ---------------------------------------------------------------------
INSERT INTO vendors (id, name, contact_name, phone, email, account_number, address, status, notes) VALUES
(1, 'Prime Mobile Distributors', 'Ifeoma Obi', '+234 803 555 0112', 'orders@primemobile.ng', '0123456789', '18 Marina Road, Lagos', 'Active', 'Phones, tablets, and accessories'),
(2, 'Green Basket Foods', 'Sani Musa', '+234 701 444 2800', 'supply@greenbasket.ng', '2098765431', '42 Ahmadu Bello Way, Kano', 'Active', 'Groceries and dry food supplies'),
(3, 'Alero Fashion House', 'Alero Johnson', '+234 809 232 9910', 'sales@alerofashion.ng', '1044556677', '7 Admiralty Way, Lekki', 'Inactive', 'Handbags, apparel, and seasonal drops');

-- ---------------------------------------------------------------------
-- vendor_transactions  (id is auto_increment; VTX-xxx goes into transaction_number)
-- ---------------------------------------------------------------------
INSERT INTO vendor_transactions (transaction_number, vendor_id, vendor_name, product_name, sku, quantity, unit_cost, payment_amount, payment_status, payment_method, receipt_snapshot, vendor_signature, transacted_on) VALUES
('VTX-001', 1, 'Prime Mobile Distributors', 'iPhone 14 Pro', 'APL-14PRO', 8, 710000, 5680000, 'Paid', 'Bank Transfer', 'prime-mobile-iphone-receipt.jpg', 'Ifeoma Obi', '2026-06-03'),
('VTX-002', 1, 'Prime Mobile Distributors', 'AirPods Pro', 'APL-AIRPOD', 20, 146000, 2190000, 'Part Paid', 'Bank Transfer', 'airpods-balance-receipt.png', 'Ifeoma Obi', '2026-06-08'),
('VTX-003', 2, 'Green Basket Foods', 'Premium Rice 5kg', 'GRC-RICE5', 60, 6200, 372000, 'Paid', 'POS', 'green-basket-rice-receipt.jpg', 'Sani Musa', '2026-06-10'),
('VTX-004', 3, 'Alero Fashion House', 'Designer Handbag', 'FASH-BAG01', 6, 84000, 0, 'Unpaid', 'Pending', NULL, NULL, '2026-06-14');

-- ---------------------------------------------------------------------
-- users  (3 new customers, role = 'Customer'; existing 3 users untouched)
-- Placeholder password hash below = "password" (Laravel default test hash).
-- IMPORTANT: have these users reset their password before real login use.
-- ---------------------------------------------------------------------
INSERT INTO users (name, email, phone, address, role, is_active, password) VALUES
('Sarah Adeleke', 'sarah.adeleke@example.com', '+234 802 110 4421', '12 Allen Avenue, Ikeja', 'Customer', 1, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Michael Bello', 'michael.bello@example.com', '+234 701 662 9088', '8 Stadium Road, Port Harcourt', 'Customer', 1, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Ngozi Okonkwo', 'ngozi.okonkwo@example.com', '+234 809 775 2100', '31 Awolowo Road, Ikoyi', 'Customer', 0, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- ---------------------------------------------------------------------
-- retail_orders
-- order_number holds the old ORD-xxx code; items is required JSON, so a
-- single placeholder line item (= order total) is generated per order.
-- customer_id is looked up by email for the 3 new customers above;
-- all other orders keep customer_id NULL with just customer_name set.
-- ---------------------------------------------------------------------
INSERT INTO retail_orders (order_number, customer_id, customer_name, payment_status, items, subtotal, delivery_fee, total, status) VALUES
('ORD-001', NULL,
  'John Doe', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',850000)),
  850000, 0, 850000, 'Delivered'),

('ORD-002', (SELECT id FROM users WHERE email = 'sarah.adeleke@example.com'),
  'Sarah Adeleke', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',133500)),
  133500, 0, 133500, 'Delivered'),

('ORD-003', (SELECT id FROM users WHERE email = 'michael.bello@example.com'),
  'Michael Bello', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',720000)),
  720000, 0, 720000, 'Delivered'),

('ORD-004', NULL,
  'Chioma Nwosu', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',125000)),
  125000, 0, 125000, 'Delivered'),

('ORD-005', NULL,
  'Tunde Lawal', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',850000)),
  850000, 0, 850000, 'Shipped'),

('ORD-006', NULL,
  'Ada Eze', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',195000)),
  195000, 0, 195000, 'Shipped'),

('ORD-007', NULL,
  'Olu Jacobs', 'Pending',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',915000)),
  915000, 0, 915000, 'Pending'),

('ORD-008', (SELECT id FROM users WHERE email = 'ngozi.okonkwo@example.com'),
  'Ngozi Okonkwo', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',975000)),
  975000, 0, 975000, 'Delivered'),

('ORD-009', NULL,
  'Emeka Offor', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',8500)),
  8500, 0, 8500, 'Delivered'),

('ORD-010', NULL,
  'Lola Ogun', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',320000)),
  320000, 0, 320000, 'Shipped'),

('ORD-011', NULL,
  'Bola Tinubu', 'Pending',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',850000)),
  850000, 0, 850000, 'Pending'),

('ORD-012', NULL,
  'Peter Obi', 'Paid',
  JSON_ARRAY(JSON_OBJECT('name','Store Purchase','quantity',1,'price',728500)),
  728500, 0, 728500, 'Delivered');

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- End of file
-- =====================================================================
