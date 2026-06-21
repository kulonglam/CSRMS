-- ============================================================
-- CSRMS Database Schema
-- Crown Stores Retail Management System
-- ============================================================

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL UNIQUE,
  location    VARCHAR(255),
  status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  branch_id     INT REFERENCES branches(id) ON DELETE SET NULL,
  full_name     VARCHAR(150) NOT NULL,
  username      VARCHAR(80) NOT NULL UNIQUE,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30) NOT NULL CHECK (role IN ('director', 'manager', 'sales_agent')),
  status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id                SERIAL PRIMARY KEY,
  category_id       INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name              VARCHAR(150) NOT NULL,
  description       TEXT,
  cost_price        NUMERIC(12, 2) NOT NULL CHECK (cost_price >= 0),
  selling_price     NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
  reorder_level     INT NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
  status            VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory (per branch)
CREATE TABLE IF NOT EXISTS inventory (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  branch_id         INT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  quantity_available INT NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, branch_id)
);

-- Product Barcodes
CREATE TABLE IF NOT EXISTS product_barcodes (
  id             SERIAL PRIMARY KEY,
  product_id     INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  barcode_number VARCHAR(100) NOT NULL UNIQUE,
  status         VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Procurements
CREATE TABLE IF NOT EXISTS procurements (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  branch_id         INT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  recorded_by       INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  supplier_name     VARCHAR(150) NOT NULL,
  quantity_received INT NOT NULL CHECK (quantity_received > 0),
  cost_price        NUMERIC(12, 2) NOT NULL CHECK (cost_price >= 0),
  date_received     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id            SERIAL PRIMARY KEY,
  branch_id     INT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  sales_agent_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  total_amount  NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  amount_paid   NUMERIC(12, 2) NOT NULL CHECK (amount_paid >= 0),
  change_given  NUMERIC(12, 2) GENERATED ALWAYS AS (amount_paid - total_amount) STORED,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  status        VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
  sale_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id          SERIAL PRIMARY KEY,
  sale_id     INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal    NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Cashier Balancing
CREATE TABLE IF NOT EXISTS cashier_balancing (
  id              SERIAL PRIMARY KEY,
  branch_id       INT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  sales_agent_id  INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  manager_id      INT REFERENCES users(id) ON DELETE SET NULL,
  balance_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_amount NUMERIC(12, 2) NOT NULL,
  submitted_amount NUMERIC(12, 2) NOT NULL,
  variance        NUMERIC(12, 2) GENERATED ALWAYS AS (submitted_amount - expected_amount) STORED,
  notes           TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged')),
  agent_submitted_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sales_agent_id, balance_date)
);

-- Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  branch_id     INT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  adjusted_by   INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  quantity      INT NOT NULL,  -- negative = reduction, positive = increase
  reason        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  table_name  VARCHAR(100),
  record_id   INT,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  branch_id   INT REFERENCES branches(id) ON DELETE CASCADE,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL CHECK (type IN ('low_stock', 'out_of_stock', 'general')),
  message     TEXT NOT NULL,
  product_id  INT REFERENCES products(id) ON DELETE CASCADE,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch ON inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_product ON product_barcodes(product_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_number ON product_barcodes(barcode_number);
CREATE INDEX IF NOT EXISTS idx_procurements_branch ON procurements(branch_id);
CREATE INDEX IF NOT EXISTS idx_procurements_product ON procurements(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_agent ON sales(sales_agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_branch ON notifications(branch_id);

-- Revoked JWT tokens (logout invalidation)
CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti         VARCHAR(64) PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(128) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);