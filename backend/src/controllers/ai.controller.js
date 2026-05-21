// backend/src/controllers/ai.controller.js
import OpenAI from 'openai';
import { pool } from '../config/db.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────
// 1. RESUMEN AUTOMÁTICO DE NEGOCIO
//    GET /api/ai/summary
// ─────────────────────────────────────────────────────────────
export const getBusinessSummary = async (req, res) => {
    const userId = req.user.id;

    try {
        const now   = new Date();
        const year  = now.getFullYear();
        const month = now.getMonth() + 1;
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear  = month === 1 ? year - 1 : year;

        const [[thisMonth]] = await pool.query(
            `SELECT COALESCE(SUM(total_amount),0) AS income
             FROM invoices WHERE user_id=? AND status='paid'
             AND YEAR(issue_date)=? AND MONTH(issue_date)=? AND is_deleted=0`,
            [userId, year, month]
        );
        const [[lastMonth]] = await pool.query(
            `SELECT COALESCE(SUM(total_amount),0) AS income
             FROM invoices WHERE user_id=? AND status='paid'
             AND YEAR(issue_date)=? AND MONTH(issue_date)=? AND is_deleted=0`,
            [userId, prevYear, prevMonth]
        );
        const [[thisExpenses]] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) AS total
             FROM expenses WHERE user_id=?
             AND YEAR(date)=? AND MONTH(date)=? AND is_deleted=0`,
            [userId, year, month]
        );
        const [[lastExpenses]] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) AS total
             FROM expenses WHERE user_id=?
             AND YEAR(date)=? AND MONTH(date)=? AND is_deleted=0`,
            [userId, prevYear, prevMonth]
        );
        const [topClients] = await pool.query(
            `SELECT c.name, COALESCE(SUM(i.total_amount),0) AS total
             FROM clients c LEFT JOIN invoices i ON i.client_id=c.id
             AND i.status='paid' AND i.is_deleted=0
             WHERE c.user_id=? AND c.is_deleted=0
             GROUP BY c.id ORDER BY total DESC LIMIT 3`,
            [userId]
        );
        const [[overdueCount]] = await pool.query(
            `SELECT COUNT(*) AS total FROM invoices
             WHERE user_id=? AND status='overdue' AND is_deleted=0`,
            [userId]
        );
        const [expensesByCategory] = await pool.query(
            `SELECT category, SUM(amount) AS total FROM expenses
             WHERE user_id=? AND is_deleted=0 AND YEAR(date)=?
             GROUP BY category ORDER BY total DESC LIMIT 3`,
            [userId, year]
        );

        // MySQL puede devolver strings — convertir a Number
        const tmIncome  = Number(thisMonth.income   || 0);
        const lmIncome  = Number(lastMonth.income   || 0);
        const tmExpense = Number(thisExpenses.total  || 0);
        const lmExpense = Number(lastExpenses.total  || 0);

        const incomeDiff = lmIncome > 0
            ? (((tmIncome - lmIncome) / lmIncome) * 100).toFixed(1)
            : null;
        const expenseDiff = lmExpense > 0
            ? (((tmExpense - lmExpense) / lmExpense) * 100).toFixed(1)
            : null;

        const prompt = `Eres un asistente financiero para freelancers españoles. Analiza estos datos del negocio y genera un resumen ejecutivo en español, conciso (máximo 4 frases), en tono profesional pero cercano. Usa emojis con moderación. NO uses markdown, solo texto plano.

Datos:
- Ingresos este mes: ${tmIncome.toFixed(2)}€
- Ingresos mes anterior: ${lmIncome.toFixed(2)}€
- Variación ingresos: ${incomeDiff !== null ? incomeDiff + '%' : 'sin datos previos'}
- Gastos este mes: ${tmExpense.toFixed(2)}€
- Gastos mes anterior: ${lmExpense.toFixed(2)}€
- Variación gastos: ${expenseDiff !== null ? expenseDiff + '%' : 'sin datos previos'}
- Facturas vencidas sin cobrar: ${overdueCount.total}
- Top clientes: ${topClients.map(c => `${c.name} (${Number(c.total).toFixed(2)}€)`).join(', ') || 'sin datos'}
- Principales categorías de gasto: ${expensesByCategory.map(e => `${e.category} (${Number(e.total).toFixed(2)}€)`).join(', ') || 'sin datos'}

Genera el resumen:`;

        const completion = await openai.chat.completions.create({
            model:      'gpt-4o-mini',
            messages:   [{ role: 'user', content: prompt }],
            max_tokens: 250,
            temperature: 0.7,
        });

        res.json({ summary: completion.choices[0].message.content.trim() });

    } catch (err) {
        console.error('[AI/summary]', err.message);
        res.status(500).json({ message: 'Error al generar el resumen' });
    }
};

