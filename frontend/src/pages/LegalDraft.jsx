import { Link } from 'react-router-dom';

const OWNER = {
    name: '[NOMBRE DEL TITULAR]',
    nif: '[NIF]',
    address: '[DOMICILIO COMPLETO]',
    city: '[CIUDAD]',
    email: '[EMAIL DE CONTACTO]',
    web: '[DOMINIO]',
};

const DOCS = {
    'aviso-legal': {
        title: 'Aviso legal',
        body: [
            ['1. Titular', `Este sitio lo publica ${OWNER.name}, NIF ${OWNER.nif}, con domicilio en ${OWNER.address}, ${OWNER.city}. Contacto: ${OWNER.email}. Dominio: ${OWNER.web}.`],
            ['2. Objeto', 'Workly es un programa de facturación y gestión pensado para autónomos de oficios y servicios. El acceso no implica que el titular preste asesoramiento fiscal, contable o jurídico.'],
            ['3. Propiedad', 'Los textos, la marca y el código de la aplicación pertenecen a su titular, salvo los componentes de terceros que conservan su licencia.'],
            ['4. Responsabilidad', 'El autónomo que emite la factura es quien responde de su contenido ante Hacienda. Workly guarda los datos y, si se activa VeriFactu, prepara el envío. Un fallo técnico no sustituye la obligación del emisor de conservar y declarar sus facturas.'],
        ],
    },
    privacidad: {
        title: 'Política de privacidad',
        body: [
            ['1. Responsable', `Responsable del tratamiento de la web y de la cuenta: ${OWNER.name}, NIF ${OWNER.nif}, ${OWNER.address}. Email: ${OWNER.email}.`],
            ['2. Qué datos se tratan', 'Cuenta: nombre, email, teléfono y contraseña (guardada con hash, nunca en claro). Clientes y facturas: los datos fiscales que tú introduces. Lista de espera: nombre, email, profesión, ciudad y la casilla de consentimiento. Registros VeriFactu: huella, XML y la respuesta de la AEAT cuando el envío está activo.'],
            ['3. Para qué', 'Crear y conservar facturas, prestar el servicio, atender la lista de espera y, si lo configuras, enviar los registros a la AEAT. La base es el contrato (cuenta), el consentimiento (lista de espera) y la obligación legal (facturas).'],
            ['4. Cuánto tiempo', 'Los borradores se pueden borrar. Las facturas emitidas, la foto fiscal del momento de la emisión y los registros VeriFactu se conservan al menos 4 años, aunque cierres la cuenta. Es el plazo de la normativa fiscal y de VeriFactu. La lista de espera se borra cuando deje de hacer falta para el alta, o si lo pides antes.'],
            ['5. Encargados', 'El alojamiento está en la Unión Europea. El envío de email y el cobro, si se usan, los hacen proveedores que actúan como encargados. No se venden los datos.'],
            ['6. Derechos', `Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad en ${OWNER.email}. Dentro de la app, Perfil permite descargar un JSON y cerrar la cuenta. El cierre anonimiza el acceso y los datos de contacto de los clientes, retira los borradores y borra el certificado electrónico guardado. No borra las facturas ya emitidas ni la cadena VeriFactu. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).`],
            ['7. Menores', 'El servicio no está dirigido a menores de edad.'],
        ],
    },
    cookies: {
        title: 'Política de cookies',
        body: [
            ['1. Qué hay hoy', 'Workly no instala cookies de analítica ni de publicidad. La sesión se guarda en el almacenamiento local del navegador (localStorage): el identificador de acceso, el identificador de refresco y la preferencia de tema. Eso es necesario para entrar y salir de la cuenta.'],
            ['2. Banner', 'No se muestra un banner de consentimiento mientras no haya cookies no esenciales. Si en el futuro se activan (variable VITE_OPTIONAL_COOKIES), aparecerá el aviso para aceptar o rechazarlas antes de cargarlas.'],
            ['3. Lista de espera', 'La casilla de la lista de espera no es una cookie. Es el consentimiento del RGPD para guardar el email.'],
        ],
    },
    terminos: {
        title: 'Términos y condiciones del servicio',
        body: [
            ['1. Quién contrata', `El contrato es entre ${OWNER.name} (${OWNER.nif}) y el autónomo o la empresa que crea una cuenta. Al registrarte aceptas estos términos.`],
            ['2. El servicio', 'Workly permite llevar clientes, presupuestos y facturas, y preparar el envío VeriFactu cuando el titular lo active. El precio de lanzamiento previsto es un marcador (12–15 €/mes, 9 €/mes para los primeros 50). El precio vigente será el que se publique en la web en el momento del alta.'],
            ['3. Tus obligaciones', 'Das datos ciertos, guardas tu contraseña, usas tu propio certificado electrónico o un apoderamiento válido, y emites facturas que cumplan la normativa. No uses la cuenta para facturas falsas ni para acceder a datos de otros.'],
            ['4. Disponibilidad', 'El servicio se presta en un servidor en la UE. Habrá mantenimientos. Las copias de la base de datos se programan a diario; no sustituyen la copia que tú debas conservar de tus facturas.'],
            ['5. Baja', 'Puedes cerrar la cuenta desde Perfil. El acceso se anonimiza. Las facturas emitidas y los registros VeriFactu se conservan el plazo legal (mínimo 4 años).'],
            ['6. Ley', 'Se aplica la ley española. Para un consumidor, los juzgados de su domicilio. Para un autónomo en el ejercicio de su actividad, los juzgados de Málaga, salvo norma imperativa distinta.'],
        ],
    },
    encargado: {
        title: 'Contrato de encargado del tratamiento',
        body: [
            ['Aviso', 'Este texto es el borrador del contrato del artículo 28 del RGPD. El cliente (autónomo) es el responsable. Workly es el encargado. Hay que firmarlo o aceptarlo de forma identificable antes de tratar datos de clientes finales en producción.'],
            ['1. Partes', `Responsable: el autónomo titular de la cuenta. Encargado: ${OWNER.name}, NIF ${OWNER.nif}, ${OWNER.address}.`],
            ['2. Objeto', 'Alojar y tratar los datos que el responsable introduce para llevar clientes, presupuestos, facturas y, si lo activa, los registros de facturación ante la AEAT.'],
            ['3. Duración', 'Mientras la cuenta esté activa y, después, el tiempo en que la ley obligue a conservar las facturas y los registros (mínimo 4 años).'],
            ['4. Instrucciones', 'El encargado solo trata los datos para prestar el servicio, para cumplir una obligación legal o siguiendo una instrucción escrita del responsable. Si una instrucción parece ilegal, lo avisa.'],
            ['5. Confidencialidad y seguridad', 'El personal con acceso está obligado a secreto. Medidas: acceso con contraseña hasheada, sesión con caducidad, cifrado del certificado electrónico en reposo, copias cifradas en el servidor, y separación de los datos de cada cuenta.'],
            ['6. Subencargados', 'Alojamiento en la Unión Europea, y los proveedores de correo o de cobro que el responsable active. El encargado informa antes de un cambio relevante. No hay transferencias fuera del Espacio Económico Europeo en el diseño actual. Si un proveedor las hiciera, haría falta una garantía del artículo 46 del RGPD.'],
            ['7. Derechos de las personas', 'El encargado ayuda al responsable a atender acceso, rectificación, supresión y portabilidad. La exportación de la cuenta está en la propia aplicación.'],
            ['8. Fin del servicio', 'Al cerrar la cuenta se anonimizan los datos de acceso y de contacto. No se destruyen las facturas emitidas ni los registros VeriFactu mientras dure el plazo de conservación. El certificado electrónico almacenado sí se borra en ese momento.'],
            ['9. Auditoría', `El responsable puede pedir una descripción actualizada de las medidas escribiendo a ${OWNER.email}.`],
        ],
    },
};

