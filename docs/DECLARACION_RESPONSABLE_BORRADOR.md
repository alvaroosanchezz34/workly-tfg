# BORRADOR PARA REVISIÓN DE UN ASESOR

Este texto no es una declaración responsable firmada. Es una plantilla para que el titular del sistema la complete, la revise con su asesoría y la feche. Los huecos entre corchetes los rellena el productor. Workly no los ha rellenado porque no conoce el NIF ni el domicilio del titular.

Orden HAC/1177/2024, artículo 15. La declaración tiene que poder leerse dentro del sistema, de forma rápida, y entregarse al cliente en el momento de la adquisición y cuando la pida después. Esta pantalla y este archivo son esa copia de lectura. No sustituyen la revisión del asesor ni la firma de quien produce el sistema.

---

DECLARACIÓN RESPONSABLE DEL SISTEMA INFORMÁTICO DE FACTURACIÓN

a) Nombre del sistema informático: Workly.

b) Código identificador del sistema informático, asignado por el productor: [CÓDIGO DE 1 O 2 CARACTERES, EL MISMO QUE VERIFACTU_SYSTEM_ID, POR DEFECTO 01].

c) Identificador completo de la versión concreta del sistema informático: [VERSIÓN, LA MISMA QUE VERIFACTU_SYSTEM_VERSION, POR EJEMPLO 1.0.0].

d) Componentes y descripción de lo que hace el sistema. Workly es un programa de facturación en la nube. Tiene una aplicación web, con la que el usuario crea y emite facturas, y un servicio que, al emitir o anular, genera el registro de facturación de alta o de anulación, calcula la huella encadenada, pinta el código QR con la leyenda VERI*FACTU y remite el registro a la Agencia Estatal de Administración Tributaria por el servicio web de VERI*FACTU. El componente de hardware es el de un servicio alojado; no hay un equipo local obligatorio en el domicilio del usuario. Esta versión solo cubre el territorio de la Agencia Estatal de Administración Tributaria. No cubre TicketBAI del País Vasco ni Navarra.

e) El sistema informático solo puede funcionar como VERI*FACTU: sí. Esta versión no ofrece el modo de no remisión (el que conserva los registros firmados en local sin enviarlos).

f) El sistema informático puede ser utilizado por varios obligados tributarios: sí. Es un servicio compartido. Cada obligado tributario tiene su propia cadena de huellas, separada por NIF.

g) Modalidades de firma electrónica utilizadas para firmar los registros de facturación: no aplica. El sistema funciona solo como VERI*FACTU, y en ese modo los registros de facturación no se firman. La autenticación ante la Agencia Estatal de Administración Tributaria se hace con el certificado electrónico del obligado o de su representante, en el canal de envío.

h) Nombre y apellidos, o razón social, de la persona o entidad productora: [NOMBRE O RAZÓN SOCIAL DEL PRODUCTOR].

i) Número de identificación fiscal español, u otro número de identificación del país de residencia, de la persona o entidad productora: [NIF U OTRO IDENTIFICADOR DEL PRODUCTOR].

j) Dirección postal completa de la persona o entidad productora: [DOMICILIO COMPLETO DEL PRODUCTOR].

k) La persona o entidad productora declara que el sistema informático identificado arriba, en la versión indicada, cumple lo dispuesto en el artículo 29.2.j) de la Ley 58/2003, de 17 de diciembre, General Tributaria, en el Reglamento que establece los requisitos de los sistemas y programas informáticos o electrónicos que soporten los procesos de facturación de empresarios y profesionales, aprobado por el Real Decreto 1007/2023, de 5 de diciembre, en la Orden HAC/1177/2024, de 17 de octubre, y en las especificaciones técnicas publicadas en la sede electrónica de la Agencia Estatal de Administración Tributaria.

l) Fecha y lugar en que se suscribe esta declaración: en [LUGAR], a [DÍA] de [MES] de [AÑO].

Firma del productor: [FIRMA].

---

## Anexo (recomendado, también pendiente de revisión)

Otros medios de contacto del productor: [CORREO, TELÉFONO].

Direcciones de internet: [URL DEL SERVICIO Y, SI EXISTE, URL DE ESTA DECLARACIÓN].

Cómo cumple el sistema, en resumen, y solo para esta versión VERI*FACTU:

- Al emitir, asigna un número correlativo por emisor y serie y deja la factura inalterable. La corrección se hace con factura rectificativa o con anulación. El número anulado no se reutiliza.
- Genera el registro de alta y, si se anula, el registro de anulación, con el esquema de suministro de la Agencia Estatal de Administración Tributaria, versión de registro 1.0.
- Calcula la huella SHA-256 con los campos y el orden publicados por la Agencia, encadenada por NIF del obligado tributario.
- Incluye en la factura el código QR del servicio de cotejo y la leyenda VERI*FACTU.
- Remite los registros al servicio web de VERI*FACTU. No firma los registros con XAdES porque este modo no lo exige.
- Conserva el CSV y el estado que devuelve la Agencia (correcto, aceptado con errores o incorrecto) y permite la subsanación.

Otra información: el titular del servicio tiene que obtener su certificado electrónico, decidir si cada cliente envía con el suyo o si la plataforma envía como representante (esto último exige apoderamiento), y conservar esta declaración a disposición de la Agencia Estatal de Administración Tributaria. Esta plantilla no ha sido revisada por un asesor.
