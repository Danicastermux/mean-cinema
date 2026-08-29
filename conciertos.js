// conciertos.js
// Busca próximos conciertos reales de un artista usando la API pública de Bandsintown,
// y los filtra por país para armar la alerta de "va a tocar en tu región".
//
// IMPORTANTE: Bandsintown pide un "app_id" para identificar quién hace las consultas.
// Para uso personal/bajo volumen suele alcanzar con un identificador simple (el nombre
// de tu proyecto), pero si en algún momento la API empieza a rechazar pedidos, hay que
// solicitar acceso formal en su sitio (bansintown.com -> API for Developers).

const PAIS_POR_REGION = {
  ca: 'Canada',
  us: 'United States',
  mx: 'Mexico',
  es: 'Spain',
  ar: 'Argentina',
  co: 'Colombia'
};

async function proximosConciertosEnRegion(hacerPeticion, appId, artista, regionCode) {
  const nombrePais = PAIS_POR_REGION[regionCode];
  if (!nombrePais || !appId) return [];

  try {
    const url = `https://rest.bandsintown.com/artists/${encodeURIComponent(artista)}/events?app_id=${encodeURIComponent(appId)}&date=upcoming`;
    const data = await hacerPeticion(url);
    if (!Array.isArray(data)) return [];

    return data
      .filter(ev => ev.venue && ev.venue.country && ev.venue.country.toLowerCase() === nombrePais.toLowerCase())
      .map(ev => ({
        fecha: ev.datetime || null,
        ciudad: ev.venue.city || '',
        recinto: ev.venue.name || '',
        linkTickets: (ev.offers && ev.offers[0] && ev.offers[0].url) || null
      }));
  } catch (e) {
    console.error('[Bandsintown] error al buscar conciertos:', e.message);
    return [];
  }
}

module.exports = { proximosConciertosEnRegion, PAIS_POR_REGION };
