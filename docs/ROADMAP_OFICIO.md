# Lo que queda para el oficio

Hecho en esta fase, pensado para quien factura desde el móvil en una obra de Málaga:

- Presupuesto con partidas de fontanería, electricidad, reformas e instalación. Se pueden usar sin red y se suben al catálogo al volver a tener conexión.
- Firma en la pantalla y enlace `/q/:token` para que el cliente acepte. Aceptar no emite la factura.
- Un toque pasa el presupuesto a **borrador** de factura. El número oficial sale solo al pulsar Emitir, y Emitir se niega si no hay red.
- Hasta tres fotos comprimidas por presupuesto y una foto del ticket en el gasto.
- Recordatorio por email si hay Resend configurado, y texto listo para WhatsApp. En el panel, quién debe y desde hace cuántos días.
- CSV del trimestre (resumen, libro, modelo 303 y 130) con el aviso de que es una estimación.
- El calendario marca el día del presupuesto como trabajo, con el nombre del cliente.
- Asistente de tres pasos: datos fiscales, serie y primer cliente.
- La app se puede instalar. El service worker no guarda peticiones que no sean de lectura, así que no emite facturas desde la caché.

## Más adelante

- **Bizum.** Stripe ya cobra la factura pública con tarjeta si hay clave. Bizum por Stripe o Redsys no está conectado.
- **Excel y ZIP de PDFs** para la gestoría. Hoy el botón baja un CSV. El ZIP de las facturas del trimestre no.
- **Logo del autónomo en el PDF.** Si hay empresa, el logo se guarda en la ficha de empresa. El asistente de quien trabaja solo todavía no lo pide.
- **OCR del ticket como camino por defecto.** Ya existe un lector con IA en Gastos si hay clave de OpenAI. No es el flujo de obra: pide red y no guarda la foto por sí solo. La foto comprimida sí se guarda con el gasto.
- **Cola de sincronización más seria.** Hoy los presupuestos nuevos sin red viven en el teléfono (`workly_offline_quotes`) y se envían con «Enviar guardados». No hay cola para editar, borrar o firmar sin red.
- **Agenda propia.** El calendario enseña el día del presupuesto, el vencimiento y el proyecto. No hay una cita suelta desligada de un presupuesto.
- **IGIC, IPSI, identificador extranjero y País Vasco / Navarra.** Siguen fuera, igual que en VeriFactu.
