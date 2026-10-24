# VeriFactu en Workly (implementación propia)

Esta guía explica cómo está hecho el modo VERI*FACTU dentro de Workly y qué tiene que hacer el titular antes de usarlo con clientes. No es asesoramiento fiscal. La declaración responsable del final es un borrador para un asesor.

La fase 1 dejó el contrato del proveedor (`registrarAlta`, `anular`, `obtenerQr`, `obtenerEstado`) y las facturas inalterables. Esta fase enchufa ese contrato con código nuestro. No hay un proveedor externo. El valor por defecto sigue siendo `VERIFACTU_PROVIDER=noop`: hasta que el titular ponga `aeat`, emitir una factura no genera huella ni QR.

## Qué hace el sistema al emitir

1. Asigna el número de la serie dentro de la misma transacción de la factura.
2. Bloquea la cadena de huellas de ese NIF (`verifactu_chain`). Hay una cadena por obligado tributario, no una por serie y no una global.
3. Calcula la huella SHA-256 con el orden de la Agencia Estatal de Administración Tributaria. El primer registro del NIF deja la huella anterior vacía. El siguiente usa la huella del anterior, aunque sea de otra serie o una anulación.
4. Genera el XML `RegFactuSistemaFacturacion` (registro de alta o de anulación) y lo valida contra los XSD oficiales vendidos en `backend/src/services/verifactu/xsd/`.
5. Guarda el XML y deja el registro en cola (`queued`) o en `pending_certificate` si aún no hay certificado.
6. Devuelve en el acto la URL del QR y la leyenda `VERI*FACTU`. La factura las lleva aunque la Agencia todavía no haya contestado. Si el XML no es válido, la transacción se deshace y el número no se consume.
7. Un proceso aparte, arrancado solo en `server.js` cuando el proveedor es `aeat`, envía la cola por SOAP con el certificado. No envía nada dentro de la transacción de la factura.

La anulación genera un `RegistroAnulacion` nuevo en la misma cadena. No reutiliza el número de la factura anulada.

## Importe que viaja a la Agencia

`ImporteTotal` del registro es la base más la cuota de IVA más la cuota de recargo de equivalencia. El IRPF no se resta y no va en el desglose. El QR usa ese mismo importe, siempre con dos decimales (`123.45`, `241.40`). El PDF puede seguir mostrando el total a pagar ya restado el IRPF. Si hay IRPF, la pantalla de emisión lo dice.

Esta versión desglosa el IVA peninsular (impuesto `01`, régimen general `01`, operación sujeta y no exenta `S1`). No elige sola IGIC ni IPSI. Una factura de Canarias, Ceuta o Melilla no debe emitirse con este desglose hasta que se añada esa clave.

## QR

- Pruebas: `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR`
- Producción: `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR`

Parámetros, solo estos y en este orden: `nif`, `numserie`, `fecha` (`dd-mm-aaaa`), `importe`. Van codificados en UTF-8. En el PDF, el texto «QR tributario:» queda encima del código, el código mide unos 35 mm y la leyenda `VERI*FACTU` queda debajo, centrada respecto al código. Corrección de errores nivel M.

## Envío a la Agencia

SOAP 1.1, operación `RegFactuSistemaFacturacion`, `SOAPAction` vacío. El entorno sale de `VERIFACTU_ENV` (`test` si no se dice nada; `production` solo cuando el titular lo escribe).

| Certificado | Pruebas | Producción |
| --- | --- | --- |
| Personal o de representante | `https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP` | `https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP` |
| Sello de entidad | `https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP` | `https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP` |

`VERIFACTU_CERT_KIND=personal` o `sello` elige la fila. El certificado viaja en el canal (TLS mutuo). Los registros no se firman: en VERI*FACTU no hace falta.

La respuesta trae `EstadoEnvio` (`Correcto`, `ParcialmenteCorrecto`, `Incorrecto`), un CSV del envío y, por cada factura, `EstadoRegistro` (`Correcto`, `AceptadoConErrores`, `Incorrecto`) con el código y el texto del error. El CSV se guarda al recibir la respuesta. La Agencia no lo devuelve después.

