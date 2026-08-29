// geo.js
// Detecta el país del visitante a partir de su IP pública, usando ipapi.co (gratis).
// OJO: esto NO funciona probando en localhost/127.0.0.1 — ahí no hay IP pública real.
// Solo se puede probar una vez que el sitio esté en un hosting real.

async function detectarPaisPorIP(hacerPeticion, ip) {
  try {
    if (!ip) return null;

    // Limpia el prefijo IPv6 que a veces viene con las IPv4 (::ffff:1.2.3.4)
    const ipLimpia = ip.replace('::ffff:', '');

    // Direcciones locales/privadas: no se puede geolocalizar
    const esLocal = ipLimpia === '::1' || ipLimpia === '127.0.0.1' || ipLimpia.startsWith('192.168.') || ipLimpia.startsWith('10.');
    if (esLocal) return null;

    const data = await hacerPeticion(`https://ipapi.co/${ipLimpia}/json/`);
    if (data && data.country_code && !data.error) {
      return data.country_code.toLowerCase(); // ej: 'mx', 'us', 'ar', 'es'
    }
  } catch (e) {
    console.error('[Geo] error al detectar país:', e.message);
  }
  return null;
}

// Países de habla hispana que soportamos como región -> les damos contenido en español.
// Cualquier otro país detectado (o si falla la detección) -> contenido en inglés.
const REGIONES_ESPANOL = ['mx', 'es', 'ar', 'co', 'cl', 'pe', 've', 'ec', 'gt', 'cu', 'bo', 'do', 'hn', 'py', 'sv', 'ni', 'cr', 'pa', 'uy'];

function idiomaParaRegion(regionCode) {
  const codigo = (regionCode || '').toLowerCase();
  if (codigo === 'es') return 'es-ES';                          // España: español de España
  if (REGIONES_ESPANOL.includes(codigo)) return 'es-MX';         // Resto de habla hispana: español latino
  return 'en-US';                                                 // Cualquier otro país: inglés
}

// Nuestras regiones "oficiales" con selector en el dropdown.
// Si el país detectado no está en esta lista, cae a 'us' por defecto (pero conserva su idioma real).
const REGIONES_SOPORTADAS = ['mx', 'us', 'ca', 'es', 'ar', 'co'];

module.exports = { detectarPaisPorIP, idiomaParaRegion, REGIONES_SOPORTADAS };
