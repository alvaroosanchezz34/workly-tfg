// backend/src/controllers/accounting.controller.js
import { pool } from '../config/db.js';

const num = v => Number(v || 0);

const getQuarterMonths = q => ({ '1': [1,3], '2': [4,6], '3': [7,9], '4': [10,12] }[q] || [1,12]);

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ── GET /api/accounting/summary ───────────────────────────
export const getSummary = async (req, res) => {
    const userId  = req.user.id;
    const year    = parseInt(req.query.year)    || new Date().getFullYear();
    const quarter = req.query.quarter ? parseInt(req.query.quarter) : null;

    try {
        // Construir filtro de fecha
        let invWhere = `i.user_id = ? AND YEAR(i.issue_date) = ? AND i.status IN ('sent','paid','overdue') AND i.is_deleted = 0`;
        let expWhere = `e.user_id = ? AND YEAR(e.date) = ? AND e.is_deleted = 0`;
        const invParams = [userId, year];
        const expParams = [userId, year];

        if (quarter) {
            const [m1, m2] = getQuarterMonths(String(quarter));
            invWhere += ` AND MONTH(i.issue_date) BETWEEN ? AND ?`;
            expWhere += ` AND MONTH(e.date) BETWEEN ? AND ?`;
            invParams.push(m1, m2);
            expParams.push(m1, m2);
        }

        const [incomeRows] = await pool.query(
            `SELECT DATE_FORMAT(i.issue_date,'%Y-%m') AS month,
                    COALESCE(SUM(i.subtotal_amount),0) AS base_imponible,
                    COALESCE(SUM(i.tax_amount),0)      AS iva_repercutido,
                    COALESCE(SUM(i.total_amount),0)    AS total_facturado,
                    COALESCE(SUM(i.paid_amount),0)     AS total_cobrado,
                    COUNT(*) AS num_facturas
             FROM invoices i WHERE ${invWhere}
             GROUP BY month ORDER BY month ASC`,
            invParams
        );

        const [[totalsIncome]] = await pool.query(
            `SELECT COALESCE(SUM(subtotal_amount),0) AS base_imponible,
                    COALESCE(SUM(tax_amount),0)      AS iva_repercutido,
                    COALESCE(SUM(total_amount),0)    AS total_facturado,
                    COALESCE(SUM(paid_amount),0)     AS total_cobrado
             FROM invoices i WHERE ${invWhere}`,
            invParams
        );

        const [[totalsExpense]] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) AS total_gastos, COUNT(*) AS num_gastos
             FROM expenses e WHERE ${expWhere}`,
            expParams
        );

        const baseImponible  = num(totalsIncome?.base_imponible);
        const totalGastos    = num(totalsExpense?.total_gastos);
        const ivaRepercutido = num(totalsIncome?.iva_repercutido);

        res.json({
            period:   { year, quarter },
            income:   incomeRows,
            totals: {
                base_imponible:   baseImponible,
                iva_repercutido:  ivaRepercutido,
                total_facturado:  num(totalsIncome?.total_facturado),
                total_cobrado:    num(totalsIncome?.total_cobrado),
                total_gastos:     totalGastos,
                beneficio_bruto:  baseImponible - totalGastos,
            },
        });
    } catch (err) {
        console.error('[accounting/summary]', err.message);
        res.status(500).json({ message: err.message });
    }
};

// ── GET /api/accounting/modelo130 ─────────────────────────
export const getModelo130 = async (req, res) => {
    const userId  = req.user.id;
    const year    = parseInt(req.query.year)    || new Date().getFullYear();
    const quarter = parseInt(req.query.quarter) || Math.ceil((new Date().getMonth() + 1) / 3);
    const [m1, m2] = getQuarterMonths(String(quarter));

    try {
        const [[trimIncome]] = await pool.query(
            `SELECT COALESCE(SUM(subtotal_amount),0) AS ingresos
             FROM invoices
             WHERE user_id=? AND status IN ('sent','paid','overdue') AND is_deleted=0
               AND YEAR(issue_date)=? AND MONTH(issue_date) BETWEEN ? AND ?`,
            [userId, year, m1, m2]
        );
        const [[trimExpenses]] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) AS gastos
             FROM expenses WHERE user_id=? AND is_deleted=0 AND YEAR(date)=? AND MONTH(date) BETWEEN ? AND ?`,
            [userId, year, m1, m2]
        );
        const [[accumIncome]] = await pool.query(
            `SELECT COALESCE(SUM(subtotal_amount),0) AS ingresos_acum
             FROM invoices
             WHERE user_id=? AND status IN ('sent','paid','overdue') AND is_deleted=0
               AND YEAR(issue_date)=? AND MONTH(issue_date) < ?`,
            [userId, year, m1]
        );
        const [[accumExpenses]] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) AS gastos_acum
             FROM expenses WHERE user_id=? AND is_deleted=0 AND YEAR(date)=? AND MONTH(date) < ?`,
            [userId, year, m1]
        );

        const ingresos     = num(trimIncome.ingresos);
        const gastos       = num(trimExpenses.gastos);
        const rendimiento  = ingresos - gastos;
        const ingresosAcum = num(accumIncome.ingresos_acum) + ingresos;
        const gastosAcum   = num(accumExpenses.gastos_acum) + gastos;
        const rendimAcum   = ingresosAcum - gastosAcum;
        const TIPO         = 0.20;
        const cuotaAcum    = Math.max(0, rendimAcum * TIPO);
        const cuotaTrim    = Math.max(0, rendimiento * TIPO);

        res.json({
            modelo: '130', year, quarter,
            trimestre: `${MONTH_SHORT[m1-1]}–${MONTH_SHORT[m2-1]}`,
            casillas: {
                '01 Ingresos trimestre':     ingresos,
                '02 Gastos trimestre':       gastos,
                '03 Rendimiento trimestre':  rendimiento,
                '04 Ingresos acumulados':    ingresosAcum,
                '05 Gastos acumulados':      gastosAcum,
                '06 Rendimiento acumulado':  rendimAcum,
                '08 Cuota acumulada (20%)':  cuotaAcum,
                '09 A ingresar (trimestre)': cuotaTrim,
            },
            aviso: rendimiento < 0 ? 'Rendimiento negativo: no hay cuota a ingresar este trimestre.' : null,
        });
    } catch (err) {
        console.error('[accounting/modelo130]', err.message);
        res.status(500).json({ message: err.message });
    }
};

// ── GET /api/accounting/modelo303 ─────────────────────────
export const getModelo303 = async (req, res) => {
    const userId  = req.user.id;
    const year    = parseInt(req.query.year)    || new Date().getFullYear();
    const quarter = parseInt(req.query.quarter) || Math.ceil((new Date().getMonth() + 1) / 3);
    const [m1, m2] = getQuarterMonths(String(quarter));

    try {
        const [ivaRepRows] = await pool.query(
            `SELECT ii.tax_rate,
                    COALESCE(SUM(ii.subtotal),0)   AS base_imponible,
                    COALESCE(SUM(ii.tax_amount),0) AS cuota_iva
             FROM invoice_items ii
             JOIN invoices i ON i.id = ii.invoice_id
             WHERE i.user_id=? AND i.is_deleted=0 AND ii.is_deleted=0
               AND i.status IN ('sent','paid','overdue')
               AND YEAR(i.issue_date)=? AND MONTH(i.issue_date) BETWEEN ? AND ?
             GROUP BY ii.tax_rate ORDER BY ii.tax_rate DESC`,
            [userId, year, m1, m2]
        );

        const [[gastosSop]] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) AS total
             FROM expenses WHERE user_id=? AND is_deleted=0 AND YEAR(date)=? AND MONTH(date) BETWEEN ? AND ?`,
            [userId, year, m1, m2]
        );

        const totalRep  = ivaRepRows.reduce((s, r) => s + num(r.cuota_iva), 0);
        const totalGast = num(gastosSop.total);
        const ivaEst    = totalGast * 0.21 / 1.21; // IVA estimado en gastos al 21%
        const resultado = totalRep - ivaEst;

        res.json({
            modelo: '303', year, quarter,
            trimestre: `${MONTH_SHORT[m1-1]}–${MONTH_SHORT[m2-1]}`,
            iva_repercutido: ivaRepRows.map(r => ({
                tipo:           `${r.tax_rate}%`,
                base_imponible: num(r.base_imponible),
                cuota:          num(r.cuota_iva),
            })),
            iva_soportado: {
                base_imponible: Math.round(totalGast / 1.21 * 100) / 100,
                cuota:          Math.round(ivaEst * 100) / 100,
                nota:           'Estimado al 21% sobre total gastos',
            },
            casillas: {
                '27 IVA repercutido total': totalRep,
                '45 IVA deducible total':   Math.round(ivaEst * 100) / 100,
                '46 Resultado':             Math.round(resultado * 100) / 100,
                '69 A ingresar':            Math.max(0, Math.round(resultado * 100) / 100),
                '71 A devolver':            Math.max(0, Math.round(-resultado * 100) / 100),
            },
            aviso: resultado < 0 ? 'Resultado negativo: tienes derecho a compensar o solicitar devolución a Hacienda.' : null,
        });
    } catch (err) {
        console.error('[accounting/modelo303]', err.message);
        res.status(500).json({ message: err.message });
    }
};

