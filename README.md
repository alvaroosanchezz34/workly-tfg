# 🟦 Workly — Plataforma de Gestión para Freelancers

> **Trabajo de Fin de Grado (TFG) — DAW**  
> Aplicación web full-stack para la gestión integral de la actividad profesional de freelancers y autónomos.

---

## 📌 Índice

- [🟦 Workly — Plataforma de Gestión para Freelancers](#-workly--plataforma-de-gestión-para-freelancers)
  - [📌 Índice](#-índice)
  - [✨ ¿Qué es Workly?](#-qué-es-workly)
  - [🚀 Funcionalidades implementadas](#-funcionalidades-implementadas)
    - [Gestión de entidades](#gestión-de-entidades)
    - [Funcionalidades transversales](#funcionalidades-transversales)
    - [Seguridad](#seguridad)
  - [🖥️ Stack tecnológico](#️-stack-tecnológico)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [Testing](#testing)
  - [📁 Estructura del proyecto](#-estructura-del-proyecto)
  - [⚙️ Instalación y arranque](#️-instalación-y-arranque)
    - [Requisitos previos](#requisitos-previos)
    - [1. Clonar el repositorio](#1-clonar-el-repositorio)
    - [2. Crear la base de datos](#2-crear-la-base-de-datos)
    - [3. Configurar variables de entorno](#3-configurar-variables-de-entorno)
    - [4. Instalar dependencias y arrancar](#4-instalar-dependencias-y-arrancar)
    - [5. Ejecutar los tests](#5-ejecutar-los-tests)
  - [🔑 Variables de entorno](#-variables-de-entorno)
    - [Backend — `.env`](#backend--env)
    - [Frontend — `.env`](#frontend--env)
  - [🗃️ Modelo de datos](#️-modelo-de-datos)
  - [🔐 Autenticación y seguridad](#-autenticación-y-seguridad)
    - [Flujo JWT](#flujo-jwt)
    - [Seguridad aplicada](#seguridad-aplicada)
  - [💳 Sistema de planes y billing](#-sistema-de-planes-y-billing)
  - [📋 Endpoints de la API](#-endpoints-de-la-api)
    - [Autenticación](#autenticación)
    - [Entidades principales (autenticadas)](#entidades-principales-autenticadas)
    - [Pública (sin autenticación)](#pública-sin-autenticación)
  - [🧪 Testing](#-testing)
  - [🎨 Design System](#-design-system)
  - [🛡️ Roles y permisos](#️-roles-y-permisos)
  - [🧹 Decisiones técnicas y clean code](#-decisiones-técnicas-y-clean-code)
  - [📄 Licencia](#-licencia)

---

## ✨ ¿Qué es Workly?

Workly es una herramienta **SaaS** orientada a profesionales independientes que necesitan centralizar su actividad laboral en un único panel. Permite gestionar clientes, proyectos, facturas con líneas de detalle, presupuestos, facturas recurrentes, notas de crédito, gastos por categoría y un catálogo de servicios con tarifas, todo protegido por un sistema de autenticación seguro con JWT.

El proyecto incluye además un sistema de **planes de suscripción** (Free / Pro / Business) integrado con Stripe, exportación de datos a Excel, envío de facturas por email, generación de PDFs, un módulo de contabilidad resumida, y soporte para **modo empresa** con varios miembros.

---

## 🚀 Funcionalidades implementadas

### Gestión de entidades

| Módulo | Funcionalidades |
|---|---|
| **Clientes** | CRUD completo, búsqueda en tiempo real, avatares con iniciales, soft delete, papelera de reciclaje (admin), restauración, perfil de cliente con historial |
| **Proyectos** | CRUD, vinculación con cliente, soft delete, estado (activo/completado/pausado) |
| **Facturas** | CRUD, líneas de detalle con subtotal/IVA/descuento, descarga PDF, envío por email (Pro), estados (borrador/enviada/pagada/vencida), factura pública sin login, número correlativo automático |
| **Presupuestos** | CRUD, conversión a factura en un clic, PDF descargable |
| **Facturas recurrentes** | Creación de plantillas con periodicidad, generación automática via scheduler (node-cron) |
| **Notas de crédito** | Vinculación a factura original, corrección de importes |
| **Gastos** | CRUD, categorización, soft delete |
| **Servicios** | Catálogo de tarifas propio del freelancer |
| **Empresa** | Setup de empresa, invitación de miembros, roles admin/técnico dentro de empresa |

### Funcionalidades transversales

- **Dashboard** — métricas financieras (ingresos totales, pendiente de cobro, gastos del mes, beneficio neto), gráfica de ingresos 12 meses, top clientes por facturación, acciones rápidas
- **Contabilidad** — resumen de ingresos vs gastos por período, saldo neto
- **Exportación Excel** — cualquier listado (clientes, facturas, gastos) exportable a `.xlsx` con ExcelJS
- **Búsqueda global** — barra de búsqueda transversal que consulta clientes, proyectos y facturas simultáneamente
- **Notificaciones** — panel de notificaciones in-app
- **Onboarding checklist** — guía de primeros pasos para usuarios nuevos
- **Registro de actividad** — audit trail de todas las acciones relevantes (solo admin)
- **Paginación** — paginación server-side en todos los listados
- **Cookie banner** — aviso de cookies con gestión de consentimiento
- **Páginas legales** — Privacidad, Estado del servicio
- **Landing page** — página de marketing con planes y CTA

### Seguridad

- Rate limiting global (500 req / 15 min) y específico en auth (20 req / 15 min) con `express-rate-limit`
- Headers de seguridad con `helmet`
- CORS restrictivo a orígenes permitidos
- Contraseñas hasheadas con `bcrypt`
- Validación de planes en middleware antes de ejecutar el controlador

---

## 🖥️ Stack tecnológico

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js + Express | ^5.2.1 | API REST, routing, middlewares |
| MySQL 2 | ^3.16.0 | Base de datos relacional con pool de conexiones |
| JSON Web Token | ^9.0.3 | Access token (30 min) + Refresh token (7 días) |
| bcrypt | ^6.0.0 | Hash seguro de contraseñas |
| PDFKit | ^0.17.2 | Generación de facturas y presupuestos en PDF |
| ExcelJS | ^4.4.0 | Exportación de datos a `.xlsx` |
| Resend | ^6.12.2 | Envío de emails transaccionales |
| Stripe | ^22.1.0 | Suscripciones, checkout, portal de facturación |
| node-cron | ^4.2.1 | Scheduler para facturas recurrentes |
| express-rate-limit | ^8.4.0 | Rate limiting por IP |
| helmet | ^8.1.0 | Headers HTTP de seguridad |
| morgan | ^1.10.1 | Logging de peticiones HTTP |
| dotenv | ^17.2.3 | Variables de entorno |

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | ^19.2.0 | Framework UI, hooks, contexto global |
| Vite | ^7.2.4 | Bundler + HMR en desarrollo |
| TailwindCSS | ^4.1.18 | Estilos utility-first |
| React Router DOM | ^7.12.0 | Enrutamiento SPA con rutas protegidas |
| Lucide React | ^0.562.0 | Iconos SVG |
| Chart.js + react-chartjs-2 | ^4.5.1 | Gráfica de ingresos mensuales |

### Testing

| Tecnología | Versión | Uso |
|---|---|---|
| Jest | ^29.7.0 | Framework de testing |
| Supertest | ^7.2.2 | Peticiones HTTP en tests de integración |

---

## 📁 Estructura del proyecto

```
workly-tfg/
├── backend/
│   ├── scripts/
│   │   └── CREATEDATABASE.sql          # Schema completo + datos de ejemplo
│   ├── src/
│   │   ├── app.js                      # Express: CORS, helmet, rate limit, rutas
│   │   ├── server.js                   # Punto de entrada HTTP
│   │   ├── config/
│   │   │   ├── db.js                   # Pool MySQL con mysql2/promise
│   │   │   └── plans.js                # Definición de planes Free/Pro/Business
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── clients.controller.js
│   │   │   ├── projects.controller.js
│   │   │   ├── invoices.controller.js
│   │   │   ├── quotes.controller.js
│   │   │   ├── creditNotes.controller.js
│   │   │   ├── recurringInvoices.controller.js
│   │   │   ├── expenses.controller.js
│   │   │   ├── services.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   ├── accounting.controller.js
│   │   │   ├── export.controller.js
│   │   │   ├── billing.controller.js
│   │   │   ├── company.controller.js
│   │   │   ├── users.controller.js
│   │   │   └── activityLogs.controller.js
│   │   ├── routes/                     # Un archivo de rutas por entidad
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js      # authenticate + isAdmin
│   │   │   ├── plan.middleware.js      # requireFeature + checkLimit
│   │   │   └── company.middleware.js   # resolveCompany + requireCompanyAdmin
│   │   ├── services/
│   │   │   ├── pdf.service.js          # Generación de PDFs con PDFKit
│   │   │   ├── email.service.js        # Plantillas y envío con Resend
│   │   │   └── scheduler.service.js    # Cron jobs para facturas recurrentes
│   │   ├── utils/
│   │   │   └── activityLogger.js       # Helper de audit trail
│   │   └── __tests__/
│   │       ├── auth.test.js
│   │       ├── auth.refresh.test.js
│   │       ├── clients.test.js
│   │       ├── company.test.js
│   │       ├── expenses.test.js
│   │       ├── invoices.test.js
│   │       ├── projects.test.js
│   │       └── quotes.test.js
│   ├── jest.config.js
│   └── package.json
│
└── frontend/
    └── src/
        ├── App.jsx                     # Router con PrivateRoute
        ├── main.jsx
        ├── index.css                   # Design system + tokens CSS
        ├── context/
        │   ├── AuthContext.jsx         # Estado global de autenticación
        │   └── fetchWithAuth.js        # Fetch con auto-refresh de token
        ├── api/                        # Funciones de llamada a la API por entidad
        ├── pages/
        │   ├── Landing.jsx
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Clients.jsx
        │   ├── ClientProfile.jsx
        │   ├── Projects.jsx
        │   ├── Invoices.jsx
        │   ├── Expenses.jsx
        │   ├── Services.jsx
        │   ├── Accounting.jsx
        │   ├── Billing.jsx
        │   ├── BillingSuccess.jsx
        │   ├── CompanySetup.jsx
        │   ├── Team.jsx
        │   ├── Profile.jsx
        │   ├── ActivityLogs.jsx        # Solo admin
        │   ├── DeletedClients.jsx      # Solo admin — papelera
        │   ├── PublicInvoice.jsx       # Vista pública sin login
        │   ├── Estado.jsx
        │   └── Privacidad.jsx
        └── components/
            ├── Sidebar.jsx
            ├── Modal.jsx
            ├── MetricCard.jsx
            ├── ChartCard.jsx
            ├── AlertBox.jsx
            ├── QuickActions.jsx
            ├── FormComponents.jsx      # Input, Select, Textarea reutilizables
            ├── ClientForm.jsx
            ├── ProjectForm.jsx
            ├── ExpenseForm.jsx
            ├── ServiceForm.jsx
            ├── InvoiceForm.jsx
            ├── InvoiceItems.jsx
            ├── Pagination.jsx
            ├── GlobalSearch.jsx
            ├── NotificationsPanel.jsx
            ├── OnboardingChecklist.jsx
            ├── UpgradeModal.jsx
            └── CookieBanner.jsx
```

---

## ⚙️ Instalación y arranque

### Requisitos previos

- Node.js >= 18
- MySQL 8
- npm >= 9

### 1. Clonar el repositorio

```bash
git clone https://github.com/tuusuario/workly-tfg.git
cd workly-tfg
```

### 2. Crear la base de datos

```bash
mysql -u root -p < backend/scripts/CREATEDATABASE.sql
```

### 3. Configurar variables de entorno

Copia los archivos `.env.example` y rellénalos (ver sección siguiente).

### 4. Instalar dependencias y arrancar

```bash
# Backend
cd backend
npm install
npm run dev          # Nodemon en puerto 4000

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev          # Vite en http://localhost:5173
```

### 5. Ejecutar los tests

```bash
cd backend
npm test             # Jest + Supertest
npm run test:coverage  # Con informe de cobertura
```

---

## 🔑 Variables de entorno

### Backend — `.env`

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=workly_db

# JWT
JWT_SECRET=clave_secreta_access_token
JWT_REFRESH_SECRET=clave_secreta_refresh_token

# Servidor
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Stripe (opcional para planes de pago)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...

# Resend (opcional para envío de emails)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@workly.space
```

### Frontend — `.env`

```env
VITE_API_URL=http://localhost:4000/api
```

---

## 🗃️ Modelo de datos

```
users
  ├── companies          (via company_members — rol admin/técnico)
  ├── clients            (user_id FK, soft delete)
  │     ├── projects     (client_id FK, soft delete)
  │     └── invoices     (client_id FK, soft delete)
  │           ├── invoice_items     (cascade delete)
  │           └── credit_notes      (invoice_id FK)
  ├── quotes             (user_id FK, soft delete)
  │     └── quote_items  (cascade delete)
  ├── recurring_invoices (user_id FK)
  ├── expenses           (user_id FK, soft delete)
  ├── services           (user_id FK, soft delete)
  └── activity_logs      (user_id FK, cascade delete)
```

Todas las entidades principales implementan **soft delete** mediante los campos `is_deleted`, `deleted_at` y `deleted_by`. Esto permite la restauración de registros y la papelera de reciclaje para administradores.

---

## 🔐 Autenticación y seguridad

### Flujo JWT

- `POST /api/auth/register` — Registro (role siempre forzado a `"user"` en backend)
- `POST /api/auth/login` — Devuelve `accessToken` (30 min) + `refreshToken` (7 días)
- `POST /api/auth/refresh` — Renueva el accessToken sin necesidad de relogin

El frontend gestiona el ciclo de vida del token de forma transparente mediante `fetchWithAuth.js`, que intercepta los errores 401 y renueva el token automáticamente con una **promesa compartida** (mutex) para evitar renovaciones paralelas en caso de múltiples peticiones concurrentes.

### Seguridad aplicada

| Medida | Implementación |
|---|---|
| Headers HTTP | `helmet` (CSP desactivado por compatibilidad con Vite) |
| Rate limiting general | 500 req / 15 min por IP |
| Rate limiting auth | 20 req / 15 min en `/api/auth` |
| CORS | Lista blanca de orígenes permitidos |
| Contraseñas | `bcrypt` con salt automático |
| Stripe webhook | Verificación de firma antes del JSON parser |
| Roles | Middleware `isAdmin` en rutas sensibles |
| Planes | Middleware `requireFeature` y `checkLimit` por recurso |

---

## 💳 Sistema de planes y billing

Workly implementa tres planes con límites enforceados en el backend mediante middleware:

| Plan | Precio | Clientes | Proyectos | Facturas/mes | Email | Excel | Recurrentes |
|---|---|---|---|---|---|---|---|
| **Free** | 0 €/mes | 5 | 3 | 10 | ✗ | ✗ | ✗ |
| **Pro** | 12,99 €/mes | ∞ | ∞ | ∞ | ✓ | ✓ | ✓ |
| **Business** | 24,99 €/mes | ∞ | ∞ | ∞ | ✓ | ✓ | ✓ |

El middleware `requireFeature(feature)` bloquea el acceso a funcionalidades no disponibles en el plan. El middleware `checkLimit(resource)` cuenta los registros existentes y devuelve `403` con `upgrade_required: true` si se supera el límite. El frontend muestra el componente `UpgradeModal` en respuesta a estos errores.

La integración con **Stripe** incluye:
- Creación de sesión de checkout
- Portal de gestión de suscripción
- Webhook de eventos (`customer.subscription.updated`, `invoice.paid`, etc.)

---

## 📋 Endpoints de la API

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login, devuelve tokens |
| POST | `/api/auth/refresh` | Renovar access token |

### Entidades principales (autenticadas)

| Módulo | Ruta base | Operaciones |
|---|---|---|
| Clientes | `/api/clients` | GET (paginado), POST, PUT, DELETE (soft), PATCH restore |
| Proyectos | `/api/projects` | GET, POST, PUT, DELETE (soft) |
| Facturas | `/api/invoices` | GET, POST, PUT, DELETE (soft), GET PDF, POST send email |
| Presupuestos | `/api/quotes` | GET, POST, PUT, DELETE, GET PDF, POST convert-to-invoice |
| Notas crédito | `/api/credit-notes` | GET, POST, PUT |
| Fact. recurrentes | `/api/recurring-invoices` | GET, POST, PUT, DELETE |
| Gastos | `/api/expenses` | GET, POST, PUT, DELETE (soft) |
| Servicios | `/api/services` | GET, POST, PUT, DELETE (soft) |
| Dashboard | `/api/dashboard` | GET métricas, ingresos mensuales, top clientes |
| Contabilidad | `/api/accounting` | GET resumen por período |
| Exportación | `/api/export` | GET Excel (clientes, facturas, gastos) |
| Empresa | `/api/company` | GET, POST setup, POST invite, gestión miembros |
| Usuario | `/api/users/me` | GET perfil, PUT actualizar |
| Actividad | `/api/activity-logs` | GET historial (solo admin) |
| Billing | `/api/billing` | GET plans, GET status, POST checkout, POST portal |

### Pública (sin autenticación)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/invoices/public/:token` | Vista pública de factura |
| GET | `/api/health` | Health check del servidor |

---

## 🧪 Testing

El backend cuenta con **8 suites de tests de integración** usando Jest + Supertest, con un total de ~1.400 líneas de test:

| Suite | Casos cubiertos |
|---|---|
| `auth.test.js` | Registro, login, validaciones, tokens |
| `auth.refresh.test.js` | Renovación de token, expiración, token inválido |
| `clients.test.js` | CRUD, soft delete, restauración, búsqueda |
| `company.test.js` | Setup de empresa, invitación, roles |
| `expenses.test.js` | CRUD, categorías, límites de plan |
| `invoices.test.js` | CRUD, líneas de detalle, PDF, estados |
| `projects.test.js` | CRUD, vinculación con cliente |
| `quotes.test.js` | CRUD, conversión a factura |

Cada suite levanta la aplicación Express completa con `supertest` y usa una base de datos de test aislada. Los tests cubren tanto el **happy path** como casos de error (401, 403, 404, 422).

```bash
npm test                # Ejecutar todos los tests
npm run test:coverage   # Con informe de cobertura HTML
```

---

## 🎨 Design System

El frontend usa un sistema de **tokens CSS** propio definido en `index.css`, coherente con la guía de marca de Workly:

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#1976D2` | Botones principales, links, foco de inputs |
| `--primary-dark` | `#1565C0` | Hover de botones |
| `--secondary` | `#4CAF50` | Éxito, ingresos, badges "Pagado" |
| `--warning` | `#FF9800` | Alertas, estados pendientes |
| `--error` | `#F44336` | Errores, borrado, facturas vencidas |
| `--bg` | `#F5F5F5` | Fondo general de la aplicación |
| `--card-bg` | `#FFFFFF` | Cards, tablas, modales |
| `--text` | `#212121` | Texto principal |
| `--text-secondary` | `#757575` | Texto secundario, placeholders |
| `--border` | `#E0E0E0` | Bordes de cards y inputs |
| Tipografía | `Inter` | Google Fonts, pesos 300–700 |
| Sidebar | `#121212` | Dark permanente |

Los componentes de formulario (`FormComponents.jsx`) son reutilizables y aplican los tokens de forma consistente en toda la aplicación.

---

## 🛡️ Roles y permisos

| Role | Acceso |
|---|---|
| `user` | Dashboard, Clientes, Proyectos, Facturas, Presupuestos, Gastos, Servicios, Contabilidad, Perfil, Configuración empresa |
| `admin` | Todo lo anterior + Registro de actividad + Papelera de clientes + Gestión global |

Dentro del **modo empresa**, existe además el rol de empresa:

| Rol empresa | Acceso |
|---|---|
| `admin` | Ve todos los registros de la empresa, gestiona miembros |
| `technician` | Ve únicamente sus propios registros dentro de la empresa |

---

## 🧹 Decisiones técnicas y clean code

- **Separación de responsabilidades** — cada capa (routes → middlewares → controllers → services) tiene un único propósito. Los controladores no contienen lógica de negocio compleja: la generación de PDFs, los emails y el scheduler están delegados en `services/`.
- **Middlewares reutilizables** — `requireFeature`, `checkLimit` y `resolveCompany` son funciones de orden superior que se componen en las rutas, evitando repetición de lógica de autorización en los controladores.
- **Soft delete uniforme** — todas las entidades usan el mismo patrón (`is_deleted`, `deleted_at`, `deleted_by`) con queries que filtran `WHERE is_deleted = 0` por defecto.
- **Pool de conexiones** — `mysql2/promise` con pool compartido en `config/db.js`, evitando conexiones nuevas por petición.
- **fetchWithAuth con mutex** — el cliente HTTP del frontend implementa un mutex de renovación de token para evitar N peticiones paralelas que generen N refresh simultáneos.
- **ESModules en backend** — el proyecto usa `"type": "module"` con imports/exports nativos en lugar de CommonJS.
- **Variables de entorno tipadas** — `plans.js` centraliza toda la configuración de límites, evitando magic numbers dispersos en los controladores.
- **Componentes UI reutilizables** — `FormComponents.jsx`, `Modal.jsx`, `MetricCard.jsx`, `Pagination.jsx` y `AlertBox.jsx` se usan en todas las páginas para mantener consistencia visual sin duplicar código.

---

## 📄 Licencia

Proyecto académico desarrollado como Trabajo de Fin de Grado — DAW.  
Autor: Álvaro Sánchez García · [sanchezdevelop.com](https://sanchezdevelop.com)  
Todos los derechos reservados.