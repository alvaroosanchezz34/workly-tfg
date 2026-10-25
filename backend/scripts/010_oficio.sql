-- Presupuesto en obra: enlace público, firma, fotos y catálogo por oficio.
-- Ejecutar una sola vez con node scripts/migrate.js

ALTER TABLE quotes
  ADD COLUMN public_token CHAR(64) NULL AFTER notes,
  ADD COLUMN signature_name VARCHAR(120) NULL AFTER public_token,
  ADD COLUMN signature_data MEDIUMTEXT NULL AFTER signature_name,
  ADD COLUMN accepted_at DATETIME NULL AFTER signature_data,
  ADD UNIQUE KEY uq_quote_public (public_token);

CREATE TABLE IF NOT EXISTS quote_photos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  quote_id   BIGINT NOT NULL,
  user_id    INT NOT NULL,
  caption    VARCHAR(120) NULL,
  image      MEDIUMTEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quote_photos_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

ALTER TABLE expenses
  ADD COLUMN receipt_image MEDIUMTEXT NULL AFTER receipt_url;

ALTER TABLE services
  ADD COLUMN trade VARCHAR(40) NULL AFTER unit;
