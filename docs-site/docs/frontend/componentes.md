---
id: componentes
sidebar_position: 2
title: Componentes principales
---

# Componentes del frontend

## Organización

Los componentes se dividen en dos grupos:

- **`src/pages/`** — Componentes de página completa, uno por ruta. Contienen lógica de negocio, llamadas a la API y estado local.
- **`src/components/`** — Componentes reutilizables y de presentación. Sin dependencia de rutas.

---

## Componentes de página más importantes

### `Dashboard.jsx`
Panel principal que muestra KPIs del negocio: ingresos del mes, facturas pendientes, proyectos activos y gastos. Incluye un componente `QuickActions` para acciones frecuentes y `OnboardingChecklist` para guiar a nuevos usuarios.

### `Invoices.jsx`
La página más compleja del proyecto. Gestiona cuatro pestañas:
- **Facturas** — listado, filtros, creación, descarga PDF, envío por email, pagos parciales.
- **Presupuestos** (`QuotesTab`) — listado y conversión a factura.
- **Facturas recurrentes** (`RecurringTab`) — gestión de plantillas periódicas.
- **Notas de crédito** (`CreditNotesTab`) — emisión de abonos.

También incluye el panel de estadísticas (`InvoiceStatsPanel`) visible solo en plan Pro.

### `Clients.jsx` / `ClientProfile.jsx`
`Clients.jsx` lista los clientes con búsqueda y paginación. `ClientProfile.jsx` es un mini-CRM que muestra en una sola pantalla toda la información del cliente: datos de contacto, historial de facturas, proyectos asociados, notas y métricas de facturación.

### `Projects.jsx`
Gestión de proyectos con vista de tarjetas. Permite crear, editar y eliminar proyectos, ver su estado (activo, pausado, completado) y el presupuesto asignado.

### `Accounting.jsx`
Resumen contable con gráficos de ingresos vs gastos por periodo, tabla de categorías de gasto y el beneficio neto calculado.

### `Team.jsx`
Gestión del equipo de empresa: invitación por email, asignación de roles, activación/suspensión de miembros y asignación de clientes/proyectos.

### `Billing.jsx`
Página de gestión del plan de suscripción. Muestra el plan actual, los límites consumidos y los botones para actualizar a Pro (mediante Stripe Checkout) o gestionar la suscripción (Stripe Customer Portal).

### `PublicInvoice.jsx`
Página pública accesible sin autenticación mediante un token de un solo uso. Muestra la factura en un formato legible para el cliente final, con opción de descarga en PDF.

---

## Componentes reutilizables más importantes

### `Sidebar.jsx`
Navegación lateral principal. Contiene los enlaces a todas las secciones, el indicador del plan actual, el toggle de tema y el acceso al perfil y logout. En mobile se colapsa en un menú hamburguesa.

### `Modal.jsx`
Modal genérico reutilizable. Acepta `isOpen`, `onClose` y `children`. Todos los formularios de creación/edición del app se muestran dentro de este componente.

### `InvoiceForm.jsx` / `InvoiceItems.jsx`
Formulario de creación y edición de facturas. `InvoiceItems.jsx` gestiona la tabla de líneas de factura con cálculo automático de subtotal, IVA y total en tiempo real.

### `GlobalSearch.jsx`
Buscador global accesible desde cualquier página (atajos de teclado). Busca simultáneamente en clientes, proyectos y facturas y navega directamente al resultado seleccionado.

### `NotificationsPanel.jsx`
Panel lateral deslizante que muestra notificaciones del sistema (facturas vencidas, invitaciones de equipo pendientes, etc.).

### `OnboardingChecklist.jsx`
Lista de tareas de bienvenida que guía al nuevo usuario por los primeros pasos: crear empresa, añadir cliente, crear factura, etc. Desaparece automáticamente cuando se completan todos los pasos.

### `UpgradeModal.jsx`
Modal que aparece cuando un usuario Free intenta usar una funcionalidad de plan Pro. Muestra las ventajas del plan Pro y un botón de upgrade.

### `Pagination.jsx`
Componente de paginación genérico usado en Clientes, Facturas, Gastos y Logs de actividad.

### `ChartCard.jsx` / `MetricCard.jsx`
Tarjetas de visualización. `MetricCard` muestra un KPI con icono, valor y variación. `ChartCard` envuelve un gráfico de Chart.js o Recharts en un contenedor con título y leyenda.

---

## Contextos (estado global)

### `AuthContext.jsx`
Contexto principal. Expone:
- `user` — datos del usuario autenticado.
- `login(token, refreshToken)` — almacena tokens y actualiza el estado.
- `logout()` — limpia la sesión.
- `refreshAccessToken()` — renueva el access token de forma transparente.

### `ThemeContext.jsx`
Expone `theme` (`'light'` | `'dark'`) y `toggleTheme()`. Persiste la preferencia en `localStorage`.

### `UIContext.jsx`
Expone métodos para mostrar notificaciones (`showNotification`) y controlar la visibilidad del panel de notificaciones.

---

## Hook personalizado

### `usePlanLimit.jsx`
Hook que recibe el tipo de recurso (`'clients'`, `'projects'`, `'invoices'`) y devuelve si el usuario ha alcanzado el límite de su plan. Usado en los botones de "Crear" para mostrar el `UpgradeModal` en lugar de abrir el formulario.
