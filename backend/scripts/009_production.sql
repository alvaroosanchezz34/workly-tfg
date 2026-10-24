-- Preparación para producción: sesión revocable, lista de espera y cierre de cuenta.
-- Ejecutar una sola vez, o dejar que lo haga `node scripts/migrate.js`.

ALTER TABLE users
  ADD COLUMN deleted_at DATETIME NULL AFTER last_login,
  ADD COLUMN anonymized_at DATETIME NULL AFTER deleted_at;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_hash (token_hash),
  INDEX idx_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  profession  VARCHAR(120) NULL,
  city        VARCHAR(80) NULL,
  consent     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_waitlist_email (email)
);
