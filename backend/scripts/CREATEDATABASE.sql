DROP DATABASE IF EXISTS workly_db;
CREATE DATABASE workly_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE workly_db;

-- ======================
-- USERS
-- ======================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,

  avatar_url VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(150),

  role ENUM('user', 'admin') DEFAULT 'user',
  status ENUM('active','inactive','suspended') DEFAULT 'active',

  language VARCHAR(10) DEFAULT 'es',
  timezone VARCHAR(50) DEFAULT 'Europe/Madrid',

  last_login DATETIME,
  plan ENUM('free','pro','business') DEFAULT 'free',
  trial_ends_at DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ======================
-- ACTIVITY LOGS
-- ======================
CREATE TABLE activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entity VARCHAR(50),
  entity_id BIGINT,
  action VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- ======================
-- CLIENTS
-- ======================
CREATE TABLE clients (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50),
  company VARCHAR(150),
  notes TEXT,
  document VARCHAR(100),

  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL,
  deleted_by INT DEFAULT NULL,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_clients_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_clients_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- ======================
-- SERVICES
-- ======================
CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  default_rate DECIMAL(10,2),
  unit VARCHAR(50),

  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL,
  deleted_by INT DEFAULT NULL,

  CONSTRAINT fk_services_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_services_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- ======================
-- EXPENSES
-- ======================
CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category VARCHAR(100),
  description VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  receipt_url VARCHAR(255),

  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL,
  deleted_by INT DEFAULT NULL,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_expenses_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_expenses_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- ======================
-- PROJECTS
-- ======================
CREATE TABLE projects (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2),

  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL,
  deleted_by INT DEFAULT NULL,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_projects_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_projects_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_projects_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- ======================
-- INVOICES
-- ======================
CREATE TABLE invoices (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_id BIGINT NOT NULL,
  project_id BIGINT NULL,

  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('draft','sent','paid','overdue') DEFAULT 'draft',
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,

  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL,
  deleted_by INT DEFAULT NULL,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_invoices_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_invoices_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_invoices_project
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_invoices_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- ======================
-- INVOICE ITEMS
-- ======================
CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,

  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL,
  deleted_by INT DEFAULT NULL,

  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_invoice_items_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id)
    ON DELETE SET NULL
);