`TiempoEsperaEnvio` es la pausa, en segundos, hasta el siguiente envío de ese certificado. El worker espera ese tiempo o hasta juntar 1000 registros, lo que ocurra antes. Un fallo de red reintenta con espera creciente. Al octavo fallo el registro pasa a `error_tecnico`.

Subsanación, sin recalcular la huella:

- Registro `incorrecto` (la Agencia no lo guardó): se reenvía el mismo registro con subsanación `S` y rechazo previo `S`.
- `aceptado_con_errores`: subsanación `S` y rechazo previo `N`.
- `error_tecnico`: se reintenta el mismo XML.

Si hubiera que cambiar un dato que entra en la huella (número, fecha, tipo, cuotas, importe, fecha de generación), eso no es una subsanación de este registro: es un alta nueva o una anulación seguida de otra factura. Esta versión no reescribe la huella al reenviar.

## Quién envía

Hay dos modos, en Ajustes de VeriFactu (`/verifactu`):

**(a) Certificado propio.** Cada autónomo, o el administrador de la empresa, sube su PFX. Workly lo cifra en reposo con AES-256-GCM y `VERIFACTU_CERT_KEY`. La cabecera del XML solo lleva al obligado. No hace falta un poder. El usuario sí tiene que conseguir su certificado en la Agencia, en la FNMT o por otro prestador admitido.

**(b) Certificado de la plataforma como representante.** El administrador de Workly carga un solo certificado (variable de entorno o subida, solo el rol admin). En la cabecera van el obligado y el representante. Esto exige un apoderamiento del cliente a favor de ese representante, otorgado y vigente ante la Agencia. Sin ese poder el envío se rechaza. Guardar el nombre, el NIF y una referencia del poder en Workly no sustituye el trámite en la Agencia. El modo (b) es el que tiene pasos legales fuera del programa. El modo (a) no.

La contraseña del PFX y el fichero no se guardan en el repositorio ni se escriben en el registro de actividad.

## Qué tiene que hacer el titular

1. Conseguir el certificado electrónico con el que se va a conectar (propio de cada cliente, o el de la plataforma si va a representar).
2. Generar `VERIFACTU_CERT_KEY` y guardarla en el almacén de secretos. Si se pierde, no se pueden leer los PFX ya guardados.
3. Rellenar el nombre, el NIF y el código de sistema del productor (`VERIFACTU_PRODUCER_*`, `VERIFACTU_SYSTEM_ID`). Tienen que coincidir con la declaración responsable.
4. Revisar con un asesor `docs/DECLARACION_RESPONSABLE_BORRADOR.md`, completarla, fecharla y firmarla. Dentro de la aplicación se lee en `/verifactu/declaracion`. Hay que poder entregarla al cliente al contratar y cuando la pida.
5. Dejar `VERIFACTU_ENV=test` hasta haber probado en preproducción. Pasar a `production` es una decisión del titular.
6. Poner `VERIFACTU_PROVIDER=aeat` solo cuando lo anterior esté hecho.
7. Si usa el modo representante, otorgar y comprobar el apoderamiento de cada cliente antes de emitir.

Los plazos de entrada en vigor los marca la norma vigente en cada momento. Un anuncio de Hacienda de octubre de 2026 habla de aplazar obligaciones, pero mientras no sea norma no cambia esta guía. País Vasco y Navarra quedan fuera. Quien ya presenta el SII tiene otro régimen y no debe activar este envío sin revisarlo.

## Configuración

Ver `backend/.env.example`. Resumen:

- `VERIFACTU_PROVIDER=aeat`
- `VERIFACTU_ENV=test` o `production`
- `VERIFACTU_CERT_KIND=personal` o `sello`
- `VERIFACTU_PRODUCER_NAME`, `VERIFACTU_PRODUCER_NIF` (9 caracteres), `VERIFACTU_SYSTEM_ID` (1 o 2 caracteres), `VERIFACTU_SYSTEM_NAME`, `VERIFACTU_SYSTEM_VERSION`
- `VERIFACTU_CERT_KEY`
- `VERIFACTU_PLATFORM_PFX_PATH` o `VERIFACTU_PLATFORM_PFX_BASE64`, y `VERIFACTU_PLATFORM_PFX_PASSPHRASE`, solo en modo representante
- `VERIFACTU_WORKER_MS` (por defecto 30000). `VERIFACTU_WORKER=0` apaga el envío.

