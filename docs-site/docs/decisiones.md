---
id: decisiones
sidebar_position: 9
title: Decisiones de diseño
---

# Decisiones de diseño

Esta sección recoge las decisiones técnicas y de arquitectura más relevantes del proyecto, junto con el razonamiento que las motivó.

---

## 1. JWT con verificación en base de datos en cada petición

**Decisión:** El middleware `authenticate` no confía ciegamente en el payload del JWT; en cada petición hace una consulta a MySQL para leer el plan, rol y estado actual del usuario.

**Motivo:** El JWT puede quedar desactualizado si el usuario cambia de plan (free → pro) después de haberse autenticado. Confiar solo en el token significaría que los cambios de plan no tendrían efecto hasta que el token expire (30 minutos). Con la consulta extra, el cambio es instantáneo. El coste en rendimiento es mínimo dado que la consulta usa la clave primaria (`WHERE id = ?`) y el pool de conexiones MySQL está preconfigurado.

---

## 2. Soft delete en clientes

**Decisión:** Los clientes no se eliminan físicamente de la base de datos. Se marcan con un campo `deleted_at` y quedan accesibles en una sección "Clientes eliminados" con opción de restauración.

**Motivo:** Un cliente eliminado por error puede arrastrar la pérdida de historial de facturas, proyectos y pagos asociados. El soft delete protege la integridad referencial y permite recuperar el error. En el plan futuro, los registros eliminados con más de 30 días se purgarán automáticamente.

---

## 3. Express 5

**Decisión:** Se usa Express 5 en lugar de la versión 4 (aún más popular).

**Motivo:** Express 5 maneja excepciones lanzadas en callbacks async de forma nativa, sin necesidad de envolver cada controlador en un `try/catch` o en un wrapper `asyncHandler`. Esto simplifica considerablemente el código de los controladores.

---

## 4. Sin librería de gestión de estado (sin Redux / Zustand)

**Decisión:** El estado global se gestiona con React Context puro. No se usa Redux, Zustand ni ninguna librería de estado.

**Motivo:** La aplicación tiene tres fuentes de estado global (sesión, tema y UI). Añadir una librería externa para este volumen habría introducido complejidad innecesaria. React Context es suficiente y mantiene el código legible y sin dependencias adicionales.

---

## 5. Generación de PDF en el backend (PDFKit)

**Decisión:** Los PDFs de facturas se generan en el servidor con PDFKit y se sirven como streams, en lugar de generarlos en el navegador del cliente.

**Motivo:** Generar PDFs en el cliente (con jsPDF o similares) hace que el resultado dependa del navegador, las fuentes instaladas y el tamaño de pantalla. Generarlos en el servidor garantiza un resultado idéntico para todos los usuarios, independientemente de su dispositivo, y facilita el envío por email directamente desde el backend.

---

## 6. Stripe Webhook procesado antes del JSON parser

**Decisión:** El endpoint `POST /api/billing/webhook` está registrado antes del middleware `express.json()` y recibe el cuerpo como `Buffer` raw.

**Motivo:** Stripe firma el cuerpo del webhook con HMAC-SHA256. Si el body ya ha sido parseado y re-serializado por `express.json()`, la firma no coincide y la verificación falla. Al usar `express.raw()` se preservan los bytes originales para validar la firma correctamente.

---

## 7. Módulo de API separado en el frontend

**Decisión:** Todas las llamadas HTTP al backend están centralizadas en `src/api/`, una función (o conjunto de funciones) por módulo, en lugar de hacer `fetch` directamente en los componentes.

**Motivo:** Desacopla la lógica de red de la lógica de presentación. Si la URL de un endpoint cambia, solo hay que modificarlo en un lugar. Facilita también la reutilización desde distintos componentes y simplifica los tests.

---

## 8. Portal público de facturas con token de un solo uso

**Decisión:** Se implementa un enlace público (`/p/:token`) que permite a cualquier persona ver una factura sin necesidad de cuenta, mediante un token opaco generado en el backend.

**Motivo:** El flujo habitual de enviar una factura en PDF por email tiene el problema de que el PDF puede quedar desactualizado si el freelancer modifica la factura después de enviarlo. Con el portal público, el cliente siempre ve el estado actual de la factura. El token es único por factura y no expira, pero el acceso puede revocarse desde el backend.

---

## 9. Rate limiting diferenciado

**Decisión:** Las rutas de autenticación tienen un límite mucho más estricto (20 req / 15 min) que el resto de la API (500 req / 15 min).

**Motivo:** Las rutas de login y registro son el objetivo principal de ataques de fuerza bruta. Un límite estricto en esas rutas protege contra estos ataques sin afectar a la experiencia de uso normal en el resto de la aplicación.

---

## 10. Suite de tests con Jest + Supertest

**Decisión:** Los tests de integración se ejecutan contra la API real (levantando la app Express) con una base de datos MySQL de prueba, en lugar de usar mocks del base de datos.

**Motivo:** Los tests de integración contra la base de datos real detectan problemas en las queries SQL, en el esquema de datos y en las relaciones entre tablas, que los mocks no detectarían. El proyecto incluye 59 tests cubriendo los módulos principales.
