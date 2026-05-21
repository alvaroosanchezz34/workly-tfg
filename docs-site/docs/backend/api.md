---
id: api
sidebar_position: 1
title: Endpoints de la API
---

# API REST — Endpoints

La API expone todos sus recursos bajo el prefijo `/api`. A continuación se documentan los endpoints agrupados por módulo.

:::info Base URL
- **Local:** `http://localhost:3000/api`
- **Producción:** `https://api.workly.space/api` *(o el dominio configurado)*
:::

---

## Autenticación (`/api/auth`)

Limitador de rate aplicado: **20 peticiones / 15 minutos** por IP.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Registro de nuevo usuario |
| `POST` | `/auth/login` | ❌ | Login, devuelve access token + refresh token |
| `POST` | `/auth/refresh` | ❌ | Renueva el access token usando el refresh token |

---

## Clientes (`/api/clients`)

| Método | Ruta | Auth | Plan | Descripción |
|---|---|---|---|---|
| `GET` | `/clients` | ✅ | Any | Listar clientes activos (paginado) |
| `POST` | `/clients` | ✅ | Free: máx 5 | Crear cliente |
| `GET` | `/clients/:id` | ✅ | Any | Obtener cliente por ID |
| `PUT` | `/clients/:id` | ✅ | Any | Actualizar cliente |
| `DELETE` | `/clients/:id` | ✅ | Any | Baja lógica (soft delete) |
| `GET` | `/clients/deleted` | ✅ | Any | Listar clientes eliminados |
| `PUT` | `/clients/:id/restore` | ✅ | Any | Restaurar cliente eliminado |

---

## Proyectos (`/api/projects`)

| Método | Ruta | Auth | Plan | Descripción |
|---|---|---|---|---|
| `GET` | `/projects` | ✅ | Any | Listar proyectos |
| `POST` | `/projects` | ✅ | Free: máx 3 | Crear proyecto |
| `GET` | `/projects/:id` | ✅ | Any | Obtener proyecto por ID |
| `PUT` | `/projects/:id` | ✅ | Any | Actualizar proyecto |
| `DELETE` | `/projects/:id` | ✅ | Any | Eliminar proyecto |

---

## Facturas (`/api/invoices`)

| Método | Ruta | Auth | Plan | Descripción |
|---|---|---|---|---|
| `GET` | `/invoices` | ✅ | Any | Listar facturas (filtros, paginación) |
| `POST` | `/invoices` | ✅ | Free: máx 10/mes | Crear factura |
| `GET` | `/invoices/stats` | ✅ | **Pro+** | Estadísticas de facturación |
| `GET` | `/invoices/settings` | ✅ | Any | Obtener configuración de facturas |
| `PUT` | `/invoices/settings` | ✅ | Any | Actualizar configuración de facturas |
| `GET` | `/invoices/:id` | ✅ | Any | Obtener factura por ID |
| `PUT` | `/invoices/:id` | ✅ | Any | Actualizar factura |
| `DELETE` | `/invoices/:id` | ✅ | Any | Baja lógica |
| `PATCH` | `/invoices/:id/status` | ✅ | Any | Cambiar estado (draft/sent/paid…) |
| `GET` | `/invoices/:id/pdf` | ✅ | Any | Descargar PDF de la factura |
| `POST` | `/invoices/:id/send` | ✅ | **Pro+** | Enviar factura por email |
| `GET` | `/invoices/:id/payments` | ✅ | Any | Listar pagos de la factura |
| `POST` | `/invoices/:id/payments` | ✅ | Any | Registrar pago parcial |
| `DELETE` | `/invoices/:id/payments/:paymentId` | ✅ | Any | Eliminar pago |

---

## Presupuestos (`/api/quotes`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/quotes` | ✅ | Listar presupuestos |
| `POST` | `/quotes` | ✅ | Crear presupuesto |
| `GET` | `/quotes/:id` | ✅ | Obtener presupuesto |
| `PUT` | `/quotes/:id` | ✅ | Actualizar presupuesto |
| `DELETE` | `/quotes/:id` | ✅ | Eliminar presupuesto |
| `POST` | `/quotes/:id/convert` | ✅ | Convertir presupuesto a factura |

