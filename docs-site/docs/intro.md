---
id: intro
slug: /
sidebar_position: 1
title: Introducción
---

# Workly — Plataforma de gestión para freelancers

**Workly** es una aplicación web SaaS diseñada para que profesionales autónomos y pequeñas agencias gestionen toda su actividad de negocio desde un único lugar: clientes, proyectos, facturas, presupuestos, gastos y equipo.

El proyecto ha sido desarrollado como **Trabajo de Fin de Grado (TFG)** del ciclo formativo de Desarrollo de Aplicaciones Web (DAW).

---

## ¿Qué puede hacer Workly?

| Módulo | Descripción |
|---|---|
| **Clientes** | Alta, edición, baja lógica y restauración de clientes. Perfil mini-CRM con historial. |
| **Proyectos** | Gestión de proyectos con estado, presupuesto y asignación de equipo. |
| **Facturas** | Creación, descarga en PDF, envío por email, control de pagos parciales y notas de crédito. |
| **Presupuestos** | Gestión de presupuestos con conversión directa a factura. |
| **Facturas recurrentes** | Automatización del ciclo de facturación periódica. |
| **Gastos** | Registro y categorización de gastos con resumen contable. |
| **Equipo** | Invitación de miembros, roles (admin/member) y asignación de clientes/proyectos. |
| **Contabilidad** | Dashboard con resumen de ingresos, gastos y beneficio neto. |
| **Exportación** | Exportación de datos a Excel. |
| **Portal público** | Enlace de acceso público por token para que el cliente vea su factura. |

---

## Stack tecnológico (resumen)

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Node.js + Express 5 + MySQL
- **Autenticación:** JWT (access token + refresh token)
- **Pagos:** Stripe
- **Email:** Resend
- **Tests:** Jest + Supertest (59 tests)

---

## Navegación rápida

- [Arquitectura →](/arquitectura)
- [API del backend →](/backend/api)
- [Autenticación →](/backend/autenticacion)
- [Componentes frontend →](/frontend/componentes)
- [Cómo usarlo →](/uso)
- [Lanzar en local →](/local)
- [Despliegue →](/despliegue)