Los esquemas usados son los publicados en la sede, ruta `tikeV1.0`, descargados el 24 de octubre de 2026:

- `SuministroLR.xsd`, `SuministroInformacion.xsd`, `RespuestaSuministro.xsd`, `SistemaFacturacion.wsdl`
- `xmldsig-core-schema.xsd` y `catalog.xml` para validar sin red

La versión de registro dentro del XML es `1.0`. Si la Agencia publica un esquema nuevo, hay que volver a venderlo y repetir los tests de `xmllint`.

Base de datos: instalación nueva, `backend/scripts/CREATEDATABASE.sql`. Base que ya tenía la fase 1, una sola vez `backend/scripts/008_verifactu_inhouse.sql`.

## Pantallas

- `/verifactu`: modo de envío, certificado, lista de registros, estado, CSV y error, y botón de reenviar.
- `/verifactu/declaracion`: borrador de la declaración responsable.
- En facturas, el estado del último registro aparece junto al número. Emitir, anular y rectificar siguen como en la fase 1. La rectificativa pide el código R1–R4 (o R5 si la original es simplificada).

## Cómo se prueba sin llamar a la Agencia

Los tests automáticos no tienen certificado y no abren conexión con la Agencia. Si alguien llama al transporte real dentro de Jest, el código lanza «No se llama a la AEAT desde los tests».

```bash
cd backend
npm test
```

Cubren los tres vectores de huella publicados por la Agencia, la URL del QR, la validación del XML con `xmllint` y los XSD vendidos, el cifrado del PFX, el análisis de una respuesta SOAP simulada (correcto, aceptado con errores, incorrecto, CSV y tiempo de espera) y la cola (espera, reintento y subsanación).

## Prueba manual contra el entorno de pruebas de la Agencia

Hace falta un certificado real de pruebas. No lo pongas en el repositorio ni en la integración continua.

1. En el entorno de pruebas de la Agencia, da de alta el certificado con el que vas a presentar (personal o de representante, según el caso). Si vas a probar el modo representante, el apoderamiento también tiene que existir en pruebas.
2. Copia `backend/.env.example` a `backend/.env`.
3. Pon `VERIFACTU_PROVIDER=aeat`, `VERIFACTU_ENV=test` y `VERIFACTU_CERT_KIND` acorde al certificado.
4. Rellena los datos del productor con un NIF de 9 caracteres. En pruebas puede ser el del certificado o el que indique la Agencia para el obligado.
5. Genera `VERIFACTU_CERT_KEY`.
6. Arranca MySQL, aplica el esquema y arranca el API (`npm run dev` dentro de `backend`) y el frontend.
7. Entra con un usuario, completa el perfil fiscal del emisor y sube el PFX en `/verifactu`. O, si pruebas el modo plataforma, pon el PFX en `VERIFACTU_PLATFORM_PFX_PATH` y configura el apoderamiento en esa pantalla.
8. Emite una factura de prueba. Tiene que salir el número, el QR de `prewww2.aeat.es` y la leyenda VERI*FACTU. El registro queda en cola y el worker lo envía.
9. En `/verifactu` mira el estado. Si la Agencia contesta correcto, guarda el CSV. Si contesta incorrecto o aceptado con errores, lee el código y usa Reenviar. Eso cambia las marcas de subsanación y no la huella.
10. Abre la URL del QR en un navegador y comprueba que el servicio de cotejo de pruebas reconoce la factura.
11. Anula esa factura y comprueba que aparece un registro de anulación encadenado.
12. No cambies `VERIFACTU_ENV` a `production` en esta prueba.

Si el worker no arranca, revisa que el proceso sea `server.js` (no solo importar `app.js`) y que `VERIFACTU_PROVIDER` sea `aeat`.