// ─────────────────────────────────────────────────────────────
// 2. GENERACIÓN DE LÍNEAS DE FACTURA CON IA
//    POST /api/ai/invoice-lines
//    body: { description: "Página web para restaurante + mantenimiento mensual" }
// ─────────────────────────────────────────────────────────────
export const generateInvoiceLines = async (req, res) => {
    const { description } = req.body;
    if (!description?.trim()) return res.status(400).json({ message: 'Descripción requerida' });

    try {
        const prompt = `Eres un experto en facturación para freelancers españoles. El usuario describe un trabajo y tú generas las líneas de factura correspondientes.

Trabajo descrito: "${description}"

Genera entre 1 y 5 líneas de factura en formato JSON. Responde SOLO con el JSON, sin texto adicional, sin markdown.

Formato exacto:
[
  {
    "description": "descripción profesional y clara del servicio",
    "quantity": 1,
    "unit_price": 0.00,
    "tax_rate": 21
  }
]

Reglas:
- Precios realistas para el mercado freelance español (€)
- IVA: 21% por defecto (usar 0% si es exportación o exento)
- Descripción profesional y detallada
- Si hay mantenimiento, crear línea separada
- Si hay horas, especificar "x horas" en description`;

        const completion = await openai.chat.completions.create({
            model:       'gpt-4o-mini',
            messages:    [{ role: 'user', content: prompt }],
            max_tokens:  500,
            temperature: 0.4,
        });

        const raw = completion.choices[0].message.content.trim()
            .replace(/```json|```/g, '').trim();
        const lines = JSON.parse(raw);

        // Calcular totales para cada línea
        const processed = lines.map((l, i) => ({
            id:          `ai_${Date.now()}_${i}`,
            description: l.description,
            quantity:    Number(l.quantity) || 1,
            unit_price:  Number(l.unit_price) || 0,
            tax_rate:    Number(l.tax_rate) ?? 21,
            subtotal:    Number(l.quantity) * Number(l.unit_price),
            tax_amount:  Number(l.quantity) * Number(l.unit_price) * Number(l.tax_rate) / 100,
            total:       Number(l.quantity) * Number(l.unit_price) * (1 + Number(l.tax_rate) / 100),
        }));

        res.json({ lines: processed });

    } catch (err) {
        console.error('[AI/invoice-lines]', err.message);
        res.status(500).json({ message: 'Error al generar las líneas' });
    }
};

