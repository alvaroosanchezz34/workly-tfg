import { pool } from '../config/db.js';

export const getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1️⃣ Ingresos totales (facturas pagadas)
        const [[income]] = await pool.query(
            `SELECT IFNULL(SUM(total_amount), 0) AS total
       FROM invoices
       WHERE user_id = ? AND status = 'paid'`,
            [userId]
        );

        // 2️⃣ Gastos totales
        const [[expenses]] = await pool.query(
            `SELECT IFNULL(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = ?`,
            [userId]
        );

        // 3️⃣ Facturas pendientes
        const [[pendingInvoices]] = await pool.query(
            `SELECT COUNT(*) AS total
       FROM invoices
       WHERE user_id = ? AND status = 'pending'`,
            [userId]
        );

        // 4️⃣ Ingresos por mes
        const [monthlyIncome] = await pool.query(
            `SELECT 
        DATE_FORMAT(issue_date, '%Y-%m') AS month,
        SUM(total_amount) AS total
       FROM invoices
       WHERE user_id = ? AND status = 'paid'
       GROUP BY month
       ORDER BY month`,
            [userId]
        );

        // 5️⃣ Gastos por categoría
        const [expensesByCategory] = await pool.query(
            `SELECT category, SUM(amount) AS total
       FROM expenses
       WHERE user_id = ?
       GROUP BY category`,
            [userId]
        );

        res.json({
            income: income.total,
            expenses: expenses.total,
            profit: income.total - expenses.total,
            pendingInvoices: pendingInvoices.total,
            monthlyIncome,
            expensesByCategory
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
