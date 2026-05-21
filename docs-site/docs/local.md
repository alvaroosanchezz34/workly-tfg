---
id: local
sidebar_position: 6
title: Lanzamiento en local
---

# Lanzamiento en local

Esta sección explica cómo levantar Workly en tu máquina de desarrollo.

---

## Requisitos previos

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| **Node.js** | 18 LTS | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Incluido con Node.js |
| **MySQL** | 8.0 | [mysql.com](https://dev.mysql.com/downloads/) |

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/sanchezdevelop/workly-tfg.git
cd workly-tfg
```

---

## 2. Configurar la base de datos MySQL

### 2.1 Crear la base de datos y las tablas

Desde tu cliente MySQL (MySQL Workbench, TablePlus, terminal…):

```sql
CREATE DATABASE workly_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Luego ejecuta el script de creación de tablas incluido en el repositorio:

```bash
mysql -u root -p workly_db < backend/scripts/CREATEDATABASE.sql
```

Este script crea todas las tablas y relaciones necesarias. No contiene datos de prueba.

---

## 3. Configurar el backend

```bash
cd backend
cp .env.example .env
```

Edita el archivo `.env` con tus valores:

```env
# Entorno
NODE_ENV=development

# Servidor
PORT=3000

# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=workly_db

# JWT (genera strings aleatorios para producción)
JWT_SECRET=un_string_muy_largo_y_aleatorio
JWT_REFRESH_SECRET=otro_string_diferente_igual_de_secreto
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:5173

# Email (Resend) — necesario solo para enviar facturas por email
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Workly <noreply@tudominio.com>

# Rate limiting
RATE_LIMIT_MAX=500
RATE_LIMIT_AUTH_MAX=20
```

:::info Stripe (opcional en local)
Las variables de Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc.) solo son necesarias si quieres probar el flujo de pago en local. Sin ellas, la app funciona pero sin gestión de planes.
:::

### Instalar dependencias y arrancar

```bash
npm install
npm run dev
```

El backend arranca en `http://localhost:3000`. Puedes verificarlo en:

```bash
curl http://localhost:3000/api/health
# → { "status": "OK", "timestamp": "..." }
```

---

## 4. Configurar el frontend

```bash
cd ../frontend
cp .env.example .env
```

Edita el `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### Instalar dependencias y arrancar

```bash
npm install
npm run dev
```

El frontend arranca en `http://localhost:5173`.

---

## 5. Ejecutar los tests

Los tests de integración del backend requieren una base de datos MySQL activa:

```bash
cd backend
npm test
```

Para ver la cobertura:

```bash
npm run test:coverage
```

El proyecto incluye **59 tests** que cubren los módulos de autenticación, clientes, proyectos, facturas, presupuestos, gastos y empresa.

---

## API Keys necesarias

| Servicio | Para qué | Dónde obtenerla |
|---|---|---|
| **Resend** | Envío de facturas por email | [resend.com](https://resend.com) — plan gratuito disponible |
| **Stripe** | Planes de pago | [stripe.com](https://stripe.com) — modo test gratuito |

En desarrollo puedes trabajar sin Resend (el envío de email simplemente fallará sin errores críticos) y sin Stripe (el flujo de planes no funcionará, pero todo lo demás sí).

---

## Registro en servicios externos

No se necesita registro en ninguna consola de terceros para login social, ya que Workly no implementa OAuth social (Google, GitHub…). La autenticación es completamente propia (email + contraseña + JWT).
