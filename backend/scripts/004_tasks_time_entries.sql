-- migrations/004_tasks_time_entries.sql
-- Crea las tablas "tasks" y "time_entries", usadas por tasks.controller.js y
-- timeTracking.controller.js pero ausentes del script CREATEDATABASE.sql original.
-- Seguro de ejecutar en una base de datos ya existente (CREATE TABLE IF NOT EXISTS).

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

-- CREATE INDEX no soporta IF NOT EXISTS en MySQL estándar (sí en MariaDB),
-- así que comprobamos primero en information_schema para poder re-ejecutar
-- este script sin que falle por índice duplicado.
SET @idx := (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND INDEX_NAME = 'idx_tasks_project');
SET @sql := IF(@idx = 0, 'CREATE INDEX idx_tasks_project ON tasks(project_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND INDEX_NAME = 'idx_tasks_user');
SET @sql := IF(@idx = 0, 'CREATE INDEX idx_tasks_user ON tasks(user_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'time_entries' AND INDEX_NAME = 'idx_time_entries_user');
SET @sql := IF(@idx = 0, 'CREATE INDEX idx_time_entries_user ON time_entries(user_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'time_entries' AND INDEX_NAME = 'idx_time_entries_active');
SET @sql := IF(@idx = 0, 'CREATE INDEX idx_time_entries_active ON time_entries(user_id, stopped_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
