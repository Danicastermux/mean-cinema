// lugares.js
// Busca lugares de interés (turismo, "qué hacer") por ciudad, usando Geoapify
// (gratis, sin tarjeta de crédito, 3000 pedidos/día).

const GEOAPIFY_BASE = 'https://api.geoapify.com';

// Convierte el nombre de una ciudad en coordenadas (lat/lon)
async function obtenerCoordenadasCiudad(hacerPeticion, apiKey, ciudad) {
  try {
    const url = `${GEOAPIFY_BASE}/v1/geocode/search?text=${encodeURIComponent(ciudad)}&type=city&format=json&apiKey=${apiKey}`;
    const data = await hacerPeticion(url);
    if (data && data.results && data.results.length > 0) {
      const r = data.results[0];
      return { lat: r.lat, lon: r.lon };
    }
  } catch (e) {
    console.error('[Geoapify] error al geolocalizar ciudad:', e.message);
  }
  return null;
}

// Lista de lugares turísticos cerca de esas coordenadas (nombre y categoría solamente;
// los detalles se piden aparte, bajo demanda, para no gastar cuota de más).
async function buscarLugaresInteresantes(hacerPeticion, apiKey, lat, lon) {
  try {
    const url = `${GEOAPIFY_BASE}/v2/places?categories=tourism&filter=circle:${lon},${lat},15000&bias=proximity:${lon},${lat}&limit=24&apiKey=${apiKey}`;
    const data = await hacerPeticion(url);
    if (data && Array.isArray(data.features)) {
      return data.features
        .filter(f => f.properties && f.properties.name)
        .map(f => ({
          placeId: f.properties.place_id,
          nombre: f.properties.name,
          categoria: (f.properties.categories && f.properties.categories[0])
            ? f.properties.categories[0].split('.').pop().replace(/_/g, ' ') : ''
        }));
    }
  } catch (e) {
    console.error('[Geoapify] error al buscar lugares:', e.message);
  }
  return [];
}

// Detalle de un lugar puntual. Geoapify no da una biografía/descripción larga como
// OpenTripMap, así que mostramos lo que sí da bien: dirección, sitio web, horario,
// y un link a Wikipedia cuando existe.
async function obtenerDetalleLugar(hacerPeticion, apiKey, placeId) {
  try {
    const url = `${GEOAPIFY_BASE}/v2/place-details?id=${encodeURIComponent(placeId)}&features=details&apiKey=${apiKey}`;
    const data = await hacerPeticion(url);
    const props = data && data.features && data.features[0] && data.features[0].properties;
    if (props) {
      return {
        nombre: props.name || '',
        direccion: props.formatted || '',
        sitioWeb: props.website || '',
        horario: props.opening_hours || '',
        wikipediaUrl: (props.wiki_and_media && props.wiki_and_media.wikipedia) || '',
        lat: props.lat,
        lon: props.lon
      };
    }
  } catch (e) {
    console.error('[Geoapify] error al traer detalle del lugar:', e.message);
  }
  return null;
}

module.exports = { obtenerCoordenadasCiudad, buscarLugaresInteresantes, obtenerDetalleLugar };
