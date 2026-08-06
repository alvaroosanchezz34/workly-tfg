-- migrations/003_services_company.sql
-- Añade soporte multi-empresa a "services", que se había quedado fuera
-- cuando se introdujo company_id en clients/projects/invoices/expenses/quotes/credit_notes/recurring_invoices

-- Nota: si vuelves a ejecutar este script y la columna ya existe, MySQL
-- dará error de "Duplicate column" — es señal de que ya se aplicó, ignóralo.
ALTER TABLE services
    ADD COLUMN company_id INT DEFAULT NULL AFTER user_id;

ALTER TABLE services
    ADD CONSTRAINT fk_services_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
