// cronologias.js
// Cronologías narrativas curadas A MANO para franquicias grandes, donde el orden
// "correcto" de verlas NO es el mismo que el orden de estreno (por eso no se puede
// sacar automáticamente de ninguna API — es un criterio editorial/humano).
//
// Cada entrada es { titulo, tipo: 'movie'|'tv', nota (opcional) }.
// El "titulo" es el texto que usamos para buscarlo en TMDB — tiene que ser
// razonablemente exacto para que encuentre la ficha correcta.

const mongoose = require('mongoose');
const { buscarPeliculas, buscarSeries, imagenTMDB } = require('./tmdb');

const FRANQUICIAS = {
  'star-wars': {
    nombre: 'Star Wars — orden cronológico de la historia',
    items: [
      { titulo: 'Star Wars: The Phantom Menace', tipo: 'movie', nota: 'Episodio I' },
      { titulo: 'Star Wars: Attack of the Clones', tipo: 'movie', nota: 'Episodio II' },
      { titulo: 'Star Wars: The Clone Wars', tipo: 'tv', nota: 'Opcional, entre el Ep. II y III' },
      { titulo: 'Star Wars: Revenge of the Sith', tipo: 'movie', nota: 'Episodio III' },
      { titulo: 'Obi-Wan Kenobi', tipo: 'tv' },
      { titulo: 'Solo: A Star Wars Story', tipo: 'movie' },
      { titulo: 'Star Wars Rebels', tipo: 'tv', nota: 'Opcional' },
      { titulo: 'Rogue One: A Star Wars Story', tipo: 'movie' },
      { titulo: 'Star Wars', tipo: 'movie', nota: 'Episodio IV: Una Nueva Esperanza' },
      { titulo: 'The Empire Strikes Back', tipo: 'movie', nota: 'Episodio V' },
      { titulo: 'Return of the Jedi', tipo: 'movie', nota: 'Episodio VI' },
      { titulo: 'The Mandalorian', tipo: 'tv' },
      { titulo: 'The Book of Boba Fett', tipo: 'tv' },
      { titulo: 'Ahsoka', tipo: 'tv' },
      { titulo: 'Star Wars: The Force Awakens', tipo: 'movie', nota: 'Episodio VII' },
      { titulo: 'Star Wars: The Last Jedi', tipo: 'movie', nota: 'Episodio VIII' },
      { titulo: 'Star Wars: The Rise of Skywalker', tipo: 'movie', nota: 'Episodio IX' }
    ]
  },
  'mcu': {
    nombre: 'Marvel Cinematic Universe — orden cronológico de la historia',
    items: [
      { titulo: 'Captain America: The First Avenger', tipo: 'movie' },
      { titulo: 'Captain Marvel', tipo: 'movie' },
      { titulo: 'Iron Man', tipo: 'movie' },
      { titulo: 'Iron Man 2', tipo: 'movie' },
      { titulo: 'The Incredible Hulk', tipo: 'movie' },
      { titulo: 'Thor', tipo: 'movie' },
      { titulo: 'The Avengers', tipo: 'movie' },
      { titulo: 'Thor: The Dark World', tipo: 'movie' },
      { titulo: 'Captain America: The Winter Soldier', tipo: 'movie' },
      { titulo: 'Guardians of the Galaxy', tipo: 'movie' },
      { titulo: 'Guardians of the Galaxy Vol. 2', tipo: 'movie' },
      { titulo: 'Avengers: Age of Ultron', tipo: 'movie' },
      { titulo: 'Ant-Man', tipo: 'movie' },
      { titulo: 'Captain America: Civil War', tipo: 'movie' },
      { titulo: 'Spider-Man: Homecoming', tipo: 'movie' },
      { titulo: 'Doctor Strange', tipo: 'movie' },
      { titulo: 'Black Panther', tipo: 'movie' },
      { titulo: 'Thor: Ragnarok', tipo: 'movie' },
      { titulo: 'Ant-Man and the Wasp', tipo: 'movie' },
      { titulo: 'Avengers: Infinity War', tipo: 'movie' },
      { titulo: 'Avengers: Endgame', tipo: 'movie' },
      { titulo: 'Spider-Man: Far From Home', tipo: 'movie' },
      { titulo: 'WandaVision', tipo: 'tv' },
      { titulo: 'The Falcon and the Winter Soldier', tipo: 'tv' },
      { titulo: 'Loki', tipo: 'tv' },
      { titulo: 'Black Widow', tipo: 'movie' },
      { titulo: 'Shang-Chi and the Legend of the Ten Rings', tipo: 'movie' },
      { titulo: 'Eternals', tipo: 'movie' },
      { titulo: 'Hawkeye', tipo: 'tv' },
      { titulo: 'Spider-Man: No Way Home', tipo: 'movie' },
      { titulo: 'Moon Knight', tipo: 'tv' },
      { titulo: 'Doctor Strange in the Multiverse of Madness', tipo: 'movie' },
      { titulo: 'Ms. Marvel', tipo: 'tv' },
      { titulo: 'Thor: Love and Thunder', tipo: 'movie' },
      { titulo: 'She-Hulk: Attorney at Law', tipo: 'tv' },
      { titulo: 'Black Panther: Wakanda Forever', tipo: 'movie' },
      { titulo: 'Guardians of the Galaxy Vol. 3', tipo: 'movie' }
    ]
  },
  'x-men': {
    nombre: 'X-Men (Fox) — orden cronológico de la historia',
    items: [
      { titulo: 'X-Men: First Class', tipo: 'movie', nota: 'Años 60' },
      { titulo: 'X-Men Origins: Wolverine', tipo: 'movie', nota: 'Años 70-80' },
      { titulo: 'X-Men: Days of Future Past', tipo: 'movie', nota: 'Puente entre líneas de tiempo' },
      { titulo: 'X-Men: Apocalypse', tipo: 'movie', nota: 'Años 80' },
      { titulo: 'Deadpool', tipo: 'movie' },
      { titulo: 'X-Men', tipo: 'movie', nota: 'Año 2000' },
      { titulo: 'X2', tipo: 'movie' },
      { titulo: 'X-Men: The Last Stand', tipo: 'movie' },
      { titulo: 'The Wolverine', tipo: 'movie' },
      { titulo: 'Deadpool 2', tipo: 'movie' },
      { titulo: 'X-Men: Dark Phoenix', tipo: 'movie' },
      { titulo: 'Logan', tipo: 'movie', nota: 'Año 2029, futuro lejano' }
    ]
  },
  'dceu': {
    nombre: 'DC Extended Universe (DCEU) — orden cronológico de la historia',
    items: [
      { titulo: 'Wonder Woman', tipo: 'movie', nota: '1918' },
      { titulo: 'Man of Steel', tipo: 'movie' },
      { titulo: 'Batman v Superman: Dawn of Justice', tipo: 'movie' },
      { titulo: 'Suicide Squad', tipo: 'movie' },
      { titulo: 'Wonder Woman 1984', tipo: 'movie' },
      { titulo: 'Zack Snyder\'s Justice League', tipo: 'movie' },
      { titulo: 'Aquaman', tipo: 'movie' },
      { titulo: 'Shazam!', tipo: 'movie' },
      { titulo: 'Birds of Prey', tipo: 'movie' },
      { titulo: 'Peacemaker', tipo: 'tv' },
      { titulo: 'The Suicide Squad', tipo: 'movie' },
      { titulo: 'Black Adam', tipo: 'movie' },
      { titulo: 'Shazam! Fury of the Gods', tipo: 'movie' },
      { titulo: 'Aquaman and the Lost Kingdom', tipo: 'movie' }
    ]
  },
  'star-trek': {
    nombre: 'Star Trek (línea principal) — orden cronológico de la historia',
    items: [
      { titulo: 'Star Trek: Enterprise', tipo: 'tv', nota: 'Siglo XXII' },
      { titulo: 'Star Trek: Discovery', tipo: 'tv', nota: 'Temporadas 1-2' },
      { titulo: 'Star Trek: Strange New Worlds', tipo: 'tv' },
      { titulo: 'Star Trek', tipo: 'tv', nota: 'Serie original' },
      { titulo: 'Star Trek: The Motion Picture', tipo: 'movie' },
      { titulo: 'Star Trek II: The Wrath of Khan', tipo: 'movie' },
      { titulo: 'Star Trek III: The Search for Spock', tipo: 'movie' },
      { titulo: 'Star Trek IV: The Voyage Home', tipo: 'movie' },
      { titulo: 'Star Trek V: The Final Frontier', tipo: 'movie' },
      { titulo: 'Star Trek VI: The Undiscovered Country', tipo: 'movie' },
      { titulo: 'Star Trek: The Next Generation', tipo: 'tv' },
      { titulo: 'Star Trek: Deep Space Nine', tipo: 'tv' },
      { titulo: 'Star Trek: Voyager', tipo: 'tv' },
      { titulo: 'Star Trek: Generations', tipo: 'movie' },
      { titulo: 'Star Trek: First Contact', tipo: 'movie' },
      { titulo: 'Star Trek: Insurrection', tipo: 'movie' },
      { titulo: 'Star Trek: Nemesis', tipo: 'movie' },
      { titulo: 'Star Trek: Picard', tipo: 'tv' },
      { titulo: 'Star Trek', tipo: 'movie', nota: 'Reinicio 2009 — línea temporal alternativa (Kelvin)' },
      { titulo: 'Star Trek Into Darkness', tipo: 'movie', nota: 'Línea Kelvin' },
      { titulo: 'Star Trek Beyond', tipo: 'movie', nota: 'Línea Kelvin' }
    ]
  },
  'fate': {
    nombre: 'Fate — orden recomendado de visionado (no es cronología estricta)',
    items: [
      { titulo: 'Fate/Zero', tipo: 'tv', nota: 'Precuela, 4ta Guerra del Santo Grial' },
      { titulo: 'Fate/stay night: Unlimited Blade Works', tipo: 'tv', nota: '5ta Guerra' },
      { titulo: 'Fate/stay night: Heaven\'s Feel I. presage flower', tipo: 'movie', nota: 'Ruta alternativa de la misma guerra' },
      { titulo: 'Fate/stay night: Heaven\'s Feel II. lost butterfly', tipo: 'movie' },
      { titulo: 'Fate/stay night: Heaven\'s Feel III. spring song', tipo: 'movie' },
      { titulo: 'Fate/kaleid liner Prisma Illya', tipo: 'tv', nota: 'Spinoff / universo alternativo' },
      { titulo: 'Fate/Apocrypha', tipo: 'tv', nota: 'Universo separado' },
      { titulo: 'Fate/Grand Order: Absolute Demonic Front - Babylonia', tipo: 'tv', nota: 'Multiverso separado' }
    ]
  },
  'digimon': {
    nombre: 'Digimon (saga Adventure) — orden cronológico de la historia',
    items: [
      { titulo: 'Digimon Adventure', tipo: 'tv' },
      { titulo: 'Digimon Adventure 02', tipo: 'tv' },
      { titulo: 'Digimon Adventure tri.', tipo: 'movie' },
      { titulo: 'Digimon Adventure: Last Evolution Kizuna', tipo: 'movie' },
      { titulo: 'Digimon Adventure:', tipo: 'tv', nota: 'Reboot 2020, línea aparte' }
    ]
  },
  'yugioh': {
    nombre: 'Yu-Gi-Oh! (línea original) — orden cronológico de la historia',
    items: [
      { titulo: 'Yu-Gi-Oh! Duel Monsters', tipo: 'tv' },
      { titulo: 'Yu-Gi-Oh!: The Movie', tipo: 'movie' },
      { titulo: 'Yu-Gi-Oh!: The Dark Side of Dimensions', tipo: 'movie', nota: 'Epílogo' }
    ]
  },
  'halo': {
    nombre: 'Halo (adaptaciones para pantalla) — orden cronológico de la historia',
    items: [
      { titulo: 'Halo Legends', tipo: 'movie', nota: 'Antología, distintas épocas' },
      { titulo: 'Halo: Forward Unto Dawn', tipo: 'movie' },
      { titulo: 'Halo: Nightfall', tipo: 'tv' },
      { titulo: 'Halo', tipo: 'tv', nota: 'Serie de Paramount+' }
    ]
  },
  'resident-evil': {
    nombre: 'Resident Evil (saga con Milla Jovovich) — orden cronológico de la historia',
    items: [
      { titulo: 'Resident Evil', tipo: 'movie' },
      { titulo: 'Resident Evil: Apocalypse', tipo: 'movie' },
      { titulo: 'Resident Evil: Extinction', tipo: 'movie' },
      { titulo: 'Resident Evil: Afterlife', tipo: 'movie' },
      { titulo: 'Resident Evil: Retribution', tipo: 'movie' },
      { titulo: 'Resident Evil: The Final Chapter', tipo: 'movie' }
    ]
  },
  'monsterverse': {
    nombre: 'Monsterverse (Godzilla/Kong) — orden cronológico de la historia',
    items: [
      { titulo: 'Kong: Skull Island', tipo: 'movie', nota: '1973' },
      { titulo: 'Godzilla', tipo: 'movie', nota: '2014' },
      { titulo: 'Monarch: Legacy of Monsters', tipo: 'tv' },
      { titulo: 'Godzilla: King of the Monsters', tipo: 'movie' },
      { titulo: 'Godzilla vs. Kong', tipo: 'movie' },
      { titulo: 'Godzilla x Kong: The New Empire', tipo: 'movie' }
    ]
  },
  'conjuring': {
    nombre: 'Universo de The Conjuring — orden cronológico de la historia',
    items: [
      { titulo: 'The Nun', tipo: 'movie', nota: '1952' },
      { titulo: 'The Nun II', tipo: 'movie', nota: '1956' },
      { titulo: 'Annabelle: Creation', tipo: 'movie', nota: '1943-1955' },
      { titulo: 'Annabelle', tipo: 'movie', nota: '1967' },
      { titulo: 'The Conjuring', tipo: 'movie', nota: '1971' },
      { titulo: 'Annabelle Comes Home', tipo: 'movie', nota: '1971' },
      { titulo: 'The Conjuring 2', tipo: 'movie', nota: '1977' },
      { titulo: 'The Curse of La Llorona', tipo: 'movie', nota: '1973' },
      { titulo: 'The Conjuring: The Devil Made Me Do It', tipo: 'movie', nota: '1981' }
    ]
  },
  'fast-furious': {
    nombre: 'Rápido y Furioso (con cortometrajes) — orden cronológico de la historia',
    items: [
      { titulo: 'The Fast and the Furious', tipo: 'movie' },
      { titulo: 'The Turbo Charged Prelude for 2 Fast 2 Furious', tipo: 'movie', nota: 'Corto' },
      { titulo: '2 Fast 2 Furious', tipo: 'movie' },
      { titulo: 'Los Bandoleros', tipo: 'movie', nota: 'Corto' },
      { titulo: 'Fast & Furious', tipo: 'movie' },
      { titulo: 'Fast Five', tipo: 'movie' },
      { titulo: 'Fast & Furious 6', tipo: 'movie' },
      { titulo: 'The Fast and the Furious: Tokyo Drift', tipo: 'movie', nota: 'Pasa cronológicamente después de la 6, por Han' },
      { titulo: 'Furious 7', tipo: 'movie' },
      { titulo: 'The Fate of the Furious', tipo: 'movie' },
      { titulo: 'Fast & Furious Presents: Hobbs & Shaw', tipo: 'movie', nota: 'Historia paralela' },
      { titulo: 'F9', tipo: 'movie' },
      { titulo: 'Fast X', tipo: 'movie' }
    ]
  }
};

