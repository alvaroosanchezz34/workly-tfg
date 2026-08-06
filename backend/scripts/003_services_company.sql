-- migrations/003_services_company.sql
-- Añade soporte multi-empresa a "services", que se había quedado fuera
-- cuando se introdujo company_id en clients/projects/invoices/expenses/quotes/credit_notes/recurring_invoices

ALTER TABLE services
    ADD COLUMN IF NOT EXISTS company_id INT DEFAULT NULL AFTER user_id;

ALTER TABLE services
    ADD CONSTRAINT fk_services_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
