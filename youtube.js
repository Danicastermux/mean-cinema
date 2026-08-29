// youtube.js
// Busca el video oficial de algo en YouTube usando la API OFICIAL (YouTube Data API v3),
// no scraping. Se usa como respaldo cuando TMDB no tiene un trailer (por ejemplo,
// openings de anime, o videos musicales oficiales de canciones).
//
// IMPORTANTE: la API gratis de YouTube tiene una cuota diaria baja (~100 búsquedas/día).
// Por eso TODO pasa primero por un caché en MongoDB: una vez que buscamos algo una vez,
// no lo volvemos a buscar — lo sacamos de la base de datos. Esto hace que la cuota
// alcance para muchísimas visitas, ya que las canciones/series populares se repiten.

const mongoose = require('mongoose');

const videoCacheSchema = new mongoose.Schema({
  query: { type: String, required: true, unique: true },
  videoId: { type: String, default: null }, // null = ya se buscó antes y no había resultado
  fecha: { type: Date, default: Date.now }
});
const VideoCache = mongoose.model('VideoCache', videoCacheSchema);

async function buscarEnYoutubeAPI(hacerPeticion, apiKey, query) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`;
    const data = await hacerPeticion(url);
    if (data && data.items && data.items.length > 0) {
      return data.items[0].id.videoId;
    }
  } catch (e) {
    console.error('[YouTube API] error:', e.message);
  }
  return null;
}

// Punto de entrada: siempre pasa primero por el caché de Mongo.
async function buscarVideoConCache(hacerPeticion, apiKey, query) {
  if (!apiKey) return null;
  const clave = query.toLowerCase().trim();

  try {
    const enCache = await VideoCache.findOne({ query: clave });
    if (enCache) return enCache.videoId; // puede ser null: ya sabíamos que no había resultado
  } catch (e) {
    console.error('[Caché video] error al leer:', e.message);
  }

  const videoId = await buscarEnYoutubeAPI(hacerPeticion, apiKey, query);

  try {
    await VideoCache.create({ query: clave, videoId });
  } catch (e) {
    // Si ya existe (dos pedidos simultáneos buscaron lo mismo a la vez), no pasa nada.
  }

  return videoId;
}

module.exports = { buscarVideoConCache };
