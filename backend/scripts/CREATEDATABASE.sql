-- ══════════════════════════════════════════════════════════
--  WORKLY — Base de datos completa
--  Ejecutar en Railway MySQL (base de datos: railway)
-- ══════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- ══════════════════════════════════════════════════════════
-- USERS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL UNIQUE,
  password       VARCHAR(255)  NOT NULL,

  avatar_url     VARCHAR(255),
  phone          VARCHAR(50),
  company_name   VARCHAR(150),
  company_id     INT DEFAULT NULL,        -- FK a companies (se añade constraint después)

  role           ENUM('user','admin','company_admin') DEFAULT 'user',
  status         ENUM('active','inactive','suspended') DEFAULT 'active',

  language       VARCHAR(10)  DEFAULT 'es',
  timezone       VARCHAR(50)  DEFAULT 'Europe/Madrid',

  last_login     DATETIME,
  plan           ENUM('free','pro','business') DEFAULT 'free',
  trial_ends_at  DATETIME,

  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════════════════════
-- COMPANIES
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS companies (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  tax_id      VARCHAR(50),
  address     TEXT,
  email       VARCHAR(150),
  phone       VARCHAR(50),
  website     VARCHAR(255),
  owner_id    INT NOT NULL,

  is_deleted  TINYINT(1) DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_companies_owner
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════════════════════
-- COMPANY MEMBERS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS company_members (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  company_id   INT NOT NULL,
  user_id      INT NOT NULL,
  role         ENUM('admin','manager','technician','viewer') DEFAULT 'technician',
  status       ENUM('active','suspended','pending') DEFAULT 'active',
  invite_token VARCHAR(100),
  invited_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  joined_at    DATETIME,

  CONSTRAINT fk_cm_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_company_user (company_id, user_id)
);

-- FK company_id en users (ahora que companies existe)
ALTER TABLE users
  ADD CONSTRAINT fk_users_company
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- ══════════════════════════════════════════════════════════
-- ACTIVITY LOGS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  entity      VARCHAR(50),
  entity_id   BIGINT,
  action      VARCHAR(50),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════════════════════
-- CLIENTS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clients (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  company_id  INT DEFAULT NULL,
  assigned_to INT DEFAULT NULL,

  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(150),
  phone       VARCHAR(50),
  company     VARCHAR(150),
  notes       TEXT,
  document    VARCHAR(100),

  is_deleted  TINYINT(1) DEFAULT 0,
  deleted_at  DATETIME DEFAULT NULL,
  deleted_by  INT DEFAULT NULL,

  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_clients_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_clients_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_clients_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- SERVICES
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS services (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  name          VARCHAR(150) NOT NULL,
  default_rate  DECIMAL(10,2),
  unit          VARCHAR(50),

  is_deleted    TINYINT(1) DEFAULT 0,
  deleted_at    DATETIME DEFAULT NULL,
  deleted_by    INT DEFAULT NULL,

  CONSTRAINT fk_services_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_services_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- EXPENSES
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS expenses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  company_id   INT DEFAULT NULL,
  category     VARCHAR(100),
  description  VARCHAR(255),
  amount       DECIMAL(10,2) NOT NULL,
  date         DATE NOT NULL,
  receipt_url  VARCHAR(255),

  is_deleted   TINYINT(1) DEFAULT 0,
  deleted_at   DATETIME DEFAULT NULL,
  deleted_by   INT DEFAULT NULL,

  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_expenses_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_expenses_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_expenses_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- PROJECTS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS projects (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  client_id    BIGINT NOT NULL,
  company_id   INT DEFAULT NULL,
  assigned_to  INT DEFAULT NULL,

  title        VARCHAR(150) NOT NULL,
  description  TEXT,
  status       ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  start_date   DATE,
  end_date     DATE,
  budget       DECIMAL(10,2),

  is_deleted   TINYINT(1) DEFAULT 0,
  deleted_at   DATETIME DEFAULT NULL,
  deleted_by   INT DEFAULT NULL,

  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_projects_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_projects_client
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_projects_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_projects_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- INVOICE SETTINGS (numeración automática)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoice_settings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL UNIQUE,
  prefix        VARCHAR(20)  DEFAULT 'FAC',
  next_number   INT          DEFAULT 1,
  padding       INT          DEFAULT 4,
  reset_yearly  TINYINT(1)   DEFAULT 1,
  current_year  INT          DEFAULT (YEAR(CURDATE())),

  CONSTRAINT fk_invoice_settings_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════════════════════
-- INVOICES
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoices (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT    NOT NULL,
  client_id        BIGINT NOT NULL,
  project_id       BIGINT DEFAULT NULL,
  company_id       INT    DEFAULT NULL,

  invoice_number   VARCHAR(50) NOT NULL UNIQUE,
  invoice_seq      INT         DEFAULT 1,
  invoice_year     INT         DEFAULT (YEAR(CURDATE())),
  invoice_prefix   VARCHAR(20) DEFAULT 'FAC',

  issue_date       DATE NOT NULL,
  due_date         DATE NOT NULL,
  status           ENUM('draft','sent','paid','overdue') DEFAULT 'draft',

  subtotal_amount  DECIMAL(10,2) DEFAULT 0,
  tax_amount       DECIMAL(10,2) DEFAULT 0,
  total_amount     DECIMAL(10,2) DEFAULT 0,
  paid_amount      DECIMAL(10,2) DEFAULT 0,
  payment_status   ENUM('unpaid','partial','paid') DEFAULT 'unpaid',

  sent_at          DATETIME DEFAULT NULL,
  paid_at          DATETIME DEFAULT NULL,
  public_token     VARCHAR(100) DEFAULT NULL,

  notes            TEXT,

  is_deleted       TINYINT(1) DEFAULT 0,
  deleted_at       DATETIME DEFAULT NULL,
  deleted_by       INT DEFAULT NULL,

  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_invoices_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_client
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- INVOICE ITEMS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoice_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id   BIGINT NOT NULL,
  description  VARCHAR(255) NOT NULL,
  quantity     DECIMAL(10,2) NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  tax_rate     DECIMAL(5,2)  DEFAULT 21,
  subtotal     DECIMAL(10,2) NOT NULL,
  tax_amount   DECIMAL(10,2) DEFAULT 0,
  total        DECIMAL(10,2) NOT NULL,

  is_deleted   TINYINT(1) DEFAULT 0,
  deleted_at   DATETIME DEFAULT NULL,
  deleted_by   INT DEFAULT NULL,

  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_items_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- INVOICE PAYMENTS (pagos parciales)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoice_payments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id    BIGINT NOT NULL,
  user_id       INT    NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  payment_date  DATE NOT NULL,
  method        ENUM('transfer','cash','card','paypal','other') DEFAULT 'transfer',
  reference     VARCHAR(100),
  notes         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_payments_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════════════════════
-- QUOTES (presupuestos)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS quotes (
  id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id                 INT    NOT NULL,
  client_id               BIGINT NOT NULL,
  project_id              BIGINT DEFAULT NULL,
  company_id              INT    DEFAULT NULL,

  quote_number            VARCHAR(50) NOT NULL UNIQUE,
  issue_date              DATE NOT NULL,
  expiry_date             DATE,
  status                  ENUM('draft','sent','accepted','rejected','expired') DEFAULT 'draft',

  subtotal_amount         DECIMAL(10,2) DEFAULT 0,
  tax_amount              DECIMAL(10,2) DEFAULT 0,
  total_amount            DECIMAL(10,2) DEFAULT 0,

  converted_to_invoice_id BIGINT DEFAULT NULL,
  notes                   TEXT,

  is_deleted              TINYINT(1) DEFAULT 0,
  deleted_at              DATETIME DEFAULT NULL,

  created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_quotes_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_quotes_client
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_quotes_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- QUOTE ITEMS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS quote_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  quote_id     BIGINT NOT NULL,
  description  VARCHAR(255) NOT NULL,
  quantity     DECIMAL(10,2) NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  tax_rate     DECIMAL(5,2)  DEFAULT 21,
  subtotal     DECIMAL(10,2) NOT NULL,
  tax_amount   DECIMAL(10,2) DEFAULT 0,
  total        DECIMAL(10,2) NOT NULL,

  is_deleted   TINYINT(1) DEFAULT 0,

  CONSTRAINT fk_quote_items_quote
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════════════════════
-- CREDIT NOTES (notas de crédito)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS credit_notes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT    NOT NULL,
  invoice_id       BIGINT NOT NULL,
  company_id       INT    DEFAULT NULL,

  credit_number    VARCHAR(50) NOT NULL UNIQUE,
  issue_date       DATE NOT NULL,
  reason           TEXT,
  status           ENUM('draft','issued') DEFAULT 'draft',

  subtotal_amount  DECIMAL(10,2) DEFAULT 0,
  tax_amount       DECIMAL(10,2) DEFAULT 0,
  total_amount     DECIMAL(10,2) DEFAULT 0,

  is_deleted       TINYINT(1) DEFAULT 0,
  deleted_at       DATETIME DEFAULT NULL,

  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_cn_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cn_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_cn_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- CREDIT NOTE ITEMS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS credit_note_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  credit_id    INT NOT NULL,
  description  VARCHAR(255) NOT NULL,
  quantity     DECIMAL(10,2) NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  tax_rate     DECIMAL(5,2)  DEFAULT 21,
  subtotal     DECIMAL(10,2) NOT NULL,
  tax_amount   DECIMAL(10,2) DEFAULT 0,
  total        DECIMAL(10,2) NOT NULL,

  CONSTRAINT fk_cn_items_note
    FOREIGN KEY (credit_id) REFERENCES credit_notes(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════════════════════
-- RECURRING INVOICES (facturas recurrentes)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT    NOT NULL,
  client_id        BIGINT NOT NULL,
  project_id       BIGINT DEFAULT NULL,
  company_id       INT    DEFAULT NULL,

  frequency        ENUM('weekly','monthly','quarterly','yearly') DEFAULT 'monthly',
  next_date        DATE NOT NULL,
  end_date         DATE DEFAULT NULL,
  status           ENUM('active','paused','finished') DEFAULT 'active',

  subtotal_amount  DECIMAL(10,2) DEFAULT 0,
  tax_amount       DECIMAL(10,2) DEFAULT 0,
  total_amount     DECIMAL(10,2) DEFAULT 0,

  notes            TEXT,
  last_generated   DATETIME DEFAULT NULL,

  is_deleted       TINYINT(1) DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_rec_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_client
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_rec_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- RECURRING INVOICE ITEMS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recurring_invoice_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  recurring_id  INT NOT NULL,
  description   VARCHAR(255) NOT NULL,
  quantity      DECIMAL(10,2) NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  tax_rate      DECIMAL(5,2)  DEFAULT 21,
  subtotal      DECIMAL(10,2) NOT NULL,
  tax_amount    DECIMAL(10,2) DEFAULT 0,
  total         DECIMAL(10,2) NOT NULL,

  CONSTRAINT fk_rec_items
    FOREIGN KEY (recurring_id) REFERENCES recurring_invoices(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════════════════════
-- ÍNDICES para mejorar rendimiento
-- ══════════════════════════════════════════════════════════
CREATE INDEX idx_invoices_user       ON invoices(user_id);
CREATE INDEX idx_invoices_client     ON invoices(client_id);
CREATE INDEX idx_invoices_status     ON invoices(status);
CREATE INDEX idx_invoices_due_date   ON invoices(due_date);
CREATE INDEX idx_clients_user        ON clients(user_id);
CREATE INDEX idx_projects_user       ON projects(user_id);
CREATE INDEX idx_expenses_user       ON expenses(user_id);
CREATE INDEX idx_quotes_user         ON quotes(user_id);
CREATE INDEX idx_activity_user       ON activity_logs(user_id);
CREATE INDEX idx_recurring_next      ON recurring_invoices(next_date, status);

SET FOREIGN_KEY_CHECKS = 1;

-- ══════════════════════════════════════════════════════════
-- Verificación final
-- ══════════════════════════════════════════════════════════
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;
