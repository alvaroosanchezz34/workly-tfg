import { pool } from '../config/db.js';

export const getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1️⃣ Ingresos totales (facturas pagadas, no eliminadas)
        const [[income]] = await pool.query(
            `SELECT IFNULL(SUM(total_amount), 0) AS total
             FROM invoices
             WHERE user_id = ? AND status = 'paid' AND is_deleted = 0`,
            [userId]
        );

        // 2️⃣ Gastos totales (no eliminados)
        const [[expenses]] = await pool.query(
            `SELECT IFNULL(SUM(amount), 0) AS total
             FROM expenses
             WHERE user_id = ? AND is_deleted = 0`,
            [userId]
        );

        // 3️⃣ Facturas pendientes — FIX: usar IN() en lugar de || (operador lógico)
        const [[pendingInvoices]] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM invoices
             WHERE user_id = ?
               AND status IN ('sent', 'draft')
               AND is_deleted = 0`,
            [userId]
        );

        // 4️⃣ Facturas vencidas
        const [[overdueInvoices]] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM invoices
             WHERE user_id = ?
               AND status = 'overdue'
               AND is_deleted = 0`,
            [userId]
        );

        // 5️⃣ Ingresos por mes (últimos 12 meses)
        const [monthlyIncome] = await pool.query(
            `SELECT
               DATE_FORMAT(issue_date, '%Y-%m') AS month,
               SUM(total_amount) AS total
             FROM invoices
             WHERE user_id = ?
               AND status = 'paid'
               AND is_deleted = 0
               AND issue_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
             GROUP BY month
             ORDER BY month ASC`,
            [userId]
        );

        // 6️⃣ Gastos por categoría
        const [expensesByCategory] = await pool.query(
            `SELECT category, SUM(amount) AS total
             FROM expenses
             WHERE user_id = ? AND is_deleted = 0
             GROUP BY category
             ORDER BY total DESC`,
            [userId]
        );

        // 7️⃣ Top 3 clientes por ingresos
        const [topClients] = await pool.query(
            `SELECT c.name, IFNULL(SUM(i.total_amount), 0) AS total
             FROM clients c
             LEFT JOIN invoices i
               ON i.client_id = c.id AND i.status = 'paid' AND i.is_deleted = 0
             WHERE c.user_id = ? AND c.is_deleted = 0
             GROUP BY c.id, c.name
             ORDER BY total DESC
             LIMIT 3`,
            [userId]
        );

        // 8️⃣ Proyectos por estado
        const [projectsByStatus] = await pool.query(
            `SELECT status, COUNT(*) AS total
             FROM projects
             WHERE user_id = ? AND is_deleted = 0
             GROUP BY status`,
            [userId]
        );

        res.json({
            income: income.total,
            expenses: expenses.total,
            profit: income.total - expenses.total,
            pendingInvoices: pendingInvoices.total,
            overdueInvoices: overdueInvoices.total,
            monthlyIncome,
            expensesByCategory,
            topClients,
            projectsByStatus,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};