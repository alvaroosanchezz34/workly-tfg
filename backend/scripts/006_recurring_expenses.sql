-- migrations/006_recurring_expenses.sql
-- Gastos recurrentes (alquiler, SaaS, etc.) — simétrico a recurring_invoices
-- pero sin líneas de factura, ya que un gasto es un único importe.

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

-- CREATE INDEX no soporta IF NOT EXISTS en MySQL estándar (sí en MariaDB)
SET @idx := (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recurring_expenses' AND INDEX_NAME = 'idx_recurring_expenses_next');
SET @sql := IF(@idx = 0, 'CREATE INDEX idx_recurring_expenses_next ON recurring_expenses(next_date, status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
