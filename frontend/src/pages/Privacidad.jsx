import { Link } from 'react-router-dom';

const Section = ({ title, children }) => (
    <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F1117', marginBottom: 12, paddingBottom: 10, borderBottom: '2px solid #F0F0F0' }}>{title}</h2>
        <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.8 }}>{children}</div>
    </div>
);

export default function Privacidad() {
    return (
        <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', Inter, sans-serif" }}>
            <style>{'@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap");'}</style>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#0D47A1,#1976D2)', padding: '48px 5% 40px' }}>
                <div style={{ maxWidth: 820, margin: '0 auto' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, textDecoration: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                        ← Volver al inicio
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <img src="/logo.png" alt="Workly" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                        <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>Workly</span>
                    </div>
                    <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Política de Privacidad</h1>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>Última actualización: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            {/* Contenido */}
            <div style={{ maxWidth: 820, margin: '0 auto', padding: '52px 5%' }}>

                <Section title="1. Responsable del tratamiento">
                    <p>En cumplimiento del <strong>Reglamento (UE) 2016/679 (RGPD)</strong> y la <strong>Ley Orgánica 3/2018 (LOPDGDD)</strong>, te informamos que el responsable del tratamiento de tus datos es:</p>
                    <div style={{ background: '#F8FAFF', border: '1px solid #E3E8F0', borderRadius: 10, padding: '16px 20px', margin: '14px 0' }}>
                        <p><strong>Denominación:</strong> Workly</p>
                        <p><strong>Web:</strong> https://workly.space</p>
                        <p><strong>Email de contacto:</strong> privacidad@workly.space</p>
                    </div>
                </Section>

                <Section title="2. Datos que recopilamos">
                    <p>Recopilamos los siguientes datos personales:</p>
                    <ul style={{ paddingLeft: 20, marginTop: 10 }}>
                        <li style={{ marginBottom: 8 }}><strong>Datos de registro:</strong> nombre, dirección de correo electrónico y contraseña (almacenada con hash bcrypt).</li>
                        <li style={{ marginBottom: 8 }}><strong>Datos de perfil opcionales:</strong> teléfono, nombre de empresa, avatar, idioma y zona horaria.</li>
                        <li style={{ marginBottom: 8 }}><strong>Datos de uso:</strong> actividad dentro de la plataforma (logs de acciones) para mejorar el servicio.</li>
                        <li style={{ marginBottom: 8 }}><strong>Datos técnicos:</strong> dirección IP, tipo de navegador y páginas visitadas, recogidos automáticamente.</li>
                        <li style={{ marginBottom: 8 }}><strong>Datos fiscales de clientes:</strong> los que tú introduces (nombre, NIF, email de tus clientes). Eres el responsable de estos datos frente a terceros.</li>
                    </ul>
                </Section>

                <Section title="3. Finalidad del tratamiento">
                    <p>Tratamos tus datos para:</p>
                    <ul style={{ paddingLeft: 20, marginTop: 10 }}>
                        <li style={{ marginBottom: 8 }}>Prestarte el servicio de gestión de clientes, proyectos y facturación.</li>
                        <li style={{ marginBottom: 8 }}>Enviarte emails operativos (confirmaciones, facturas, notificaciones del servicio).</li>
                        <li style={{ marginBottom: 8 }}>Analizar el uso de la plataforma para mejorar funcionalidades.</li>
                        <li style={{ marginBottom: 8 }}>Cumplir con obligaciones legales aplicables.</li>
                    </ul>
                </Section>

                <Section title="4. Base jurídica del tratamiento">
                    <ul style={{ paddingLeft: 20 }}>
                        <li style={{ marginBottom: 8 }}><strong>Ejecución de contrato</strong> — tratamiento necesario para prestarte el servicio contratado.</li>
                        <li style={{ marginBottom: 8 }}><strong>Consentimiento</strong> — para cookies analíticas y de marketing, que puedes retirar en cualquier momento.</li>
                        <li style={{ marginBottom: 8 }}><strong>Interés legítimo</strong> — para logs de seguridad y mejora del servicio.</li>
                        <li style={{ marginBottom: 8 }}><strong>Obligación legal</strong> — conservación de facturas según la normativa fiscal española.</li>
                    </ul>
                </Section>

                <Section title="5. Cookies">
                    <p>Utilizamos las siguientes categorías de cookies:</p>
                    <div style={{ overflowX: 'auto', marginTop: 14 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: '#F0F4FF' }}>
                                    {['Categoría', 'Finalidad', 'Duración', 'Obligatoria'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#374151' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Necesarias', 'Autenticación y sesión (JWT)', 'Sesión / 7 días', 'Sí'],
                                    ['Preferencias', 'Modo oscuro, idioma', 'Permanente', 'No'],
                                    ['Analíticas', 'Estadísticas de uso anónimas', '1 año', 'No'],
                                    ['Marketing', 'Publicidad personalizada', '90 días', 'No'],
                                ].map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #F0F0F0', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                                        {row.map((cell, j) => (
                                            <td key={j} style={{ padding: '10px 14px', color: j === 3 ? (cell === 'Sí' ? '#2E7D32' : '#9CA3AF') : '#374151', fontWeight: j === 3 ? 600 : 400 }}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ marginTop: 14, fontSize: 14 }}>Puedes gestionar tus preferencias de cookies en cualquier momento desde el banner que aparece al acceder al sitio.</p>
                </Section>

                <Section title="6. Conservación de datos">
                    <ul style={{ paddingLeft: 20 }}>
                        <li style={{ marginBottom: 8 }}>Datos de cuenta: mientras mantengas tu cuenta activa.</li>
                        <li style={{ marginBottom: 8 }}>Facturas y datos fiscales: mínimo 5 años según la normativa fiscal española (art. 30 Cco.).</li>
                        <li style={{ marginBottom: 8 }}>Logs de actividad: 12 meses.</li>
                        <li style={{ marginBottom: 8 }}>Tras la eliminación de cuenta: anonimización inmediata de datos personales salvo obligación legal.</li>
                    </ul>
                </Section>

                <Section title="7. Tus derechos (RGPD)">
                    <p>Puedes ejercer los siguientes derechos enviando un email a <strong>privacidad@workly.space</strong>:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 14 }}>
                        {[
                            { icon: '👁️', title: 'Acceso', desc: 'Obtener copia de tus datos personales.' },
                            { icon: '✏️', title: 'Rectificación', desc: 'Corregir datos inexactos o incompletos.' },
                            { icon: '🗑️', title: 'Supresión', desc: 'Eliminar tus datos ("derecho al olvido").' },
                            { icon: '⏸️', title: 'Limitación', desc: 'Restringir el tratamiento de tus datos.' },
                            { icon: '📦', title: 'Portabilidad', desc: 'Recibir tus datos en formato estructurado.' },
                            { icon: '🚫', title: 'Oposición', desc: 'Oponerte al tratamiento por interés legítimo.' },
                        ].map(r => (
                            <div key={r.title} style={{ background: '#F8FAFF', border: '1px solid #E3E8F0', borderRadius: 10, padding: '14px 16px' }}>
                                <div style={{ fontSize: 20, marginBottom: 6 }}>{r.icon}</div>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.title}</div>
                                <div style={{ fontSize: 13, color: '#6B7280' }}>{r.desc}</div>
                            </div>
                        ))}
                    </div>
                    <p style={{ marginTop: 14, fontSize: 14 }}>También puedes reclamar ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong> en <a href="https://www.aepd.es" target="_blank" rel="noreferrer" style={{ color: '#1976D2' }}>www.aepd.es</a>.</p>
                </Section>

                <Section title="8. Transferencias internacionales">
                    <p>Algunos de nuestros proveedores de servicio (Railway, Vercel, Resend) pueden procesar datos en servidores ubicados fuera del Espacio Económico Europeo. Estos proveedores cuentan con certificaciones y mecanismos de transferencia adecuados (cláusulas contractuales tipo de la UE o certificación EU-US Data Privacy Framework).</p>
                </Section>

                <Section title="9. Seguridad">
                    <p>Aplicamos las siguientes medidas técnicas y organizativas de seguridad:</p>
                    <ul style={{ paddingLeft: 20, marginTop: 10 }}>
                        <li style={{ marginBottom: 6 }}>Cifrado de contraseñas con bcrypt (salt rounds: 10).</li>
                        <li style={{ marginBottom: 6 }}>Comunicaciones cifradas mediante TLS/HTTPS.</li>
                        <li style={{ marginBottom: 6 }}>Tokens JWT de corta duración con refresh automático.</li>
                        <li style={{ marginBottom: 6 }}>Rate limiting para prevenir ataques de fuerza bruta.</li>
                        <li style={{ marginBottom: 6 }}>Cabeceras de seguridad HTTP con Helmet.</li>
                        <li style={{ marginBottom: 6 }}>Soft delete — los datos nunca se eliminan físicamente de forma inmediata.</li>
                    </ul>
                </Section>

                <Section title="10. Cambios en esta política">
                    <p>Nos reservamos el derecho de actualizar esta política para adaptarla a cambios legislativos o del servicio. Te notificaremos por email en caso de cambios sustanciales. La versión vigente siempre estará disponible en esta página.</p>
                </Section>

                <div style={{ background: '#F8FAFF', border: '1px solid #E3E8F0', borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                        ¿Tienes preguntas sobre privacidad? Escríbenos a{' '}
                        <a href="mailto:privacidad@workly.space" style={{ color: '#1976D2', fontWeight: 600 }}>privacidad@workly.space</a>
                    </p>
                </div>
            </div>

            {/* Footer simple */}
            <div style={{ background: '#0F1117', padding: '24px 5%', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
                    © {new Date().getFullYear()} Workly ·{' '}
                    <Link to="/privacidad" style={{ color: '#1976D2', textDecoration: 'none' }}>Privacidad</Link>{' '}·{' '}
                    <Link to="/" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Inicio</Link>
                </p>
            </div>
        </div>
    );
}