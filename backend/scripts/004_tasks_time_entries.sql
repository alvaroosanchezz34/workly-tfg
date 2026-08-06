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

CREATE INDEX IF NOT EXISTS idx_tasks_project       ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user          ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user   ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_active ON time_entries(user_id, stopped_at);