---

## Gastos (`/api/expenses`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/expenses` | ✅ | Listar gastos |
| `POST` | `/expenses` | ✅ | Crear gasto |
| `GET` | `/expenses/:id` | ✅ | Obtener gasto |
| `PUT` | `/expenses/:id` | ✅ | Actualizar gasto |
| `DELETE` | `/expenses/:id` | ✅ | Eliminar gasto |

---

## Notas de crédito (`/api/credit-notes`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/credit-notes` | ✅ | Listar notas de crédito |
| `POST` | `/credit-notes` | ✅ | Crear nota de crédito |
| `GET` | `/credit-notes/:id` | ✅ | Obtener nota de crédito |
| `PUT` | `/credit-notes/:id` | ✅ | Actualizar nota de crédito |
| `DELETE` | `/credit-notes/:id` | ✅ | Eliminar nota de crédito |

---

## Facturas recurrentes (`/api/recurring-invoices`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/recurring-invoices` | ✅ | Listar plantillas recurrentes |
| `POST` | `/recurring-invoices` | ✅ | Crear plantilla recurrente |
| `GET` | `/recurring-invoices/:id` | ✅ | Obtener plantilla |
| `PUT` | `/recurring-invoices/:id` | ✅ | Actualizar plantilla |
| `DELETE` | `/recurring-invoices/:id` | ✅ | Eliminar plantilla |

---

## Empresa y equipo (`/api/company`)

| Método | Ruta | Auth | Rol | Descripción |
|---|---|---|---|---|
| `GET` | `/company` | ✅ | Any | Obtener datos de la empresa |
| `POST` | `/company` | ✅ | Any | Crear empresa |
| `PUT` | `/company` | ✅ | Admin | Actualizar empresa |
| `GET` | `/company/team` | ✅ | Admin | Listar miembros del equipo |
| `POST` | `/company/team/invite` | ✅ | Admin | Invitar miembro por email |
| `PATCH` | `/company/team/:userId/role` | ✅ | Admin | Cambiar rol del miembro |
| `PATCH` | `/company/team/:userId/status` | ✅ | Admin | Activar/suspender miembro |
| `DELETE` | `/company/team/:userId` | ✅ | Admin | Eliminar miembro |
| `GET` | `/company/dashboard` | ✅ | Admin | Dashboard consolidado del equipo |
| `PATCH` | `/company/clients/:clientId/assign` | ✅ | Admin | Asignar cliente a miembro |
| `PATCH` | `/company/projects/:projectId/assign` | ✅ | Admin | Asignar proyecto a miembro |
| `POST` | `/company/invite/:token/accept` | ❌ | — | Aceptar invitación (enlace de email) |

---

## Servicios, usuarios, contabilidad y exportación

| Módulo | Prefijo | Descripción |
|---|---|---|
| Servicios/tarifas | `/api/services` | CRUD de tarifas reutilizables |
| Usuarios | `/api/users` | Perfil del usuario autenticado |
| Dashboard | `/api/dashboard` | KPIs y métricas del dashboard |
| Contabilidad | `/api/accounting` | Resumen de ingresos, gastos y beneficio |
| Exportación | `/api/export` | Exportación a Excel |
| Logs de actividad | `/api/activity-logs` | Historial de acciones del usuario |

---

## Billing (`/api/billing`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/billing/plans` | ❌ | Lista de planes disponibles |
| `GET` | `/billing/status` | ✅ | Estado de suscripción del usuario |
| `POST` | `/billing/checkout` | ✅ | Crear sesión de pago en Stripe |
| `POST` | `/billing/portal` | ✅ | Acceder al portal de cliente de Stripe |
| `POST` | `/billing/webhook` | ❌ (Stripe firma) | Webhook de eventos de Stripe |

---

## Health check

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servidor (`{ status: "OK", timestamp }`) |

---

## Portal público

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/p/:token` | ❌ | Página pública de factura (acceso por token) |

> Esta ruta es una ruta del **frontend**, no del backend. El token se genera en el backend y el frontend lo renderiza en `/p/:token`.
