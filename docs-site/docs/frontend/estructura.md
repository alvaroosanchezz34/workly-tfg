---
id: estructura
sidebar_position: 1
title: Estructura del proyecto
---

# Frontend — Estructura del proyecto

El frontend es una **Single Page Application (SPA)** construida con **React 19 + Vite 7**. El enrutado es del lado del cliente usando **React Router DOM v7**.

---

## Árbol de directorios

```
frontend/
├── public/                  # Assets estáticos públicos
├── src/
│   ├── api/                 # Funciones de llamada a la API (una por módulo)
│   │   ├── activityLogs.js
│   │   ├── clients.js
│   │   ├── company.js
│   │   ├── creditNotes.js
│   │   ├── dashboard.js
│   │   ├── expenses.js
│   │   ├── invoices.js
│   │   ├── projects.js
│   │   ├── quotes.js
│   │   ├── recurringInvoices.js
│   │   ├── services.js
│   │   └── users.js
│   │
│   ├── components/          # Componentes reutilizables
│   │   ├── invoice/         # Subcomponentes del módulo de facturas
│   │   ├── AlertBox.jsx
│   │   ├── ChartCard.jsx
│   │   ├── ClientForm.jsx
│   │   ├── CookieBanner.jsx
│   │   ├── ExpenseForm.jsx
│   │   ├── FormComponents.jsx
│   │   ├── GlobalSearch.jsx
│   │   ├── InvoiceForm.jsx
│   │   ├── InvoiceItems.jsx
│   │   ├── MetricCard.jsx
│   │   ├── Modal.jsx
│   │   ├── NotificationsPanel.jsx
│   │   ├── OnboardingChecklist.jsx
│   │   ├── Pagination.jsx
│   │   ├── ProjectForm.jsx
│   │   ├── QuickActions.jsx
│   │   ├── ServiceForm.jsx
│   │   ├── Sidebar.jsx
│   │   └── UpgradeModal.jsx
│   │
│   ├── context/             # Estado global (React Context)
│   │   ├── AuthContext.jsx       # Sesión, JWT, refresh automático
│   │   ├── ThemeContext.jsx      # Modo claro / oscuro
│   │   ├── UIContext.jsx         # Notificaciones y estado UI global
│   │   ├── fetchWithAuth.js      # Wrapper fetch con renovación de token
│   │   └── useTheme.js
│   │
│   ├── hooks/
│   │   └── usePlanLimit.jsx      # Control de límites de plan del usuario
│   │
│   ├── pages/               # Una página por ruta/módulo
│   │   ├── Accounting.jsx
│   │   ├── ActivityLogs.jsx
│   │   ├── Billing.jsx
│   │   ├── BillingSuccess.jsx
│   │   ├── ClientProfile.jsx
│   │   ├── Clients.jsx
│   │   ├── CompanySetup.jsx
│   │   ├── Dashboard.jsx
│   │   ├── DeletedClients.jsx
│   │   ├── Estado.jsx            # Página de estado del servicio
│   │   ├── Expenses.jsx
│   │   ├── Invoices.jsx
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Privacidad.jsx
│   │   ├── Profile.jsx
│   │   ├── Projects.jsx
│   │   ├── PublicInvoice.jsx     # Portal público de factura (sin auth)
│   │   ├── Register.jsx
│   │   ├── Services.jsx
│   │   └── Team.jsx
│   │
│   ├── App.jsx              # Router principal + PrivateRoute
│   ├── main.jsx             # Entry point de React
│   └── index.css            # Estilos globales + variables Tailwind
│
├── .env.example
├── package.json
└── vite.config.js
```

---

## Rutas de la aplicación

| Ruta | Página | Pública / Privada |
|---|---|---|
| `/` | Landing | Pública |
| `/login` | Login | Pública |
| `/register` | Register | Pública |
| `/privacidad` | Política de privacidad | Pública |
| `/estado` | Estado del servicio | Pública |
| `/p/:token` | Portal público de factura | Pública |
| `/dashboard` | Dashboard | **Privada** |
| `/clients` | Lista de clientes | **Privada** |
| `/clients/deleted` | Clientes eliminados | **Privada** |
| `/clients/:id` | Perfil de cliente | **Privada** |
| `/projects` | Proyectos | **Privada** |
| `/invoices` | Facturas | **Privada** |
| `/expenses` | Gastos | **Privada** |
| `/services` | Servicios/tarifas | **Privada** |
| `/profile` | Perfil del usuario | **Privada** |
| `/activity` | Registro de actividad | **Privada** |
| `/team` | Gestión del equipo | **Privada** |
| `/company/setup` | Configuración de empresa | **Privada** |
| `/billing` | Facturación / planes | **Privada** |
| `/billing/success` | Confirmación de pago | **Privada** |
| `/accounting` | Contabilidad | **Privada** |

Las rutas privadas están envueltas en un componente `PrivateRoute` que redirige al login si no hay sesión activa.

---

## Gestión del estado

No se usa ninguna librería de estado externo (Redux, Zustand…). El estado global se gestiona con **React Context** puro:

- **`AuthContext`**: Token, datos del usuario, funciones de login/logout y renovación automática del JWT.
- **`ThemeContext`**: Preferencia de tema (light/dark), persistida en `localStorage`.
- **`UIContext`**: Estado de modales globales y panel de notificaciones.

El estado local de cada página (listas, formularios, paginación) se gestiona con `useState` y `useEffect` dentro de cada componente de página.

---

## Comunicación con la API

Todos los módulos en `src/api/` exportan funciones que hacen `fetch` al backend. Estas funciones:

1. Añaden el header `Authorization: Bearer <token>` mediante `fetchWithAuth`.
2. Parsean la respuesta JSON.
3. Lanzan un error si el status HTTP no es 2xx.

La renovación del token (cuando la API devuelve 401) es transparente y está implementada en `fetchWithAuth.js`.
