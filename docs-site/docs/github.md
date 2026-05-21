---
id: github
sidebar_position: 8
title: GitHub
---

# GitHub

## Estructura del repositorio

El proyecto se organiza como un **monorrepo**: un único repositorio de GitHub contiene tanto el frontend como el backend.

```
workly-tfg/
├── frontend/     ← Aplicación React
└── backend/      ← API Express + tests
```

Ambas partes tienen su propio `package.json` y se gestionan de forma independiente (instalación de dependencias, scripts, variables de entorno). No se usa ninguna herramienta de gestión de monorrepos (Nx, Turborepo…) porque la separación es suficientemente sencilla.

---

## Ramas

El repositorio usa el siguiente esquema de ramas:

| Rama | Propósito |
|---|---|
| `main` | Rama principal. Solo contiene código listo para producción. |
| `develop` | Rama de integración. Aquí se integran las features antes de pasar a `main`. |
| `feature/*` | Ramas de funcionalidad. Una por cada característica nueva. |
| `fix/*` | Ramas de corrección de bugs. |

### Estrategia de integración

El flujo de trabajo es el siguiente:

1. Se crea una rama `feature/nombre-de-la-feature` desde `develop`.
2. Se desarrolla la funcionalidad.
3. Se abre una Pull Request hacia `develop`.
4. Se verifica manualmente que los tests pasen (`npm test`) antes de hacer merge.
5. Periódicamente, `develop` se integra en `main` cuando el estado es estable.

No se usa ningún sistema de CI automatizado (GitHub Actions) actualmente, aunque el proyecto está preparado para añadirlo fácilmente dado que los tests son ejecutables con un solo comando.

---

## Estructura de commits

Los commits siguen la convención **Conventional Commits** de forma no estricta:

```
tipo(ámbito): descripción breve
```

### Tipos de commit usados

| Tipo | Cuándo |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Cambio de código sin nueva funcionalidad ni fix |
| `docs` | Cambios en documentación |
| `test` | Añadir o modificar tests |
| `chore` | Tareas de mantenimiento (deps, configs…) |
| `style` | Cambios de estilos CSS/UI sin cambio de lógica |

### Ejemplos

```
feat(invoices): añadir envío de factura por email
fix(auth): corregir renovación automática del refresh token
refactor(clients): extraer ClientForm a componente separado
test(invoices): añadir tests de pagos parciales
chore(deps): actualizar express a 5.2.1
```

---

## `.gitignore`

Se ignoran los ficheros típicos de Node:

```
node_modules/
dist/
.env
*.log
```

Los archivos `.env.example` **sí están versionados** como referencia de configuración para otros desarrolladores.
