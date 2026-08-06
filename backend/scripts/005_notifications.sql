-- migrations/005_notifications.sql
-- Notificaciones persistentes en BD — sustituyen a las que se calculaban solo
-- en el cliente (se perdían al recargar y "marcar leído" no se guardaba).

CREATE TABLE IF NOT EXISTS notifications (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,

  type         ENUM('overdue','warning','info') NOT NULL DEFAULT 'info',
  entity_type  VARCHAR(30) NOT NULL,   -- 'invoice' | 'project'
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

-- CREATE INDEX no soporta IF NOT EXISTS en MySQL estándar (sí en MariaDB)
SET @idx := (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_notifications_user_unread');
SET @sql := IF(@idx = 0, 'CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
