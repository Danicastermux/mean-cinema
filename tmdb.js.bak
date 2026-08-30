// tmdb.js
// Módulo de integración con TMDB (The Movie Database)
// Requiere: TMDB_API_KEY en variables de entorno

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

function tmdbUrl(path, apiKey, params = {}, idioma = 'es-MX') {
  const usp = new URLSearchParams({ api_key: apiKey, language: idioma, ...params });
  return `${TMDB_BASE}${path}?${usp.toString()}`;
}

// Búsqueda SOLO de películas
async function buscarPeliculas(hacerPeticion, apiKey, query, idioma = 'es-MX') {
  const url = tmdbUrl('/search/movie', apiKey, { query, include_adult: 'false' }, idioma);
  const data = await hacerPeticion(url);
  const resultados = (data.results || []).map(r => ({ ...r, media_type: 'movie' }));
  resultados.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  return resultados;
}

// Búsqueda SOLO de series
async function buscarSeries(hacerPeticion, apiKey, query, idioma = 'es-MX') {
  const url = tmdbUrl('/search/tv', apiKey, { query }, idioma);
  const data = await hacerPeticion(url);
  const resultados = (data.results || []).map(r => ({ ...r, media_type: 'tv' }));
  resultados.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  return resultados;
}

async function detalleTMDB(hacerPeticion, apiKey, id, mediaType, idioma = 'es-MX') {
  const path = mediaType === 'movie' ? `/movie/${id}` : `/tv/${id}`;
  const url = tmdbUrl(path, apiKey, { append_to_response: 'credits,watch/providers,videos' }, idioma);
  const detalle = await hacerPeticion(url);

  // Respaldo: si no hay sinopsis en el idioma pedido, traemos la de inglés
  if ((!detalle.overview || detalle.overview.trim() === '') && idioma !== 'en-US') {
    try {
      const urlEn = tmdbUrl(path, apiKey, {}, 'en-US');
      const detalleEn = await hacerPeticion(urlEn);
      if (detalleEn.overview) {
        detalle.overview = detalleEn.overview + ' (sinopsis en inglés, no disponible en español)';
      }
    } catch (e) {
      // si tampoco hay en inglés, se queda sin sinopsis
    }
  }

  return detalle;
}

async function coleccionTMDB(hacerPeticion, apiKey, collectionId) {
  const url = tmdbUrl(`/collection/${collectionId}`, apiKey);
  const data = await hacerPeticion(url);
  if (data.parts) {
    // Orden de ESTRENO (TMDB no provee orden cronológico de la historia)
    data.parts.sort((a, b) => new Date(a.release_date || '9999') - new Date(b.release_date || '9999'));
  }
  return data;
}

function imagenTMDB(path, size = 'w500') {
  if (!path) return '';
  return `${TMDB_IMG}/${size}${path}`;
}

function trailerOficial(videosResponse) {
  if (!videosResponse || !videosResponse.results) return null;
  const trailer = videosResponse.results.find(
    v => v.site === 'YouTube' && v.type === 'Trailer' && v.official
  ) || videosResponse.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
  return trailer ? trailer.key : null;
}

function proveedoresPorRegion(watchProvidersResponse, regionCode) {
  if (!watchProvidersResponse || !watchProvidersResponse.results) return { flatrate: [], link: null };
  const regionData = watchProvidersResponse.results[regionCode.toUpperCase()];
  if (!regionData) return { flatrate: [], link: null };

  // Cada proveedor trae logo_path; armamos la URL completa del ícono acá mismo
  const conLogo = (lista) => (lista || []).map(p => ({
    ...p,
    logo_url: p.logo_path ? imagenTMDB(p.logo_path, 'w92') : ''
  }));

  return {
    flatrate: conLogo(regionData.flatrate),
    rent: conLogo(regionData.rent),
    buy: conLogo(regionData.buy),
    link: regionData.link || null
  };
}

module.exports = {
  buscarPeliculas,
  buscarSeries,
  detalleTMDB,
  coleccionTMDB,
  imagenTMDB,
  trailerOficial,
  proveedoresPorRegion
};
