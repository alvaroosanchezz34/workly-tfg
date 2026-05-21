---
id: autenticacion
sidebar_position: 2
title: Autenticación y roles
---

# Autenticación y roles

## Mecanismo: JWT con Access Token + Refresh Token

Workly usa **JSON Web Tokens (JWT)** como único mecanismo de autenticación. No hay login social (Google, GitHub…) ni sesiones en servidor.

El flujo es el siguiente:

```
1. POST /api/auth/login  →  { accessToken, refreshToken }
2. Peticiones protegidas  →  Authorization: Bearer <accessToken>
3. POST /api/auth/refresh →  { accessToken }  (cuando el access expira)
```

### Tiempos de expiración

| Token | Expiración por defecto | Variable de entorno |
|---|---|---|
| Access Token | 30 minutos | `JWT_EXPIRES_IN` |
| Refresh Token | 7 días | `JWT_REFRESH_EXPIRES_IN` |

### Renovación automática en el frontend

El `AuthContext` del frontend detecta automáticamente las respuestas `401` e intenta renovar el access token llamando a `/api/auth/refresh` antes de reintentar la petición fallida. Si el refresh también falla, el usuario es redirigido al login.

El módulo `fetchWithAuth.js` centraliza esta lógica para todas las llamadas a la API.

---

## Middleware `authenticate`

Todas las rutas protegidas pasan por el middleware `authenticate` (en `src/middlewares/auth.middleware.js`). Este middleware:

1. Lee el header `Authorization: Bearer <token>`.
2. Verifica la firma del JWT con `JWT_SECRET`.
3. **Consulta la base de datos en cada petición** para leer el plan, rol y estado actual del usuario (el JWT puede estar desactualizado si el plan cambió tras el login).
4. Adjunta el objeto `req.user` con los datos frescos y llama a `next()`.

```js
// Ejemplo de req.user disponible en los controladores
req.user = {
  id: 42,
  email: 'usuario@email.com',
  role: 'admin',          // 'admin' | 'member'
  plan: 'pro',            // 'free' | 'pro'
  plan_status: 'active',
  company_id: 7,
}
```

---

## Roles de usuario

Workly tiene dos roles dentro de una empresa:

| Rol | Descripción |
|---|---|
| `admin` | Propietario o administrador de la empresa. Acceso total. Puede invitar miembros, cambiar roles y ver el dashboard de equipo. |
| `member` | Colaborador. Acceso a los recursos que el admin le haya asignado. |

El rol se aplica a través del middleware `requireCompanyAdmin`, que rechaza las peticiones de miembros que intentan acceder a rutas de administración.

---

## Planes y límites

Workly tiene dos planes de suscripción gestionados a través de **Stripe**:

| Característica | Free | Pro |
|---|---|---|
| Clientes | Máx. 5 | Ilimitado |
| Proyectos | Máx. 3 | Ilimitado |
| Facturas | Máx. 10 / mes | Ilimitado |
| Estadísticas de facturación | ❌ | ✅ |
| Envío de facturas por email | ❌ | ✅ |
| Exportación Excel | ❌ | ✅ |
| Equipo / miembros | ❌ | ✅ |

Los límites se controlan en el middleware `checkLimit` y `requireFeature` (`src/middlewares/plan.middleware.js`). Si un usuario Free intenta superar un límite, recibe una respuesta `403` con un mensaje que le invita a actualizar su plan.

---

## Flujo de invitación de equipo

1. El admin llama a `POST /api/company/team/invite` con el email del nuevo miembro.
2. El backend genera un token de invitación y envía un email con un enlace (`/company/invite/:token/accept`).
3. El invitado hace clic en el enlace y acepta la invitación (endpoint público `POST /api/company/invite/:token/accept`).
4. El usuario queda vinculado a la empresa con rol `member`.

---

## Seguridad adicional

- **Helmet:** Cabeceras HTTP de seguridad (HSTS, X-Frame-Options, etc.).
- **CORS:** Whitelist explícita de orígenes permitidos (`FRONTEND_URL`, `workly.space`).
- **Rate limiting:** 500 peticiones / 15 min (general) y 20 / 15 min (rutas de auth).
- **Bcrypt:** Las contraseñas se almacenan hasheadas con bcrypt (≥ 12 rounds).
- **Stripe Webhook:** El endpoint del webhook valida la firma de Stripe con `stripe.webhooks.constructEvent` antes de procesar cualquier evento.
