---
id: despliegue
sidebar_position: 7
title: Despliegue en la nube
---

# Despliegue en la nube

Workly se puede desplegar con el siguiente esquema recomendado:

| Capa | Servicio | Plan gratuito |
|---|---|---|
| Frontend | **Vercel** | ✅ |
| Backend | **Railway** | ✅ (limitado) |
| Base de datos | **Railway (MySQL)** o **PlanetScale** | ✅ |

---

## Frontend — Vercel

### Pasos

1. Haz push del repositorio a GitHub.
2. Ve a [vercel.com](https://vercel.com) y crea un nuevo proyecto importando el repositorio.
3. En la configuración del proyecto, establece:
   - **Root directory:** `frontend`
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Añade la variable de entorno:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://tu-backend.railway.app/api` |

5. Pulsa **Deploy**.

Vercel desplegará automáticamente en cada push a la rama `main`.

---

## Backend — Railway

### Pasos

1. Ve a [railway.app](https://railway.app) y crea un nuevo proyecto.
2. Añade un servicio **desde GitHub** apuntando a la carpeta `backend`.
3. Añade un servicio de **MySQL** en el mismo proyecto (Railway lo provisiona automáticamente).
4. Configura las variables de entorno del backend:

| Variable | Descripción |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (Railway lo asigna automáticamente) |
| `DB_HOST` | Host de MySQL proporcionado por Railway |
| `DB_PORT` | Puerto MySQL (normalmente `3306`) |
| `DB_USER` | Usuario MySQL de Railway |
| `DB_PASSWORD` | Contraseña MySQL de Railway |
| `DB_NAME` | Nombre de la base de datos |
| `DB_CONNECTION_LIMIT` | `10` |
| `JWT_SECRET` | String aleatorio largo y secreto |
| `JWT_REFRESH_SECRET` | Otro string distinto y secreto |
| `JWT_EXPIRES_IN` | `30m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | URL de Vercel (sin barra final) |
| `RESEND_API_KEY` | API key de Resend |
| `EMAIL_FROM` | `Workly <noreply@tudominio.com>` |
| `STRIPE_SECRET_KEY` | API key de Stripe (modo live) |
| `STRIPE_WEBHOOK_SECRET` | Secret del webhook de Stripe |
| `RATE_LIMIT_MAX` | `500` |
| `RATE_LIMIT_AUTH_MAX` | `20` |

5. En **Settings → Deploy**, establece el **Start command:** `npm start`.

### Inicializar la base de datos

La primera vez, ejecuta el script SQL desde el panel de Railway o con un cliente MySQL local conectado al host remoto:

```bash
mysql -h tu-host.railway.app -P 3306 -u usuario -p workly_db < backend/scripts/CREATEDATABASE.sql
```

---

## Variables de entorno — Resumen completo

### Backend (`.env`)

```env
NODE_ENV=production
PORT=3000

DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=workly_db
DB_CONNECTION_LIMIT=10

JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=https://workly.vercel.app

RESEND_API_KEY=re_...
EMAIL_FROM=Workly <noreply@tudominio.com>

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

RATE_LIMIT_MAX=500
RATE_LIMIT_AUTH_MAX=20
```

### Frontend (`.env`)

```env
VITE_API_URL=https://tu-backend.railway.app/api
```

---

## Despliegue continuo

Tanto **Vercel** como **Railway** se integran directamente con GitHub y despliegan automáticamente en cada push a la rama `main`. No se necesita configuración adicional de CI/CD.

El flujo es:

```
git push origin main
       ↓
  GitHub recibe el push
       ↓
  Vercel (frontend) + Railway (backend) detectan el cambio
       ↓
  Build automático + deploy en ~1-2 min
```

---

## Configurar el webhook de Stripe en producción

1. En el dashboard de Stripe → **Webhooks**, crea un nuevo endpoint:
   - **URL:** `https://tu-backend.railway.app/api/billing/webhook`
   - **Eventos:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
2. Copia el **Signing secret** y ponlo en `STRIPE_WEBHOOK_SECRET`.
