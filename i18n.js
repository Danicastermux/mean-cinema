// i18n.js
// Traducciones de los textos fijos de la interfaz (botones, etiquetas, títulos).
// El contenido de las películas/series (sinopsis, géneros, etc.) ya se traduce
// aparte a través del parámetro "idioma" que le pasamos a TMDB — esto es solo
// para los textos que nosotros mismos escribimos en el HTML.

const TRADUCCIONES = {
  'es-MX': {
    buscarPlaceholder: '¿Qué buscas hoy?', pelicula: 'Película', serie: 'Serie', musica: 'Música', eventos: 'Eventos',
    buscar: 'Buscar', region: 'Región', idioma: 'Idioma', tipo: 'Tipo', generos: 'Géneros', estreno: 'Estreno',
    productora: 'Casa productora', rating: 'Rating', repartoPrincipal: 'Reparto principal', sinopsis: 'Sinopsis',
    dondeVer: 'Dónde ver', sagaCompleta: 'Saga completa (orden de estreno)', temporadas: 'Temporadas',
    episodiosTotales: 'Episodios totales', estado: 'Estado', canalCadena: 'Canal/Cadena',
    proximoEpisodio: 'Próximo episodio', artista: 'Artista', album: 'Álbum', duracion: 'Duración',
    escucharConciertos: 'Escuchar y conciertos', discografia: 'Discografía', sobre: 'Sobre',
    noResultados: 'No se encontraron resultados para', comprarEntradas: 'Comprar entradas', enCartelera: 'En cartelera'
  },
  'en-US': {
    buscarPlaceholder: 'What are you looking for today?', pelicula: 'Movie', serie: 'TV Show', musica: 'Music', eventos: 'Events',
    buscar: 'Search', region: 'Region', idioma: 'Language', tipo: 'Type', generos: 'Genres', estreno: 'Release date',
    productora: 'Production company', rating: 'Rating', repartoPrincipal: 'Main cast', sinopsis: 'Synopsis',
    dondeVer: 'Where to watch', sagaCompleta: 'Full saga (release order)', temporadas: 'Seasons',
    episodiosTotales: 'Total episodes', estado: 'Status', canalCadena: 'Network',
    proximoEpisodio: 'Next episode', artista: 'Artist', album: 'Album', duracion: 'Duration',
    escucharConciertos: 'Listen & concerts', discografia: 'Discography', sobre: 'About',
    noResultados: 'No results found for', comprarEntradas: 'Buy tickets', enCartelera: 'In theaters'
  },
  'pt-BR': {
    buscarPlaceholder: 'O que você procura hoje?', pelicula: 'Filme', serie: 'Série', musica: 'Música', eventos: 'Eventos',
    buscar: 'Buscar', region: 'Região', idioma: 'Idioma', tipo: 'Tipo', generos: 'Gêneros', estreno: 'Estreia',
    productora: 'Produtora', rating: 'Avaliação', repartoPrincipal: 'Elenco principal', sinopsis: 'Sinopse',
    dondeVer: 'Onde assistir', sagaCompleta: 'Saga completa (ordem de lançamento)', temporadas: 'Temporadas',
    episodiosTotales: 'Episódios totais', estado: 'Status', canalCadena: 'Canal/Emissora',
    proximoEpisodio: 'Próximo episódio', artista: 'Artista', album: 'Álbum', duracion: 'Duração',
    escucharConciertos: 'Ouvir e shows', discografia: 'Discografia', sobre: 'Sobre',
    noResultados: 'Nenhum resultado encontrado para', comprarEntradas: 'Comprar ingressos', enCartelera: 'Em cartaz'
  },
  'fr-FR': {
    buscarPlaceholder: 'Que recherchez-vous aujourd\'hui ?', pelicula: 'Film', serie: 'Série', musica: 'Musique', eventos: 'Événements',
    buscar: 'Rechercher', region: 'Région', idioma: 'Langue', tipo: 'Type', generos: 'Genres', estreno: 'Sortie',
    productora: 'Société de production', rating: 'Note', repartoPrincipal: 'Acteurs principaux', sinopsis: 'Synopsis',
    dondeVer: 'Où regarder', sagaCompleta: 'Saga complète (ordre de sortie)', temporadas: 'Saisons',
    episodiosTotales: 'Total épisodes', estado: 'Statut', canalCadena: 'Chaîne',
    proximoEpisodio: 'Prochain épisode', artista: 'Artiste', album: 'Album', duracion: 'Durée',
    escucharConciertos: 'Écouter et concerts', discografia: 'Discographie', sobre: 'À propos de',
    noResultados: 'Aucun résultat trouvé pour', comprarEntradas: 'Acheter des billets', enCartelera: 'Au cinéma'
  }
};

// Devuelve el texto traducido; si falta esa clave o ese idioma, cae a español como respaldo.
function t(clave, idioma) {
  const diccionario = TRADUCCIONES[idioma] || TRADUCCIONES['es-MX'];
  return diccionario[clave] || TRADUCCIONES['es-MX'][clave] || clave;
}

module.exports = { t, IDIOMAS_DISPONIBLES: Object.keys(TRADUCCIONES) };
