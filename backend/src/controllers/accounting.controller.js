// backend/src/controllers/accounting.controller.js
import { pool } from '../config/db.js';

// ── GET /api/accounting/summary ───────────────────────────
// Resumen de ingresos y gastos por período
export const getSummary = async (req, res) => {
    const userId = req.user.id;
    const { year = new Date().getFullYear(), quarter } = req.query;

    let dateFilter = `AND YEAR(i.issue_date) = ?`;
    const params   = [userId, year];

    if (quarter) {
        const quarters = { '1': [1,3], '2': [4,6], '3': [7,9], '4': [10,12] };
        const [m1, m2] = quarters[quarter] || [1,12];
        dateFilter += ` AND MONTH(i.issue_date) BETWEEN ${m1} AND ${m2}`;
    }

    try {
        // Ingresos (facturas pagadas o enviadas)
        const [incomeRows] = await pool.query(
            `SELECT
               DATE_FORMAT(i.issue_date, '%Y-%m') AS month,
               SUM(i.subtotal_amount)             AS base_imponible,
               SUM(i.tax_amount)                  AS iva_repercutido,
               SUM(i.total_amount)                AS total_facturado,
               SUM(i.paid_amount)                 AS total_cobrado,
               COUNT(*)                           AS num_facturas
             FROM invoices i
             WHERE i.user_id = ? ${dateFilter}
               AND i.status IN ('sent','paid','overdue')
               AND i.is_deleted = 0
             GROUP BY month
             ORDER BY month ASC`,
            params
        );

        // Gastos
        const expParams = [userId, year];
        let expFilter   = `AND YEAR(e.date) = ?`;
        if (quarter) {
            const quarters = { '1': [1,3], '2': [4,6], '3': [7,9], '4': [10,12] };
            const [m1, m2] = quarters[quarter] || [1,12];
            expFilter += ` AND MONTH(e.date) BETWEEN ${m1} AND ${m2}`;
        }

        const [expenseRows] = await pool.query(
            `SELECT
               DATE_FORMAT(e.date, '%Y-%m') AS month,
               e.category,
               SUM(e.amount) AS total,
               COUNT(*)      AS num_gastos
             FROM expenses e
             WHERE e.user_id = ? ${expFilter}
               AND e.is_deleted = 0
             GROUP BY month, e.category
             ORDER BY month ASC`,
            expParams
        );

        // Totales globales
        const [[totalsIncome]] = await pool.query(
            `SELECT
               SUM(subtotal_amount) AS base_imponible,
               SUM(tax_amount)      AS iva_repercutido,
               SUM(total_amount)    AS total_facturado,
               SUM(paid_amount)     AS total_cobrado
             FROM invoices
             WHERE user_id = ? ${dateFilter}
               AND status IN ('sent','paid','overdue')
               AND is_deleted = 0`,
            params
        );

        const [[totalsExpense]] = await pool.query(
            `SELECT SUM(amount) AS total_gastos, COUNT(*) AS num_gastos
             FROM expenses WHERE user_id = ? ${expFilter} AND is_deleted = 0`,
            expParams
        );

        const baseImponible  = Number(totalsIncome?.base_imponible  || 0);
        const totalGastos    = Number(totalsExpense?.total_gastos    || 0);
        const ivaRepercutido = Number(totalsIncome?.iva_repercutido  || 0);

        res.json({
            period:   { year: Number(year), quarter: quarter ? Number(quarter) : null },
            income:   incomeRows,
            expenses: expenseRows,
            totals: {
                base_imponible:   baseImponible,
                iva_repercutido:  ivaRepercutido,
                total_facturado:  Number(totalsIncome?.total_facturado || 0),
                total_cobrado:    Number(totalsIncome?.total_cobrado   || 0),
                total_gastos:     totalGastos,
                beneficio_bruto:  baseImponible - totalGastos,
            },
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/accounting/modelo130 ─────────────────────────
// Datos para el modelo 130 (IRPF trimestral)
export const getModelo130 = async (req, res) => {
    const userId  = req.user.id;
    const { year = new Date().getFullYear(), quarter = Math.ceil((new Date().getMonth() + 1) / 3) } = req.query;

    const quarters = { '1': [1,3], '2': [4,6], '3': [7,9], '4': [10,12] };
    const [m1, m2] = quarters[quarter] || [1,3];

    try {
        // Ingresos del trimestre
        const [[trimIncome]] = await pool.query(
            `SELECT
               COALESCE(SUM(subtotal_amount), 0) AS ingresos,
               COALESCE(SUM(total_amount), 0)    AS ingresos_con_iva
             FROM invoices
             WHERE user_id = ? AND status IN ('sent','paid','overdue') AND is_deleted = 0
               AND YEAR(issue_date) = ? AND MONTH(issue_date) BETWEEN ? AND ?`,
            [userId, year, m1, m2]
        );

        // Gastos del trimestre
        const [[trimExpenses]] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS gastos
             FROM expenses
             WHERE user_id = ? AND is_deleted = 0
               AND YEAR(date) = ? AND MONTH(date) BETWEEN ? AND ?`,
            [userId, year, m1, m2]
        );

        // Ingresos acumulados del año (trimestres anteriores)
        const [[accumIncome]] = await pool.query(
            `SELECT COALESCE(SUM(subtotal_amount), 0) AS ingresos_acum
             FROM invoices
             WHERE user_id = ? AND status IN ('sent','paid','overdue') AND is_deleted = 0
               AND YEAR(issue_date) = ? AND MONTH(issue_date) < ?`,
            [userId, year, m1]
        );

        // Gastos acumulados
        const [[accumExpenses]] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS gastos_acum
             FROM expenses
             WHERE user_id = ? AND is_deleted = 0
               AND YEAR(date) = ? AND MONTH(date) < ?`,
            [userId, year, m1]
        );

        const ingresos      = Number(trimIncome.ingresos);
        const gastos        = Number(trimExpenses.gastos);
        const rendimiento   = ingresos - gastos;
        const ingresosAcum  = Number(accumIncome.ingresos_acum) + ingresos;
        const gastosAcum    = Number(accumExpenses.gastos_acum) + gastos;
        const rendimAcum    = ingresosAcum - gastosAcum;

        const TIPO_IRPF     = 0.20; // 20% tipo general
        const cuotaTrimestre = Math.max(0, rendimiento * TIPO_IRPF);
        const cuotaAcumulada = Math.max(0, rendimAcum * TIPO_IRPF);
        const ingresosAcuenta = cuotaAcumulada * 0.25; // Pago fraccionado

        res.json({
            modelo:    '130',
            year:      Number(year),
            quarter:   Number(quarter),
            trimestre: `${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m1-1]}-${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m2-1]}`,
            casillas: {
                // Datos del trimestre
                '01_ingresos':    ingresos,
                '02_gastos':      gastos,
                '03_rendimiento': rendimiento,
                // Datos acumulados
                '04_ingresos_acum':  ingresosAcum,
                '05_gastos_acum':    gastosAcum,
                '06_rendim_acum':    rendimAcum,
                // Cuota
                '07_tipo_irpf':   `${TIPO_IRPF * 100}%`,
                '08_cuota_acum':  cuotaAcumulada,
                '09_a_ingresar':  Math.max(0, cuotaTrimestre),
            },
            aviso: rendimiento < 0 ? 'El rendimiento neto es negativo. No hay cuota a ingresar este trimestre.' : null,
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/accounting/modelo303 ─────────────────────────
// Datos para el modelo 303 (IVA trimestral)
export const getModelo303 = async (req, res) => {
    const userId  = req.user.id;
    const { year = new Date().getFullYear(), quarter = Math.ceil((new Date().getMonth() + 1) / 3) } = req.query;

    const quarters = { '1': [1,3], '2': [4,6], '3': [7,9], '4': [10,12] };
    const [m1, m2] = quarters[quarter] || [1,3];

    try {
        // IVA repercutido (cobrado a clientes) por tipo
        const [ivaRepercutido] = await pool.query(
            `SELECT
               ii.tax_rate,
               SUM(ii.subtotal)   AS base_imponible,
               SUM(ii.tax_amount) AS cuota_iva
             FROM invoice_items ii
             JOIN invoices i ON i.id = ii.invoice_id
             WHERE i.user_id = ? AND i.is_deleted = 0 AND ii.is_deleted = 0
               AND i.status IN ('sent','paid','overdue')
               AND YEAR(i.issue_date) = ? AND MONTH(i.issue_date) BETWEEN ? AND ?
             GROUP BY ii.tax_rate
             ORDER BY ii.tax_rate DESC`,
            [userId, year, m1, m2]
        );

        // IVA soportado (pagado en gastos) — estimado al 21%
        const [[ivaSoportado]] = await pool.query(
            `SELECT
               COALESCE(SUM(amount), 0)                     AS total_gastos,
               COALESCE(SUM(amount * 0.21 / 1.21), 0)       AS cuota_iva_soportada,
               COALESCE(SUM(amount / 1.21), 0)              AS base_imponible
             FROM expenses
             WHERE user_id = ? AND is_deleted = 0
               AND YEAR(date) = ? AND MONTH(date) BETWEEN ? AND ?`,
            [userId, year, m1, m2]
        );

        const totalRepercutido = ivaRepercutido.reduce((s, r) => s + Number(r.cuota_iva), 0);
        const totalSoportado   = Number(ivaSoportado.cuota_iva_soportada);
        const resultadoNeto    = totalRepercutido - totalSoportado;

        res.json({
            modelo:    '303',
            year:      Number(year),
            quarter:   Number(quarter),
            trimestre: `${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m1-1]}-${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m2-1]}`,
            iva_repercutido: ivaRepercutido.map(r => ({
                tipo:            `${r.tax_rate}%`,
                base_imponible:  Number(r.base_imponible),
                cuota:           Number(r.cuota_iva),
            })),
            iva_soportado: {
                base_imponible: Number(ivaSoportado.base_imponible),
                cuota:          totalSoportado,
                nota:           'Estimado al 21% sobre gastos deducibles',
            },
            casillas: {
                '27_total_repercutido': totalRepercutido,
                '45_total_deducible':   totalSoportado,
                '46_resultado':         resultadoNeto,
                '69_a_ingresar':        Math.max(0, resultadoNeto),
                '71_a_devolver':        Math.max(0, -resultadoNeto),
            },
            aviso: resultadoNeto < 0 ? 'Resultado negativo: tienes derecho a compensar o solicitar devolución.' : null,
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/accounting/libro ─────────────────────────────
// Libro de ingresos y gastos completo
export const getLibro = async (req, res) => {
    const userId = req.user.id;
    const { year = new Date().getFullYear() } = req.query;

    try {
        const [ingresos] = await pool.query(
            `SELECT
               i.invoice_number   AS numero,
               i.issue_date       AS fecha,
               c.name             AS cliente,
               i.subtotal_amount  AS base_imponible,
               i.tax_amount       AS iva,
               i.total_amount     AS total,
               i.status
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             WHERE i.user_id = ? AND YEAR(i.issue_date) = ?
               AND i.status IN ('sent','paid','overdue')
               AND i.is_deleted = 0
             ORDER BY i.issue_date ASC`,
            [userId, year]
        );

        const [gastos] = await pool.query(
            `SELECT
               e.date        AS fecha,
               e.category    AS categoria,
               e.description AS concepto,
               e.amount      AS importe,
               e.receipt_url AS justificante
             FROM expenses e
             WHERE e.user_id = ? AND YEAR(e.date) = ?
               AND e.is_deleted = 0
             ORDER BY e.date ASC`,
            [userId, year]
        );

        const totalIngresos = ingresos.reduce((s, r) => s + Number(r.base_imponible), 0);
        const totalGastos   = gastos.reduce((s, r)   => s + Number(r.importe), 0);

        res.json({
            year:     Number(year),
            ingresos,
            gastos,
            resumen: {
                total_ingresos:  totalIngresos,
                total_gastos:    totalGastos,
                beneficio_neto:  totalIngresos - totalGastos,
                num_facturas:    ingresos.length,
                num_gastos:      gastos.length,
            },
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};