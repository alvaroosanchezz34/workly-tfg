# 🟦 Workly — Plataforma de Gestión para Freelancers

> Trabajo de Fin de Grado (TFG) — Aplicación web full-stack para la gestión integral de la actividad profesional de freelancers y autónomos.

---

## ✨ ¿Qué es Workly?

Workly es una herramienta SaaS orientada a profesionales independientes que necesitan centralizar su trabajo en un único panel. Permite gestionar clientes, proyectos, facturas con líneas de detalle, gastos por categoría y un catálogo de servicios con tarifas, todo protegido por un sistema de autenticación seguro con JWT.

---

## 🖥️ Demo visual

| Dashboard | Clientes | Facturas |
|---|---|---|
| Métricas financieras, gráfica de ingresos 12 meses, top clientes | CRUD con búsqueda en tiempo real y avatares | Filtros por estado, descarga PDF, total acumulado |

---

## 🚀 Stack tecnológico

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js + Express | ^5.2.1 | API REST, routing, middlewares |
| MySQL 2 | ^3.16.0 | Base de datos relacional con pool de conexiones |
| JSON Web Token | ^9.0.3 | Access token (30 min) + Refresh token (7 días) |
| bcrypt | ^6.0.0 | Hash seguro de contraseñas |
| PDFKit | ^0.17.2 | Generación de facturas en PDF |
| dotenv | ^17.2.3 | Variables de entorno |

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | ^19.2.0 | Framework UI, hooks, contexto |
| Vite | ^7.2.4 | Bundler + HMR en desarrollo |
| TailwindCSS | ^4.1.18 | Estilos utility-first |
| React Router DOM | ^7.12.0 | Enrutamiento SPA con rutas protegidas |
| Lucide React | ^0.562.0 | Iconos SVG |
| Chart.js + react-chartjs-2 | ^4.5.1 | Gráfica de ingresos mensuales |

---

## 📁 Estructura del proyecto

```
workly-tfg/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Configuración Express, CORS, middlewares
│   │   ├── server.js               # Punto de entrada
│   │   ├── config/
│   │   │   └── db.js               # Pool MySQL con mysql2/promise
│   │   ├── controllers/            # Lógica de negocio por entidad
│   │   │   ├── auth.controller.js
│   │   │   ├── clients.controller.js
│   │   │   ├── projects.controller.js
│   │   │   ├── invoices.controller.js
│   │   │   ├── expenses.controller.js
│   │   │   ├── services.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   ├── users.controller.js
│   │   │   └── activityLogs.controller.js
│   │   ├── routes/                 # Definición de endpoints (mismo patrón)
│   │   ├── middlewares/
│   │   │   └── auth.middleware.js  # verifyToken + isAdmin
│   │   ├── services/
│   │   │   └── pdf.service.js      # Generación de PDFs con PDFKit
│   │   └── utils/
│   │       └── activityLogger.js   # Audit trail de acciones
│   ├── scripts/
│   │   └── CREATEDATABASE.sql      # Schema completo de la BD
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx                 # Router con PrivateRoute
    │   ├── main.jsx
    │   ├── index.css               # Design system + tokens CSS
    │   ├── context/
    │   │   ├── AuthContext.jsx     # Estado global de autenticación
    │   │   └── fetchWithAuth.js    # Fetch con auto-refresh de token
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Clients.jsx
    │   │   ├── Projects.jsx
    │   │   ├── Invoices.jsx
    │   │   ├── Expenses.jsx
    │   │   ├── Services.jsx
    │   │   ├── Profile.jsx
    │   │   ├── ActivityLogs.jsx    # Solo admin
    │   │   └── DeletedClients.jsx  # Solo admin — papelera
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   ├── Modal.jsx
    │   │   ├── MetricCard.jsx
    │   │   ├── ChartCard.jsx
    │   │   ├── AlertBox.jsx
    │   │   ├── QuickActions.jsx
    │   │   ├── FormComponents.jsx  # Input, Select, Textarea reutilizables
    │   │   ├── ClientForm.jsx
    │   │   ├── ProjectForm.jsx
    │   │   ├── ExpenseForm.jsx
    │   │   ├── ServiceForm.jsx
    │   │   ├── InvoiceForm.jsx
    │   │   └── InvoiceItems.jsx
    │   └── api/                    # Funciones de llamada a la API por entidad
    └── package.json
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

**Backend** — copia `.env.example` a `.env` y rellena:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=workly_db

JWT_SECRET=clave_secreta_access_token
JWT_REFRESH_SECRET=clave_secreta_refresh_token

PORT=4000
```

**Frontend** — copia `.env.example` a `.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

### 4. Instalar dependencias y arrancar

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (en otra terminal)
cd frontend && npm install && npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## 🗃️ Modelo de datos

```
users
  ├── clients         (user_id FK, soft delete)
  │     └── projects  (client_id FK, soft delete)
  │           └── invoices (project_id FK nullable, soft delete)
  │                 └── invoice_items (invoice_id FK, cascade delete)
  ├── expenses        (user_id FK, soft delete)
  ├── services        (user_id FK, soft delete)
  └── activity_logs   (user_id FK, cascade delete)
```

Todas las entidades principales implementan **soft delete** mediante los campos `is_deleted`, `deleted_at` y `deleted_by`.

---

## 🔐 Autenticación

- `POST /api/auth/register` — Registro (role siempre forzado a `"user"`)
- `POST /api/auth/login` — Login, devuelve `accessToken` (30 min) + `refreshToken` (7 días)
- `POST /api/auth/refresh` — Renueva el accessToken sin necesidad de relogin

El frontend gestiona el ciclo de vida del token de forma transparente mediante `fetchWithAuth.js`, que intercepta los errores 401 y renueva el token automáticamente con una promesa compartida para evitar renovaciones en paralelo.

---

## 📋 Endpoints principales

| Módulo | Ruta base | Operaciones |
|---|---|---|
| Auth | `/api/auth` | register, login, refresh |
| Clientes | `/api/clients` | CRUD + soft delete + restore (admin) |
| Proyectos | `/api/projects` | CRUD + soft delete |
| Facturas | `/api/invoices` | CRUD + descarga PDF |
| Gastos | `/api/expenses` | CRUD + soft delete |
| Servicios | `/api/services` | CRUD + soft delete |
| Dashboard | `/api/dashboard` | Métricas, ingresos mensuales, top clientes |
| Usuario | `/api/users/me` | Perfil propio, actualización |
| Actividad | `/api/activity-logs` | Historial de acciones (admin) |

---

## 🎨 Design System

El frontend usa un sistema de tokens CSS propio con la guía de marca de Workly:

| Token | Color | Uso |
|---|---|---|
| `--primary` | `#1976D2` | Botones, links, foco de inputs |
| `--secondary` | `#4CAF50` | Éxito, ingresos, badges pagado |
| `--warning` | `#FF9800` | Alertas, pendientes |
| `--error` | `#F44336` | Errores, borrado, vencidas |
| `--bg` | `#F5F5F5` | Fondo general |
| `--card-bg` | `#FFFFFF` | Cards, tablas, modales |
| Tipografía | `Inter` | Google Fonts, 300–700 |
| Sidebar | `#121212` | Dark siempre |

---

## 🛡️ Roles de usuario

| Role | Acceso |
|---|---|
| `user` | Dashboard, Clientes, Proyectos, Facturas, Gastos, Servicios, Perfil |
| `admin` | Todo lo anterior + Registro de actividad + Clientes eliminados (papelera) |

---

## 📄 Licencia

Proyecto académico desarrollado como Trabajo de Fin de Grado. Todos los derechos reservados.