// ─────────────────────────────────────────────────────────────
// 3. PRESUPUESTO INTELIGENTE
//    POST /api/ai/smart-quote
//    body: { client_id, project_type, description }
// ─────────────────────────────────────────────────────────────
export const generateSmartQuote = async (req, res) => {
    const { client_id, project_type, description } = req.body;
    if (!description?.trim()) return res.status(400).json({ message: 'Descripción requerida' });

    const userId = req.user.id;

    try {
        // Historial del cliente
        let clientHistory = '';
        if (client_id) {
            const [[client]] = await pool.query(
                `SELECT name FROM clients WHERE id=? AND user_id=?`, [client_id, userId]
            );
            const [[stats]] = await pool.query(
                `SELECT COUNT(*) AS total_invoices,
                        COALESCE(AVG(total_amount),0) AS avg_invoice,
                        COALESCE(SUM(total_amount),0) AS total_billed
                 FROM invoices WHERE client_id=? AND user_id=? AND is_deleted=0`,
                [client_id, userId]
            );
            if (client) {
                clientHistory = `Cliente: ${client.name}. Histórico: ${stats.total_invoices} facturas anteriores, media ${Number(stats.avg_invoice).toFixed(2)}€, total facturado ${Number(stats.total_billed).toFixed(2)}€.`;
            }
        }

        // Proyectos similares anteriores
        const [similar] = await pool.query(
            `SELECT title, budget FROM projects
             WHERE user_id=? AND is_deleted=0 AND budget > 0
             ORDER BY created_at DESC LIMIT 5`,
            [userId]
        );
        const similarStr = similar.length
            ? `Proyectos anteriores similares: ${similar.map(p => `${p.title} (${p.budget}€)`).join(', ')}`
            : '';

        const prompt = `Eres un consultor freelance experto en el mercado español. Analiza la siguiente información y genera una recomendación de presupuesto detallada.

${clientHistory}
${similarStr}
Tipo de proyecto: ${project_type || 'No especificado'}
Descripción: ${description}

Responde SOLO con JSON, sin texto adicional, sin markdown:
{
  "recommended_price": 0.00,
  "price_range": { "min": 0.00, "max": 0.00 },
  "estimated_days": 0,
  "rationale": "explicación breve del precio en español",
  "lines": [
    {
      "description": "descripción del servicio",
      "quantity": 1,
      "unit_price": 0.00,
      "tax_rate": 21
    }
  ],
  "tips": ["consejo 1 para este tipo de proyecto", "consejo 2"]
}`;

        const completion = await openai.chat.completions.create({
            model:       'gpt-4o-mini',
            messages:    [{ role: 'user', content: prompt }],
            max_tokens:  700,
            temperature: 0.4,
        });

        const raw = completion.choices[0].message.content.trim()
            .replace(/```json|```/g, '').trim();
        const result = JSON.parse(raw);

        // Procesar líneas
        result.lines = (result.lines || []).map((l, i) => ({
            id:          `ai_${Date.now()}_${i}`,
            description: l.description,
            quantity:    Number(l.quantity) || 1,
            unit_price:  Number(l.unit_price) || 0,
            tax_rate:    Number(l.tax_rate) ?? 21,
            subtotal:    Number(l.quantity) * Number(l.unit_price),
            tax_amount:  Number(l.quantity) * Number(l.unit_price) * Number(l.tax_rate) / 100,
            total:       Number(l.quantity) * Number(l.unit_price) * (1 + Number(l.tax_rate) / 100),
        }));

        res.json(result);

    } catch (err) {
        console.error('[AI/smart-quote]', err.message);
        res.status(500).json({ message: 'Error al generar el presupuesto' });
    }
};

