-- VeriFactu en casa: cadena de huella, cola de envío, certificados y representación.
-- Ejecutar una sola vez sobre una base que ya tiene 007_verifactu_foundations.sql.
-- Una instalación nueva usa CREATEDATABASE.sql y no debe lanzar este script.

ALTER TABLE invoices
  ADD COLUMN rectification_code VARCHAR(2) DEFAULT NULL AFTER rectification_method;

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
