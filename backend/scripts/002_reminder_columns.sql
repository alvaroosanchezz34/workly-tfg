-- migrations/002_reminder_columns.sql
-- Añade columnas para rastrear los nuevos recordatorios del scheduler

-- Aviso previo a vencimiento de factura (3 días y 1 día antes)
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS upcoming_reminder_at DATETIME DEFAULT NULL
        COMMENT 'Última vez que se envió aviso previo al vencimiento';

-- Aviso de presupuesto próximo a expirar
ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS expiry_reminder_at DATETIME DEFAULT NULL
        COMMENT 'Última vez que se envió aviso de expiración próxima';

-- Índices para que el scheduler no haga full scan
CREATE INDEX IF NOT EXISTS idx_invoices_upcoming_reminder
    ON invoices (status, due_date, upcoming_reminder_at, is_deleted);

CREATE INDEX IF NOT EXISTS idx_quotes_expiry_reminder
    ON quotes (status, expiry_date, expiry_reminder_at, is_deleted);