// ── GET /api/accounting/libro ─────────────────────────────
export const getLibro = async (req, res) => {
    const userId = req.user.id;
    const year   = parseInt(req.query.year) || new Date().getFullYear();

    try {
        const [ingresos] = await pool.query(
            `SELECT i.invoice_number AS numero,
                    i.issue_date     AS fecha,
                    c.name           AS cliente,
                    COALESCE(i.subtotal_amount,0) AS base_imponible,
                    COALESCE(i.tax_amount,0)      AS iva,
                    COALESCE(i.total_amount,0)    AS total,
                    i.status
             FROM invoices i JOIN clients c ON c.id = i.client_id
             WHERE i.user_id=? AND YEAR(i.issue_date)=?
               AND i.status IN ('sent','paid','overdue') AND i.is_deleted=0
             ORDER BY i.issue_date ASC`,
            [userId, year]
        );

        const [gastos] = await pool.query(
            `SELECT date AS fecha, category AS categoria,
                    description AS concepto, amount AS importe
             FROM expenses
             WHERE user_id=? AND YEAR(date)=? AND is_deleted=0
             ORDER BY date ASC`,
            [userId, year]
        );

        const totalIngresos = ingresos.reduce((s, r) => s + num(r.base_imponible), 0);
        const totalGastos   = gastos.reduce((s, r)   => s + num(r.importe), 0);

        res.json({
            year,
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
    } catch (err) {
        console.error('[accounting/libro]', err.message);
        res.status(500).json({ message: err.message });
    }
};