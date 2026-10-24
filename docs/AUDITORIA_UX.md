# Auditoría de experiencia de Workly

Fecha: 24 de octubre de 2026. Hecha mirando el código de todas las pantallas y la web pública en el navegador (escritorio y móvil). Las capturas de «antes» están en `docs/ux/antes/`.

El programa ya tenía una base visual (tarjetas redondeadas, modo claro y oscuro, y un aviso de «reducir movimiento»). El problema no era la falta de estilo, sino que cada pantalla se había pintado por su cuenta: colores fijos, avisos del navegador (`alert` y `confirm`), tablas anchas en el móvil y textos grises que no llegan al contraste AA.

## Cómo se leyó

| Pantalla | Ruta | Qué se miró |
| --- | --- | --- |
| Inicio público | `/` | Hero, precios, lista de espera, pie |
| Entrar y registro | `/login`, `/register` | Formulario, contraste, teclado |
| Textos legales | `/aviso-legal`, `/privacidad`, `/cookies`, `/terminos`, `/encargado` | Borrador visible, enlaces |
| Panel | `/dashboard` | Métricas, gráficos, vacíos |
| Clientes | `/clients`, `/clients/:id`, papelera | Tabla, búsqueda, borrado |
| Proyectos y tareas | `/projects`, kanban | Formularios, arrastre |
| Horas | `/time` | Cronómetro y alta manual |
| Facturas | `/invoices` | Emitir, anular, rectificar, móvil |
| Presupuestos | pestaña en facturas | Alta y paso a factura |
| VeriFactu | `/verifactu` | Certificado y registros |
| Gastos y servicios | `/expenses`, `/services` | Formularios |
| Calendario | `/calendar` | Mes y citas |
| Contabilidad | `/accounting` | 303 y 130 |
| Equipo y empresa | `/team`, `/company/setup` | Invitaciones |
| Perfil y plan | `/profile`, `/billing` | Contraseña, baja, datos |
| Factura pública | `/p/:token` | Cobro |
| Lista de espera (admin) | `/waitlist` | Tabla |

Las capturas del panel con datos reales no se pudieron hacer en el primer pase: hace falta MySQL con un usuario. La web pública sí se abrió.

## Problemas que se repiten

1. **Contraste.** El gris de apoyo (`#6B6F8A` y, en la web, `#6B7280`) sobre fondo claro se queda corto para texto pequeño (WCAG 2.2 AA pide 4,5:1). En el pie de la web el blanco al 40 % sobre negro casi no se lee.
2. **Foco.** Muchos botones no tenían un anillo visible al tabular. El menú de la web eran `span` con clic: el teclado no llegaba.
3. **Zona táctil.** Botones de la app con unos 36 px de alto. En obra, con el dedo, hace falta 44 px.
4. **Avisos.** Facturas, presupuestos, clientes, gastos y equipo usan `alert()` y `confirm()`. No se anuncian bien a un lector de pantalla y cortan el flujo.
5. **Tablas en el móvil.** Clientes, gastos, servicios y contabilidad siguen en tabla ancha. Presupuestos y facturas ya tienen tarjetas; el resto no.
6. **Estilos sueltos.** La web pública usa una paleta (`#3A5BD9`) y la app otra (`#4A5FFF`, y en el HTML del PWA todavía `#1976D2`). El modo oscuro no llega a los hexadecimales escritos a mano.
7. **Errores de formulario.** El mensaje sale en un `alert`, no al lado del campo, así que el lector no lo asocia al input.
8. **Movimiento.** Había una regla global de `prefers-reduced-motion` en la app. La web pública seguía animando el hero y las tarjetas. Framer Motion no la miraba.
9. **Vacío y carga.** Hay esqueletos en el panel y en facturas, y textos planos en otras listas. No hay un componente único.
10. **PWA.** El manifiesto apunta a iconos `/icons/icon-192.png` que no están en `public/`. Instalada, la app puede salir sin icono. El service worker no guarda borradores de presupuesto.

## Por pantalla

### Inicio (`/`)

Antes: titular claro para Málaga, tres precios y lista de espera. El menú no era teclado. El pie se leía mal. Capturas: `docs/ux/antes/landing-hero.webp`, `docs/ux/antes/precios.webp`, `docs/ux/antes/landing-movil.webp`.

Después de esta fase: enlaces del menú y del pie son botones o enlaces de verdad, contraste subido, foco visible, botones de 44 px y las animaciones se apagan si el sistema pide menos movimiento.

### Entrar y crear cuenta

El login es una tarjeta oscura legible (`docs/ux/antes/login.webp`). Falta unir el error del servidor al campo (sigue siendo un recuadro suelto). El registro ya pide 8 caracteres.

### Panel, clientes, proyectos, horas, gastos, servicios, calendario, equipo

Misma cáscara (barra lateral + tarjeta). Problemas: tablas en el móvil, confirmaciones nativas, y el calendario no nace pensando en «trabajo de hoy en casa del cliente». La guía de primeros pasos marca casillas en el navegador y no pide el perfil fiscal, que es lo que VeriFactu necesita antes de emitir.

### Facturas y presupuestos

Es el flujo de obra. En el móvil la factura ya es tarjeta y se puede emitir. El presupuesto también. Al emitir no hay un éxito claro dentro de la página: si falla, sale un `alert`. Pasar un presupuesto a factura crea un borrador (el número oficial sale al emitir). Eso hay que decirlo en la propia pantalla, no solo en un alert. No hay catálogo de partidas por oficio, ni firma, ni enlace para que el cliente acepte.

### VeriFactu, contabilidad, perfil, factura pública

VeriFactu explica el certificado, bien. Contabilidad calcula 303 y 130 sin un aviso grande de que es una estimación y sin un CSV para la gestoría en un clic. El perfil ya deja exportar y cerrar la cuenta. La factura pública puede cobrar con Stripe si está configurado; no hay un botón de WhatsApp para recordar el pago.

## Rendimiento

El panel parte los gráficos en otro fichero, bien. La primera carga sigue arrastrando Chart.js en cuanto se abre el panel. La web pública mete muchas animaciones al hacer scroll; con «reducir movimiento» dejan de correr. No hace falta una reescritura del empaquetado en esta fase.

## Qué se cambia y en qué orden

1. **Este cambio (diseño y acceso):** tokens de contraste, foco, 44 px, errores ligados al campo, diálogos con título y Escape, menú de la web usable con teclado, pruebas axe.
2. **Siguiente:** toasts y confirmaciones propias, éxito al emitir, menos `alert`.
3. **Después:** presupuesto en obra (catálogo, firma, enlace), recordatorio y WhatsApp, antigüedad de cobros, CSV del trimestre, foto del ticket, agenda más clara, borrador sin red y asistente fiscal.

## Lo que esta auditoría no tapa

Los textos legales siguen en borrador. VeriFactu no se emite sin red. El precio de la web sigue siendo un marcador.
