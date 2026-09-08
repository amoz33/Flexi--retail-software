-- Flexi Retail Software — Demo Products Seed
-- 25 additional products for demo presentation purposes.
-- These do NOT duplicate your existing 5 products (APL-14PRO, SSG-S23, GRC-RICE5, FASH-BAG01, APL-AIRPOD).
-- Matches the real `products` table schema — safe to run directly.

INSERT INTO products (name, sku, barcode, category, description, price, cost_price, stock, sold_count, front_desk_visible, expiry_date, images, outlet_id, created_at, updated_at) VALUES
-- Electronics
('MacBook Air M2', 'APL-MBAIRM2', 'APL-MBAIRM2', 'Electronics', '13-inch, 256GB SSD, Space Grey', 1450000, 1180000, 5, 9, 1, NULL, '[]', NULL, NOW(), NOW()),
('Sony WH-1000XM5 Headphones', 'SNY-WH1000XM5', 'SNY-WH1000XM5', 'Electronics', 'Noise-cancelling wireless headphones', 385000, 305000, 10, 14, 1, NULL, '[]', NULL, NOW(), NOW()),
('Samsung 55" QLED TV', 'SSG-QLED55', 'SSG-QLED55', 'Electronics', '4K Smart TV with HDR', 620000, 495000, 4, 6, 1, NULL, '[]', NULL, NOW(), NOW()),
('Anker PowerBank 20000mAh', 'ANK-PB20K', 'ANK-PB20K', 'Electronics', 'Fast-charging portable power bank', 28000, 19500, 30, 52, 1, NULL, '[]', NULL, NOW(), NOW()),
('HP LaserJet Printer', 'HP-LJ-P402', 'HP-LJ-P402', 'Electronics', 'Monochrome laser printer, wireless', 195000, 152000, 6, 8, 1, NULL, '[]', NULL, NOW(), NOW()),
('JBL Flip 6 Speaker', 'JBL-FLIP6', 'JBL-FLIP6', 'Electronics', 'Portable waterproof Bluetooth speaker', 92000, 71000, 14, 22, 1, NULL, '[]', NULL, NOW(), NOW()),

-- Groceries
('Golden Penny Spaghetti 500g', 'GRC-SPAG500', 'GRC-SPAG500', 'Groceries', 'Pack of durum wheat spaghetti', 1200, 850, 120, 340, 1, '2027-03-31', '[]', NULL, NOW(), NOW()),
('Titus Sardine (Carton of 50)', 'GRC-SARD-CTN', 'GRC-SARD-CTN', 'Groceries', 'Canned sardines in vegetable oil', 45000, 36000, 20, 48, 1, '2027-06-30', '[]', NULL, NOW(), NOW()),
('Kings Vegetable Oil 5L', 'GRC-OIL5L', 'GRC-OIL5L', 'Groceries', 'Refined vegetable cooking oil', 9800, 7600, 60, 158, 1, '2027-01-15', '[]', NULL, NOW(), NOW()),
('Peak Milk Powder 900g', 'GRC-MILK900', 'GRC-MILK900', 'Groceries', 'Full cream milk powder tin', 6500, 5100, 80, 210, 1, '2027-09-30', '[]', NULL, NOW(), NOW()),
('Dangote Sugar 1kg', 'GRC-SUGAR1', 'GRC-SUGAR1', 'Groceries', 'Refined granulated sugar', 1800, 1350, 150, 402, 1, '2027-05-20', '[]', NULL, NOW(), NOW()),

-- Fashion
('Men''s Ankara Shirt', 'FASH-ANKSHIRT', 'FASH-ANKSHIRT', 'Fashion', 'Custom-tailored Ankara print shirt', 18500, 11000, 22, 35, 1, NULL, '[]', NULL, NOW(), NOW()),
('Women''s Office Blazer', 'FASH-BLAZER01', 'FASH-BLAZER01', 'Fashion', 'Tailored fit, navy blue', 32000, 21000, 15, 19, 1, NULL, '[]', NULL, NOW(), NOW()),
('Leather Sneakers', 'FASH-SNKR01', 'FASH-SNKR01', 'Fashion', 'Genuine leather, unisex sizing', 45000, 30500, 18, 27, 1, NULL, '[]', NULL, NOW(), NOW()),
('Ankara Head Wrap', 'FASH-HDWRAP01', 'FASH-HDWRAP01', 'Fashion', 'Assorted print head wrap', 6500, 3800, 40, 66, 1, NULL, '[]', NULL, NOW(), NOW()),
('Kids School Backpack', 'FASH-BAGKID01', 'FASH-BAGKID01', 'Fashion', 'Durable, water-resistant', 15500, 9800, 25, 31, 1, NULL, '[]', NULL, NOW(), NOW()),

-- Home & Kitchen
('Non-Stick Cookware Set (7pc)', 'HOME-COOK7PC', 'HOME-COOK7PC', 'Home & Kitchen', 'Aluminium non-stick cookware set', 68000, 51000, 9, 13, 1, NULL, '[]', NULL, NOW(), NOW()),
('Binatone Blender BLG-600', 'HOME-BLND600', 'HOME-BLND600', 'Home & Kitchen', '600W blender with grinder attachment', 32500, 24000, 16, 29, 1, NULL, '[]', NULL, NOW(), NOW()),
('Standing Fan 18-inch', 'HOME-FAN18', 'HOME-FAN18', 'Home & Kitchen', 'Oscillating standing fan, 3-speed', 27000, 19500, 12, 20, 1, NULL, '[]', NULL, NOW(), NOW()),
('Bedsheet Set (Queen)', 'HOME-BEDSET-Q', 'HOME-BEDSET-Q', 'Home & Kitchen', '4-piece cotton bedsheet set', 21000, 14000, 20, 24, 1, NULL, '[]', NULL, NOW(), NOW()),

-- Beauty & Personal Care
('Shea Butter Body Cream 500ml', 'BTY-SHEA500', 'BTY-SHEA500', 'Beauty & Personal Care', 'Natural moisturizing body cream', 4500, 2900, 55, 132, 1, '2027-08-31', '[]', NULL, NOW(), NOW()),
('Wig - 24" Body Wave', 'BTY-WIG24BW', 'BTY-WIG24BW', 'Beauty & Personal Care', '100% human hair, lace front', 85000, 58000, 8, 11, 1, NULL, '[]', NULL, NOW(), NOW()),
('Perfume Oil 50ml (Unisex)', 'BTY-PERF50', 'BTY-PERF50', 'Beauty & Personal Care', 'Long-lasting concentrated perfume oil', 12000, 7500, 35, 74, 1, NULL, '[]', NULL, NOW(), NOW()),

-- Stationery
('A4 Ream Paper (500 sheets)', 'STAT-A4REAM', 'STAT-A4REAM', 'Stationery', 'Copier paper, 80gsm', 5200, 3900, 45, 88, 1, NULL, '[]', NULL, NOW(), NOW()),
('Executive Notebook Set (3pc)', 'STAT-NOTE3PC', 'STAT-NOTE3PC', 'Stationery', 'Hardcover ruled notebooks', 6800, 4200, 30, 41, 1, NULL, '[]', NULL, NOW(), NOW());
