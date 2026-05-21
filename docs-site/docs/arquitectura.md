---
id: arquitectura
sidebar_position: 2
title: Arquitectura
---

# Arquitectura de la aplicación

## Modelo cliente / servidor

Workly sigue una arquitectura **cliente-servidor clásica** con separación total entre frontend y backend. Ambas capas son aplicaciones independientes que se comunican mediante una **API REST con JSON**.

```
┌─────────────────────┐         HTTP/REST         ┌──────────────────────┐
│                     │ ◄─────────────────────────► │                      │
│   Frontend          │       JWT en cabecera       │   Backend (API)      │
│   React + Vite      │                             │   Express + MySQL    │
│   Puerto 5173       │                             │   Puerto 3000        │
└─────────────────────┘                             └──────────────┬───────┘
                                                                   │
                                                    ┌──────────────▼───────┐
                                                    │   MySQL              │
                                                    │   Base de datos      │
                                                    └──────────────────────┘
```

El frontend y el backend pueden desplegarse en servicios distintos (por ejemplo, Vercel para el frontend y Railway para el backend), conectados únicamente por la URL de la API configurada en variables de entorno.

---

## Separación frontend / backend

El repositorio es un **monorrepo** con dos carpetas raíz independientes:

```
workly-tfg/
├── frontend/     ← Aplicación React (Vite)
└── backend/      ← API REST (Express)
```

Cada una tiene su propio `package.json`, sus propias dependencias y sus propias variables de entorno. No existe acoplamiento de código entre ellas: el frontend accede al backend exclusivamente a través de peticiones HTTP.

---

## Lenguajes de programación

| Capa | Lenguaje | Versión mínima |
|---|---|---|
| Frontend | JavaScript (JSX) | ES2022+ |
| Backend | JavaScript (ESM) | Node.js ≥ 18 |
| Base de datos | SQL (MySQL) | MySQL ≥ 8.0 |

Ambas capas usan **ES Modules** (`"type": "module"` en `package.json`). No se usa TypeScript, pero sí ESLint en el frontend con las reglas de React Hooks y React Refresh.

---

## Versiones mínimas requeridas

| Herramienta | Versión mínima recomendada | Motivo |
|---|---|---|
| **Node.js** | 18 LTS | Soporte nativo de `fetch`, ESM estable |
| **npm** | 9+ | Workspaces y lockfile v3 |
| **MySQL** | 8.0 | Funciones de ventana, JSON, `WITH` (CTEs) |
| **React** | 19 | Versión usada en el proyecto |
| **Vite** | 7 | Bundler del frontend |
| **Express** | 5 | Async error handling nativo |

---

## Servicios externos utilizados

| Servicio | Propósito | Necesita cuenta |
|---|---|---|
| **Stripe** | Planes de suscripción (Free / Pro) | Sí |
| **Resend** | Envío de facturas por email | Sí |
| **Vercel** (opcional) | Hosting del frontend | Sí (gratuito) |
| **Railway** (opcional) | Hosting del backend + MySQL | Sí (gratuito limitado) |

---

## Diagrama de componentes principales

```
Frontend (React)
│
├── AuthContext         — Estado de sesión global (JWT, refresh automático)
├── ThemeContext         — Modo claro/oscuro
├── UIContext            — Notificaciones, modales globales
│
├── Pages/              — Una página por módulo (Dashboard, Clients, Invoices…)
├── Components/         — Componentes reutilizables (Sidebar, Modal, Forms…)
├── API/                — Funciones fetch agrupadas por recurso
└── Hooks/              — usePlanLimit (control de límites de plan)

Backend (Express)
│
├── Routes/             — Definición de endpoints por módulo
├── Controllers/        — Lógica de negocio de cada endpoint
├── Middlewares/        — authenticate, resolveCompany, checkLimit, requireFeature
├── Services/           — email.service, pdf.service, scheduler.service
├── Config/             — Conexión MySQL (pool), definición de planes
└── Utils/              — activityLogger
```