// ─────────────────────────────────────────────────────────────
// 4. ASISTENTE FINANCIERO (CHAT)
//    POST /api/ai/chat
//    body: { message, history: [{role, content}] }
// ─────────────────────────────────────────────────────────────
export const financialChat = async (req, res) => {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Mensaje requerido' });

    const userId = req.user.id;

    try {
        // Contexto financiero del usuario
        const [[income]]   = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS t FROM invoices WHERE user_id=? AND status='paid' AND is_deleted=0 AND YEAR(issue_date)=YEAR(CURDATE())`, [userId]);
        const [[expenses]] = await pool.query(`SELECT COALESCE(SUM(amount),0) AS t FROM expenses WHERE user_id=? AND is_deleted=0 AND YEAR(date)=YEAR(CURDATE())`, [userId]);
        const [[pending]]  = await pool.query(`SELECT COALESCE(SUM(total_amount-paid_amount),0) AS t FROM invoices WHERE user_id=? AND status IN ('sent','overdue') AND is_deleted=0`, [userId]);
        const [[overdue]]  = await pool.query(`SELECT COUNT(*) AS c, COALESCE(SUM(total_amount-paid_amount),0) AS t FROM invoices WHERE user_id=? AND status='overdue' AND is_deleted=0`, [userId]);
        const [topClients] = await pool.query(`SELECT c.name, COALESCE(SUM(i.total_amount),0) AS total FROM clients c LEFT JOIN invoices i ON i.client_id=c.id AND i.status='paid' AND i.is_deleted=0 WHERE c.user_id=? AND c.is_deleted=0 GROUP BY c.id ORDER BY total DESC LIMIT 5`, [userId]);
        const [topExpCat]  = await pool.query(`SELECT category, SUM(amount) AS total FROM expenses WHERE user_id=? AND is_deleted=0 AND YEAR(date)=YEAR(CURDATE()) GROUP BY category ORDER BY total DESC`, [userId]);
        const [[clients]]  = await pool.query(`SELECT COUNT(*) AS c FROM clients WHERE user_id=? AND is_deleted=0`, [userId]);
        const [[projects]] = await pool.query(`SELECT COUNT(*) AS c FROM projects WHERE user_id=? AND is_deleted=0 AND status='active'`, [userId]);

        const systemPrompt = `Eres un asistente financiero personal para un freelancer español. Respondes en español, de forma concisa y útil. Tienes acceso a los datos reales del negocio del usuario.

DATOS ACTUALES DEL NEGOCIO (año en curso):
- Ingresos totales: ${Number(income.t).toFixed(2)}€
- Gastos totales: ${Number(expenses.t).toFixed(2)}€  
- Beneficio neto: ${(Number(income.t) - Number(expenses.t)).toFixed(2)}€
- Pendiente de cobro: ${Number(pending.t).toFixed(2)}€
- Facturas vencidas: ${overdue.c} facturas por ${Number(overdue.t).toFixed(2)}€
- Clientes activos: ${clients.c}
- Proyectos activos: ${projects.c}
- Top clientes por ingresos: ${topClients.map(c => `${c.name} (${Number(c.total).toFixed(2)}€)`).join(', ') || 'sin datos'}
- Gastos por categoría: ${topExpCat.map(e => `${e.category}: ${Number(e.total).toFixed(2)}€`).join(', ') || 'sin datos'}

Responde de forma breve y directa. Si el usuario pregunta sobre datos que no tienes, dilo claramente.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-6), // máximo 6 mensajes de historial
            { role: 'user', content: message },
        ];

        const completion = await openai.chat.completions.create({
            model:       'gpt-4o-mini',
            messages,
            max_tokens:  400,
            temperature: 0.6,
        });

        res.json({ reply: completion.choices[0].message.content.trim() });

    } catch (err) {
        console.error('[AI/chat]', err.message);
        res.status(500).json({ message: 'Error en el asistente' });
    }
};

// ─────────────────────────────────────────────────────────────
// 5. OCR DE TICKETS / FACTURAS
//    POST /api/ai/ocr-expense
//    body: { image } — base64 de la imagen
// ─────────────────────────────────────────────────────────────
export const ocrExpense = async (req, res) => {
    const { image, mime_type = 'image/jpeg' } = req.body;
    if (!image) return res.status(400).json({ message: 'Imagen requerida (base64)' });

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: `data:${mime_type};base64,${image}` },
                    },
                    {
                        type: 'text',
                        text: `Analiza este ticket o factura y extrae la información. Responde SOLO con JSON, sin texto adicional, sin markdown:
{
  "amount": 0.00,
  "tax_amount": 0.00,
  "tax_rate": 21,
  "date": "YYYY-MM-DD",
  "supplier": "nombre del proveedor o tienda",
  "description": "descripción breve del gasto",
  "category": "una de: software|hardware|oficina|transporte|marketing|formacion|servicios|otros",
  "confidence": "high|medium|low"
}

Si no puedes leer algún campo, pon null. La fecha debe ser en formato YYYY-MM-DD. El importe debe ser el TOTAL (con IVA).`,
                    },
                ],
            }],
            max_tokens:  300,
            temperature: 0.1,
        });

        const raw = completion.choices[0].message.content.trim()
            .replace(/```json|```/g, '').trim();
        const result = JSON.parse(raw);

        res.json(result);

    } catch (err) {
        console.error('[AI/ocr]', err.message);
        res.status(500).json({ message: 'Error al procesar la imagen' });
    }
};