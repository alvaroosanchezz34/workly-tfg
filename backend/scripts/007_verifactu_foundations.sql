-- Fase 1 VeriFactu: cimientos que no dependen del proveedor.
-- Ejecutar una sola vez sobre una base ya creada con CREATEDATABASE.sql.
-- Una instalación nueva ya trae estos cambios dentro de CREATEDATABASE.sql:
-- no hace falta lanzar este script encima.

-- Domicilio del cliente. Hace falta en la factura completa.
ALTER TABLE clients
  ADD COLUMN address TEXT NULL AFTER document;

-- Perfil fiscal de quien emite. Una fila por autónomo o por empresa.
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

-- Contador por emisor, serie y año. El número oficial sale de aquí al emitir.
CREATE TABLE IF NOT EXISTS invoice_series (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  issuer_key   VARCHAR(40) NOT NULL,
  series_code  VARCHAR(20) NOT NULL,
  year         INT         NOT NULL,
  next_number  INT         NOT NULL DEFAULT 1,
  padding      INT         NOT NULL DEFAULT 4,
  UNIQUE KEY uq_invoice_series (issuer_key, series_code, year)
);

-- El número deja de ser único en toda la base. Pasa a serlo por emisor y serie.
-- Los borradores pueden tener el número vacío hasta que se emiten.
ALTER TABLE invoices DROP INDEX invoice_number;

ALTER TABLE invoices
  MODIFY invoice_number VARCHAR(50) NULL,
  MODIFY status ENUM('draft','sent','paid','overdue','void') DEFAULT 'draft',
  ADD COLUMN issuer_key VARCHAR(40) NULL AFTER company_id,
  ADD COLUMN series_code VARCHAR(20) NULL AFTER invoice_prefix,
  ADD COLUMN invoice_kind ENUM('complete','simplified') NOT NULL DEFAULT 'complete' AFTER notes,
  ADD COLUMN invoice_type ENUM('normal','rectificativa') NOT NULL DEFAULT 'normal' AFTER invoice_kind,
  ADD COLUMN rectification_method ENUM('substitution','difference') NULL AFTER invoice_type,
  ADD COLUMN rectifies_invoice_id BIGINT NULL AFTER rectification_method,
  ADD COLUMN rectified_by_invoice_id BIGINT NULL AFTER rectifies_invoice_id,
  ADD COLUMN equivalence_surcharge_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER tax_amount,
  ADD COLUMN irpf_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER equivalence_surcharge_amount,
  ADD COLUMN irpf_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER irpf_rate,
  ADD COLUMN issuer_legal_name VARCHAR(200) NULL AFTER public_token,
  ADD COLUMN issuer_tax_id VARCHAR(20) NULL AFTER issuer_legal_name,
  ADD COLUMN issuer_fiscal_address TEXT NULL AFTER issuer_tax_id,
  ADD COLUMN customer_legal_name VARCHAR(200) NULL AFTER issuer_fiscal_address,
  ADD COLUMN customer_tax_id VARCHAR(32) NULL AFTER customer_legal_name,
  ADD COLUMN customer_fiscal_address TEXT NULL AFTER customer_tax_id,
  ADD COLUMN issued_at DATETIME NULL AFTER customer_fiscal_address,
  ADD COLUMN voided_at DATETIME NULL AFTER issued_at,
  ADD COLUMN void_reason TEXT NULL AFTER voided_at,
  ADD COLUMN verifactu_status VARCHAR(40) NULL AFTER void_reason,
  ADD COLUMN verifactu_external_id VARCHAR(100) NULL AFTER verifactu_status,
  ADD COLUMN verifactu_qr_url TEXT NULL AFTER verifactu_external_id,
  ADD COLUMN verifactu_legend VARCHAR(120) NULL AFTER verifactu_qr_url;

ALTER TABLE invoices
  ADD UNIQUE KEY uq_invoice_issuer_series_number (issuer_key, series_code, invoice_number);

ALTER TABLE invoice_items
  ADD COLUMN equivalence_surcharge_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER tax_rate,
  ADD COLUMN equivalence_surcharge_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER tax_amount;

-- Rellena el emisor de las facturas que ya existían y arranca el contador
-- por encima del último número, para no reutilizarlo.
UPDATE invoices
SET issuer_key = IF(company_id IS NOT NULL, CONCAT('company:', company_id), CONCAT('user:', user_id)),
    series_code = COALESCE(NULLIF(invoice_prefix, ''), 'FAC')
WHERE issuer_key IS NULL;

INSERT INTO invoice_series (issuer_key, series_code, year, next_number, padding)
SELECT issuer_key, series_code, invoice_year, COALESCE(MAX(invoice_seq), 0) + 1, 4
FROM invoices
WHERE invoice_number IS NOT NULL AND issuer_key IS NOT NULL AND invoice_year IS NOT NULL
GROUP BY issuer_key, series_code, invoice_year;

-- Borrar un usuario o un cliente ya no puede llevarse por delante una factura.
ALTER TABLE invoices DROP FOREIGN KEY fk_invoices_user;
ALTER TABLE invoices DROP FOREIGN KEY fk_invoices_client;
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE invoice_items DROP FOREIGN KEY fk_invoice_items_invoice;
ALTER TABLE invoice_items
  ADD CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;

ALTER TABLE invoice_payments DROP FOREIGN KEY fk_payments_invoice;
ALTER TABLE invoice_payments
  ADD CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;

ALTER TABLE credit_notes DROP FOREIGN KEY fk_cn_invoice;
ALTER TABLE credit_notes
  ADD CONSTRAINT fk_cn_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;

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
