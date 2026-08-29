// music.js
// Búsqueda de música con doble fuente: Deezer primero, iTunes Search API como respaldo.
// Esto evita que una canción vieja/famosa "no aparezca" solo porque Deezer
// no la tenga indexada exactamente con ese texto, o porque el hosting
// tenga problemas puntuales contra la API de Deezer.

async function buscarEnDeezer(hacerPeticion, query) {
  try {
    const data = await hacerPeticion(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
    if (data && data.data && data.data.length > 0) {
      return data.data.map(track => ({
        fuente: 'deezer',
        titulo: track.title,
        artista: track.artist.name,
        artistaId: track.artist.id || null,
        album: track.album.title,
        poster: track.album.cover_medium || track.artist.picture_medium || '',
        duracion: track.duration || 0,
        preview: track.preview || ''
      }));
    }
  } catch (e) {
    console.error('[Deezer] error de búsqueda:', e.message);
  }
  return [];
}

async function buscarEnItunes(hacerPeticion, query) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=15`;
    const data = await hacerPeticion(url);
    if (data && data.results && data.results.length > 0) {
      return data.results.map(track => ({
        fuente: 'itunes',
        titulo: track.trackName,
        artista: track.artistName,
        artistaId: null, // iTunes no nos sirve para traer discografía vía Deezer
        album: track.collectionName || 'N/A',
        poster: track.artworkUrl100 ? track.artworkUrl100.replace('100x100', '500x500') : '',
        duracion: track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 0,
        preview: track.previewUrl || ''
      }));
    }
  } catch (e) {
    console.error('[iTunes] error de búsqueda:', e.message);
  }
  return [];
}

// Intenta Deezer primero; si no trae nada, cae a iTunes.
async function buscarMusica(hacerPeticion, query) {
  const resultadosDeezer = await buscarEnDeezer(hacerPeticion, query);
  if (resultadosDeezer.length > 0) return resultadosDeezer;

  const resultadosItunes = await buscarEnItunes(hacerPeticion, query);
  if (resultadosItunes.length > 0) return resultadosItunes;

  return [];
}

// Discografía del artista (lista de álbumes) vía Deezer. Solo funciona si tenemos
// el artistaId (o sea, si el resultado vino de Deezer, no de iTunes).
async function obtenerAlbumesArtista(hacerPeticion, artistaId) {
  if (!artistaId) return [];
  try {
    const data = await hacerPeticion(`https://api.deezer.com/artist/${artistaId}/albums?limit=30`);
    if (data && data.data) {
      return data.data.map(album => ({
        id: album.id,
        titulo: album.title,
        portada: album.cover_medium || '',
        anio: album.release_date ? album.release_date.substring(0, 4) : ''
      }));
    }
  } catch (e) {
    console.error('[Deezer] error al traer álbumes:', e.message);
  }
  return [];
}

// Lista de canciones de un álbum puntual (para el desplegable). Se pide bajo demanda,
// no de una todas juntas, para no saturar de pedidos innecesarios cuando alguien
// solo quiere ver la ficha de una canción sin abrir toda la discografía.
async function obtenerCancionesAlbum(hacerPeticion, albumId) {
  try {
    const data = await hacerPeticion(`https://api.deezer.com/album/${albumId}`);
    if (data && data.tracks && data.tracks.data) {
      return data.tracks.data.map(t => ({
        titulo: t.title,
        duracion: t.duration || 0,
        preview: t.preview || ''
      }));
    }
  } catch (e) {
    console.error('[Deezer] error al traer canciones del álbum:', e.message);
  }
  return [];
}

// Biografía del artista vía TheAudioDB (API pública gratuita).
// Usa la clave de prueba "2" que ofrece TheAudioDB para uso gratuito/bajo volumen;
// para un sitio con mucho tráfico real, lo ideal es sacar una key propia gratis en
// theaudiodb.com/api_guide.php y reemplazarla acá.
async function obtenerBiografiaArtista(hacerPeticion, nombreArtista) {
  try {
    const url = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(nombreArtista)}`;
    const data = await hacerPeticion(url);
    if (data && data.artists && data.artists.length > 0) {
      const artista = data.artists[0];
      const bio = artista.strBiographyES || artista.strBiographyEN || '';
      return {
        biografia: bio,
        foto: artista.strArtistThumb || artista.strArtistFanart || '',
        generoMusical: artista.strGenre || '',
        paisOrigen: artista.strCountry || '',
        anioFormacion: artista.intFormedYear || ''
      };
    }
  } catch (e) {
    console.error('[TheAudioDB] error al traer biografía:', e.message);
  }
  return null;
}

module.exports = { buscarMusica, buscarEnDeezer, buscarEnItunes, obtenerAlbumesArtista, obtenerCancionesAlbum, obtenerBiografiaArtista };
