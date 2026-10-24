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
  address     TEXT,

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
  company_id    INT DEFAULT NULL,
  name          VARCHAR(150) NOT NULL,
  default_rate  DECIMAL(10,2),
  unit          VARCHAR(50),

  is_deleted    TINYINT(1) DEFAULT 0,
  deleted_at    DATETIME DEFAULT NULL,
  deleted_by    INT DEFAULT NULL,

  CONSTRAINT fk_services_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_services_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
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
-- PERFIL FISCAL DEL EMISOR (NIF, nombre, domicilio)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS issuer_profiles (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  issuer_key      VARCHAR(40)  NOT NULL,
  user_id         INT          NULL,
  company_id      INT          NULL,
  legal_name      VARCHAR(200) NOT NULL,
  tax_id          VARCHAR(20)  NOT NULL,
  fiscal_address  TEXT         NOT NULL,
  created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_issuer_profile (issuer_key),
  CONSTRAINT fk_issuer_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_issuer_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
);

-- ══════════════════════════════════════════════════════════
-- CONTADOR POR EMISOR Y SERIE
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoice_series (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  issuer_key   VARCHAR(40) NOT NULL,
  series_code  VARCHAR(20) NOT NULL,
  year         INT         NOT NULL,
  next_number  INT         NOT NULL DEFAULT 1,
  padding      INT         NOT NULL DEFAULT 4,
  UNIQUE KEY uq_invoice_series (issuer_key, series_code, year)
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

  issuer_key       VARCHAR(40) DEFAULT NULL,
  series_code      VARCHAR(20) DEFAULT NULL,

  invoice_number   VARCHAR(50) DEFAULT NULL,
  invoice_seq      INT         DEFAULT NULL,
  invoice_year     INT         DEFAULT NULL,
  invoice_prefix   VARCHAR(20) DEFAULT NULL,

  issue_date       DATE NOT NULL,
  due_date         DATE NOT NULL,
  status           ENUM('draft','sent','paid','overdue','void') DEFAULT 'draft',

  subtotal_amount  DECIMAL(10,2) DEFAULT 0,
  tax_amount       DECIMAL(10,2) DEFAULT 0,
  equivalence_surcharge_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  irpf_rate        DECIMAL(5,2) NOT NULL DEFAULT 0,
  irpf_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount     DECIMAL(10,2) DEFAULT 0,
  paid_amount      DECIMAL(10,2) DEFAULT 0,
  payment_status   ENUM('unpaid','partial','paid') DEFAULT 'unpaid',

  sent_at          DATETIME DEFAULT NULL,
  paid_at          DATETIME DEFAULT NULL,
  public_token     VARCHAR(100) DEFAULT NULL,

  issuer_legal_name      VARCHAR(200) DEFAULT NULL,
  issuer_tax_id          VARCHAR(20)  DEFAULT NULL,
  issuer_fiscal_address  TEXT         DEFAULT NULL,
  customer_legal_name    VARCHAR(200) DEFAULT NULL,
  customer_tax_id        VARCHAR(32)  DEFAULT NULL,
  customer_fiscal_address TEXT        DEFAULT NULL,
  issued_at              DATETIME DEFAULT NULL,
  voided_at              DATETIME DEFAULT NULL,
  void_reason            TEXT DEFAULT NULL,
  verifactu_status       VARCHAR(40) DEFAULT NULL,
  verifactu_external_id  VARCHAR(100) DEFAULT NULL,
  verifactu_qr_url       TEXT DEFAULT NULL,
  verifactu_legend       VARCHAR(120) DEFAULT NULL,

  notes            TEXT,
  invoice_kind     ENUM('complete','simplified') NOT NULL DEFAULT 'complete',
  invoice_type     ENUM('normal','rectificativa') NOT NULL DEFAULT 'normal',
  rectification_method ENUM('substitution','difference') DEFAULT NULL,
  rectification_code VARCHAR(2) DEFAULT NULL,
  rectifies_invoice_id BIGINT DEFAULT NULL,
  rectified_by_invoice_id BIGINT DEFAULT NULL,

  is_deleted       TINYINT(1) DEFAULT 0,
  deleted_at       DATETIME DEFAULT NULL,
  deleted_by       INT DEFAULT NULL,

  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_invoice_issuer_series_number (issuer_key, series_code, invoice_number),

  CONSTRAINT fk_invoices_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_client
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
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
  equivalence_surcharge_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  subtotal     DECIMAL(10,2) NOT NULL,
  tax_amount   DECIMAL(10,2) DEFAULT 0,
  equivalence_surcharge_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total        DECIMAL(10,2) NOT NULL,

  is_deleted   TINYINT(1) DEFAULT 0,
  deleted_at   DATETIME DEFAULT NULL,
  deleted_by   INT DEFAULT NULL,

  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoice_items_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Bitácora de la factura. Solo se insertan filas; la aplicación no las borra.
CREATE TABLE IF NOT EXISTS invoice_events (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  invoice_id  BIGINT       NOT NULL,
  issuer_key  VARCHAR(40)  NULL,
  user_id     INT          NULL,
  action      VARCHAR(40)  NOT NULL,
  payload     JSON         NULL,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoice_events_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoice_events_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_invoice_events_invoice (invoice_id, id)
);

-- Cadena de huellas: una por NIF de obligado tributario.
CREATE TABLE IF NOT EXISTS verifactu_chain (
  issuer_tax_id          VARCHAR(9) PRIMARY KEY,
  last_huella            CHAR(64) NULL,
  last_num_serie         VARCHAR(60) NULL,
  last_fecha_expedicion  CHAR(10) NULL,
  last_fecha_hora        VARCHAR(40) NULL,
  last_record_id         BIGINT NULL,
  numero_instalacion     VARCHAR(100) NOT NULL,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cola de registros de facturación enviados o pendientes de enviar a la AEAT.
CREATE TABLE IF NOT EXISTS verifactu_records (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  invoice_id         BIGINT NOT NULL,
  issuer_tax_id      VARCHAR(9) NOT NULL,
  sender_key         VARCHAR(40) NOT NULL,
  operation          ENUM('alta','anulacion') NOT NULL,
  xml                MEDIUMTEXT NOT NULL,
  huella             CHAR(64) NOT NULL,
  previous_huella    CHAR(64) NULL,
  num_serie          VARCHAR(60) NOT NULL,
  fecha_expedicion   CHAR(10) NOT NULL,
  tipo_factura       VARCHAR(2) NULL,
  cuota_total        VARCHAR(20) NULL,
  importe_total      VARCHAR(20) NULL,
  fecha_hora         VARCHAR(40) NOT NULL,
  status             VARCHAR(32) NOT NULL,
  csv                VARCHAR(120) NULL,
  estado_envio       VARCHAR(32) NULL,
  estado_registro    VARCHAR(32) NULL,
  codigo_error       VARCHAR(20) NULL,
  descripcion_error  VARCHAR(1500) NULL,
  attempts           INT NOT NULL DEFAULT 0,
  next_attempt_at    DATETIME NULL,
  subsanacion        CHAR(1) NULL,
  rechazo_previo     CHAR(1) NULL,
  payload_json       JSON NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_at            DATETIME NULL,
  CONSTRAINT fk_vf_records_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  INDEX idx_vf_records_queue (status, next_attempt_at, id),
  INDEX idx_vf_records_invoice (invoice_id),
  INDEX idx_vf_records_sender (sender_key, status)
);

CREATE TABLE IF NOT EXISTS verifactu_sender_state (
  sender_key    VARCHAR(40) PRIMARY KEY,
  last_sent_at  DATETIME NULL,
  wait_seconds  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS verifactu_certificates (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  scope               ENUM('issuer','platform') NOT NULL,
  issuer_tax_id       VARCHAR(9) NOT NULL,
  label               VARCHAR(120) NULL,
  pfx_cipher          MEDIUMTEXT NOT NULL,
  passphrase_cipher   TEXT NOT NULL,
  created_by          INT NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vf_cert_owner (scope, issuer_tax_id)
);

CREATE TABLE IF NOT EXISTS verifactu_representation (
  issuer_tax_id          VARCHAR(9) PRIMARY KEY,
  mode                   ENUM('own_certificate','platform_representation') NOT NULL DEFAULT 'own_certificate',
  representative_name    VARCHAR(120) NULL,
  representative_tax_id  VARCHAR(9) NULL,
  apoderamiento_ref      VARCHAR(120) NULL,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
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
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
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
-- BILLING EVENTS (registro de eventos de Stripe)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS billing_events (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  stripe_event_id  VARCHAR(100) NOT NULL,
  event_type       VARCHAR(100) NOT NULL,
  amount           DECIMAL(10,2) DEFAULT NULL,
  status           VARCHAR(50)  DEFAULT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_stripe_event (stripe_event_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_billing_events_user ON billing_events(user_id);

-- ══════════════════════════════════════════════════════════
-- TASKS (tablero Kanban de tareas por proyecto)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tasks (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  project_id   INT NOT NULL,
  user_id      INT NOT NULL,
  assigned_to  INT DEFAULT NULL,

  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  status       ENUM('todo','in_progress','review','done') DEFAULT 'todo',
  priority     ENUM('low','medium','high','urgent') DEFAULT 'medium',
  due_date     DATE DEFAULT NULL,
  position     INT DEFAULT 0,

  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_tasks_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- TIME ENTRIES (control de horas / temporizador)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS time_entries (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  project_id   INT DEFAULT NULL,

  description  VARCHAR(255),
  started_at   DATETIME NOT NULL,
  stopped_at   DATETIME DEFAULT NULL,
  duration     INT DEFAULT NULL COMMENT 'segundos, se rellena al parar el temporizador',
  hourly_rate  DECIMAL(10,2) DEFAULT 0,
  billable     TINYINT(1) DEFAULT 1,

  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_time_entries_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_time_entries_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════════════════════
-- NOTIFICATIONS (persistentes, con estado leído/no leído)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,

  type         ENUM('overdue','warning','info') NOT NULL DEFAULT 'info',
  entity_type  VARCHAR(30) NOT NULL,
  entity_id    INT NOT NULL,

  title        VARCHAR(150) NOT NULL,
  body         VARCHAR(255),
  link         VARCHAR(255),
  is_read      TINYINT(1) DEFAULT 0,

  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY uq_notification_source (user_id, entity_type, entity_id, type)
);

-- ══════════════════════════════════════════════════════════
-- RECURRING EXPENSES (alquiler, SaaS, etc. — se generan solos)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  company_id    INT DEFAULT NULL,

  category      VARCHAR(100),
  description   VARCHAR(255),
  amount        DECIMAL(10,2) NOT NULL,

  frequency     ENUM('weekly','monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly',
  next_date     DATE NOT NULL,
  end_date      DATE DEFAULT NULL,
  status        ENUM('active','paused','finished') NOT NULL DEFAULT 'active',
  last_generated DATETIME DEFAULT NULL,

  is_deleted    TINYINT(1) DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_recurring_expenses_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_recurring_expenses_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
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
CREATE INDEX idx_tasks_project       ON tasks(project_id);
CREATE INDEX idx_tasks_user          ON tasks(user_id);
CREATE INDEX idx_time_entries_user   ON time_entries(user_id);
CREATE INDEX idx_time_entries_active ON time_entries(user_id, stopped_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_recurring_expenses_next   ON recurring_expenses(next_date, status);

SET FOREIGN_KEY_CHECKS = 1;

-- ══════════════════════════════════════════════════════════
-- Verificación final
-- ══════════════════════════════════════════════════════════
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;