export default function LegalDraft({ docId }) {
    const doc = DOCS[docId] || DOCS.privacidad;
    return (
        <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', Inter, sans-serif" }}>
            <div style={{ background: '#0F172A', padding: '40px 5% 32px' }}>
                <div style={{ maxWidth: 820, margin: '0 auto' }}>
                    <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>← Volver al inicio</Link>
                    <p style={{ marginTop: 18, display: 'inline-block', background: '#F59E0B', color: '#1C1917', fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', padding: '4px 10px', borderRadius: 99 }}>
                        BORRADOR — lo tiene que revisar un asesor antes de publicarlo
                    </p>
                    <h1 style={{ color: '#fff', fontSize: 34, margin: '14px 0 8px' }}>{doc.title}</h1>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
                        Sustituye los campos {OWNER.name}, {OWNER.nif} y {OWNER.address} por los datos reales del titular.
                    </p>
                </div>
            </div>
            <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 5% 72px' }}>
                {doc.body.map(([title, text]) => (
                    <section key={title} style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h2>
                        <p style={{ fontSize: 15.5, lineHeight: 1.7, color: '#374151' }}>{text}</p>
                    </section>
                ))}
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                    Otros textos: <Link to="/aviso-legal">aviso legal</Link>
                    {' · '}<Link to="/privacidad">privacidad</Link>
                    {' · '}<Link to="/cookies">cookies</Link>
                    {' · '}<Link to="/terminos">términos</Link>
                    {' · '}<Link to="/encargado">encargado del tratamiento</Link>
                </p>
            </div>
        </div>
    );
}
