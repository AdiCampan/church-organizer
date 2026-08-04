const sections = [
  {
    title: 'Responsable de la aplicación',
    content:
      'El responsable y desarrollador de Church Teams es Calatayud Digital Solutions. Para cualquier consulta relacionada con privacidad o protección de datos, puedes escribir a info@calatayud-digital-solutions.es.',
  },
  {
    title: 'Datos que recopilamos',
    content:
      'Church Teams almacena en Firebase Auth y Firestore los datos necesarios para la gestión interna de la aplicación: nombre, dirección de correo electrónico, identificador de usuario, teléfono cuando el usuario lo facilita, rol, disponibilidad, fechas bloqueadas, asignaciones, estado de confirmación o rechazo, motivos de rechazo, equipos, comunicaciones internas y tokens técnicos de notificaciones push.',
  },
  {
    title: 'Uso de los datos',
    content:
      'Los datos se usan únicamente para permitir el acceso a la aplicación, mostrar la agenda de servicio, coordinar equipos, registrar respuestas a asignaciones y enviar avisos operativos a los usuarios.',
  },
  {
    title: 'Servicios de terceros',
    content:
      'La aplicación usa Firebase de Google para autenticación, base de datos, almacenamiento y notificaciones. Estos servicios pueden procesar datos técnicos necesarios para mantener la seguridad y el funcionamiento de la aplicación, como identificadores de usuario, tokens de dispositivo, datos de sesión y registros técnicos asociados al servicio.',
  },
  {
    title: 'Conservación y eliminación',
    content:
      'Los datos se conservan mientras la cuenta esté activa o mientras sean necesarios para la coordinación de los servicios. Para solicitar la baja, corrección o eliminación de la cuenta y de sus datos asociados, el usuario debe escribir a info@calatayud-digital-solutions.es indicando el correo de la cuenta. Tras verificar la solicitud, se eliminará o anonimizará la cuenta de Firebase Auth y la información asociada en Firestore que ya no sea necesaria.',
  },
  {
    title: 'Seguridad',
    content:
      'Aplicamos medidas razonables para proteger la información, incluyendo control de acceso mediante autenticación y reglas de seguridad en los servicios utilizados.',
  },
  {
    title: 'Contacto',
    content:
      'Para consultas sobre privacidad o solicitudes relacionadas con tus datos, escribe a info@calatayud-digital-solutions.es.',
  },
];

function PrivacyPolicy() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#1e293b',
      padding: '48px 20px',
    }}>
      <article style={{
        maxWidth: '840px',
        margin: '0 auto',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
      }}>
        <p style={{
          color: '#007bff',
          fontWeight: 700,
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontSize: '12px',
        }}>
          Church Teams
        </p>
        <h1 style={{ marginBottom: '12px' }}>Política de privacidad</h1>
        <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: '28px' }}>
          Última actualización: 14 de julio de 2026
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '28px' }}>
          Esta política explica cómo Church Teams recopila, utiliza y protege los datos de los usuarios de la aplicación móvil y del panel de gestión.
        </p>

        {sections.map((section) => (
          <section key={section.title} style={{ marginTop: '28px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>{section.title}</h2>
            <p style={{ color: '#475569', lineHeight: 1.7 }}>{section.content}</p>
          </section>
        ))}
      </article>
    </main>
  );
}

export default PrivacyPolicy;