// Caché en Mongo: una vez que resolvemos "Iron Man" -> ficha real de TMDB con su
// póster y año, no lo volvemos a buscar. Esta lista prácticamente no cambia.
const cronologiaCacheSchema = new mongoose.Schema({
  clave: { type: String, required: true, unique: true },
  tmdbId: Number,
  poster: String,
  anio: String,
  fecha: { type: Date, default: Date.now }
});
const CronologiaCache = mongoose.model('CronologiaCache', cronologiaCacheSchema);

async function resolverItem(hacerPeticion, apiKey, franquiciaKey, item, idioma) {
  const clave = `${franquiciaKey}::${item.tipo}::${item.titulo}`.toLowerCase();

  try {
    const enCache = await CronologiaCache.findOne({ clave });
    if (enCache) return { ...item, tmdbId: enCache.tmdbId, poster: enCache.poster, anio: enCache.anio };
  } catch (e) {}

  let resultado = null;
  try {
    const resultados = item.tipo === 'movie'
      ? await buscarPeliculas(hacerPeticion, apiKey, item.titulo, idioma)
      : await buscarSeries(hacerPeticion, apiKey, item.titulo, idioma);
    if (resultados && resultados.length > 0) resultado = resultados[0];
  } catch (e) {
    console.error('[Cronología] error al resolver', item.titulo, e.message);
  }

  const tmdbId = resultado ? resultado.id : null;
  const poster = resultado ? imagenTMDB(resultado.poster_path, 'w342') : '';
  const anio = resultado ? (resultado.release_date || resultado.first_air_date || '').substring(0, 4) : '';

  try { await CronologiaCache.create({ clave, tmdbId, poster, anio }); } catch (e) {}

  return { ...item, tmdbId, poster, anio };
}

// Resuelve la franquicia completa, uno por uno (no en paralelo, para no golpear
// la cuota de TMDB de una — igual solo pega la API real la primera vez que se
// pide cada título, después sale del caché).
async function resolverFranquiciaCompleta(hacerPeticion, apiKey, franquiciaKey, idioma) {
  const franquicia = FRANQUICIAS[franquiciaKey];
  if (!franquicia) return null;

  const items = [];
  for (const item of franquicia.items) {
    items.push(await resolverItem(hacerPeticion, apiKey, franquiciaKey, item, idioma));
  }
  return { nombre: franquicia.nombre, items };
}

function listaFranquiciasDisponibles() {
  return Object.keys(FRANQUICIAS).map(key => ({ key, nombre: FRANQUICIAS[key].nombre }));
}

module.exports = { resolverFranquiciaCompleta, listaFranquiciasDisponibles };
