require('dotenv').config();
const express = require('express');
const https = require('https');
const mongoose = require('mongoose');
const { buscarPeliculas, buscarSeries, detalleTMDB, coleccionTMDB, imagenTMDB, trailerOficial, proveedoresPorRegion } = require('./tmdb');
const { buscarMusica, obtenerAlbumesArtista, obtenerCancionesAlbum, obtenerBiografiaArtista, buscarEnDeezer } = require('./music');
const { detectarPaisPorIP, idiomaParaRegion, REGIONES_SOPORTADAS } = require('./geo');
const { buscarVideoConCache } = require('./youtube');
const { proximosConciertosEnRegion } = require('./conciertos');
const { buscarEventos } = require('./ticketmaster');
const { t, IDIOMAS_DISPONIBLES } = require('./i18n');
const { obtenerCoordenadasCiudad, buscarLugaresInteresantes, obtenerDetalleLugar } = require('./lugares');
const { resolverFranquiciaCompleta, listaFranquiciasDisponibles } = require('./cronologias');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // Opcional: sin esto, simplemente no hay openings/videos de respaldo
const BANDSINTOWN_APP_ID = process.env.BANDSINTOWN_APP_ID; // Opcional: sin esto, no hay alerta de conciertos
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY; // Opcional: sin esto, no funciona la sección Eventos
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY; // Opcional: sin esto, no funciona la sección Qué hacer

if (!MONGO_URI) console.error('[x] Falta MONGO_URI en el archivo .env');
if (!TMDB_API_KEY) console.error('[x] Falta TMDB_API_KEY en el archivo .env');

mongoose.connect(MONGO_URI)
  .then(() => console.log('[OK] Conectado a MongoDB Atlas'))
  .catch(err => console.error('[ERROR] MongoDB:', err.message));

const busquedaSchema = new mongoose.Schema({
  nombre: String,
  generos: String,
  rating: String,
  tipo: { type: String, default: 'contenido' },
  fecha: { type: Date, default: Date.now }
});
const Busqueda = mongoose.model('Busqueda', busquedaSchema);

function hacerPeticion(urlApi) {
  return new Promise((resolve, reject) => {
    https.get(urlApi, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let datos = '';
      res.on('data', (chunk) => { datos += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(datos)); } catch (e) { reject(e); }
      });
    }).on('error', (err) => { reject(err); });
  });
}

// Escapa caracteres especiales antes de insertar cualquier dato (de TMDB, Deezer, iTunes,
// o lo que haya escrito el usuario) en el HTML. Previene inyección de código (XSS).
// Sin esto, un título con caracteres como < > " podría romper la página o ejecutar
// código no deseado en el navegador de quien la visite.
function escaparHTML(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const estilosGlobales = `
<style>
* { box-sizing: border-box; }
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #050508; color: #ffffff; margin: 0; padding: 0; min-height: 100vh;
}
.navbar {
  position: sticky; top: 0; z-index: 1000; background: rgba(10,10,14,0.9); backdrop-filter: blur(14px);
  padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap; gap: 10px;
}
.navbar a { text-decoration: none; color: #4CAF50; font-size: 1.4rem; font-weight: bold; }
.controls-group { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; width: 100%; }
.region-select, .mode-select {
  padding: 8px 14px; font-size: 14px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.6); color: white;
}
.search-box { display: flex; gap: 8px; width: 100%; }
.search-box input {
  padding: 10px 16px; font-size: 14px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: white; flex: 1;
}
.search-box button {
  padding: 10px 18px; font-size: 14px; border-radius: 20px; border: none;
  background: #4CAF50; color: white; font-weight: bold;
}
.tabs-container {
  background: rgba(12,12,16,0.85); padding: 12px 20px; display: flex; gap: 10px;
  overflow-x: auto; white-space: nowrap; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.tab-btn {
  display: inline-block; padding: 8px 14px; border-radius: 16px;
  background: rgba(25,25,35,0.7); color: #ccc; text-decoration: none;
  font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.15);
}
.tab-btn.active { background: #4CAF50; color: white; font-weight: bold; border-color: #4CAF50; }
.poster-view {
  max-width: 1000px; margin: 20px auto; padding: 20px;
  background: rgba(10,10,15,0.88); border-radius: 16px; border: 1px solid rgba(255,255,255,0.15);
}
.content-grid { display: flex; flex-direction: column; gap: 20px; }
.poster-img-container { width: 100%; text-align: center; }
.poster-img { width: 100%; max-width: 250px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); }
h2 { font-size: 2rem; color: #4CAF50; margin-top: 0; }
p { font-size: 1.05rem; line-height: 1.6; color: #f0f0f0; }
p b { color: #ffffff; }
.streaming-section { margin-top: 25px; }
.streaming-title { font-size: 1.1rem; color: #4CAF50; margin-bottom: 12px; font-weight: bold; }
.streaming-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.stream-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px;
  border-radius: 20px; text-decoration: none; font-size: 0.9rem; font-weight: bold; color: white;
}
.btn-spotify { background: #1DB954; }
.btn-apple { background: rgba(50,50,50,0.9); border: 1px solid rgba(255,255,255,0.2); }
.btn-youtube { background: #FF0000; }
.btn-tickets { background: #FF5722; }
/* Video flotante estilo Picture-in-Picture (PiP) */
/* Video de fondo de pantalla completo (el mismo video, difuminado, atrás de todo) */
.bg-video-container {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: -2; overflow: hidden; pointer-events: none;
}
.bg-video-container iframe {
  position: absolute; top: 50%; left: 50%;
  width: 100vw; height: 56.25vw; min-height: 100vh; min-width: 177.77vh;
  transform: translate(-50%, -50%); border: 0;
  filter: blur(1px) brightness(1.15) saturate(1.15);
}
.bg-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: radial-gradient(circle, rgba(5,5,8,0.10) 0%, rgba(5,5,8,0.40) 100%);
  z-index: -1; pointer-events: none;
}
@media (max-width: 768px) {
  .bg-video-container, .bg-overlay { display: none !important; }
}
/* Video grande embebido arriba de la ficha (el mismo video, con controles y sonido) */
.trailer-frame {
  position: relative; padding-bottom: 56.25%; height: 0;
  max-width: 800px; margin: 0 auto 20px; border-radius: 14px; overflow: hidden;
  box-shadow: 0 10px 35px rgba(0,0,0,0.6); background: #000;
}
.trailer-frame iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
.sound-toggle-btn {
  position: fixed; bottom: 20px; right: 20px; z-index: 2000;
  background: rgba(15,15,20,0.85); backdrop-filter: blur(12px); color: white; border: 2px solid #4CAF50;
  padding: 10px 18px; border-radius: 30px; font-size: 0.95rem; font-weight: bold; cursor: pointer;
}
.provider-logo-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; border-radius: 12px; background: rgba(30,30,30,0.85);
  padding: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}
.provider-logo-btn img { width: 100%; height: 100%; border-radius: 8px; object-fit: cover; }

.album-dropdown {
  background: rgba(20,20,25,0.7); border-radius: 12px; margin-bottom: 8px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
}
.album-dropdown summary {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer;
  list-style: none; font-weight: bold;
}
.album-dropdown summary::-webkit-details-marker { display: none; }
.album-dropdown summary img { width: 45px; height: 45px; border-radius: 6px; object-fit: cover; }
.album-tracklist { padding: 5px 14px 14px; }
.track-row {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap;
}
.track-row audio { height: 32px; max-width: 220px; }
.sticky-alert {
  position: fixed; bottom: 0; left: 0; width: 100%; z-index: 3000;
  background: linear-gradient(90deg, #FF5722, #FF9800); color: #1a0a00; font-weight: bold;
  padding: 14px 45px 14px 20px; display: flex; align-items: center; justify-content: center;
  gap: 12px; flex-wrap: wrap; text-align: center; box-shadow: 0 -4px 20px rgba(0,0,0,0.4);
  font-size: 0.95rem;
}
.sticky-alert a { color: #1a0a00; text-decoration: underline; }
.sticky-alert .close-alert {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: rgba(0,0,0,0.2); border: none; color: #1a0a00; font-weight: bold;
  border-radius: 50%; width: 26px; height: 26px; cursor: pointer;
}
.event-list { display: flex; flex-direction: column; gap: 14px; }
.event-card {
  display: flex; gap: 15px; background: rgba(20,20,25,0.7); border-radius: 14px;
  padding: 14px; border: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap;
}
.event-img { width: 120px; height: 120px; object-fit: cover; border-radius: 10px; flex-shrink: 0; }
.event-info { flex: 1; min-width: 200px; }
.event-info h3 { margin: 0 0 6px; color: #4CAF50; }
.event-info p { margin: 3px 0; font-size: 0.9rem; color: #ccc; }
.cronologia-list { display: flex; flex-direction: column; gap: 8px; }
.cronologia-item {
  display: flex; align-items: center; gap: 14px; padding: 10px; border-radius: 12px;
  background: rgba(20,20,25,0.6); text-decoration: none; color: white;
  border: 1px solid rgba(255,255,255,0.06);
}
.cronologia-item:hover { background: rgba(76,175,80,0.15); }
.cronologia-numero {
  flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; background: #4CAF50;
  color: #041108; font-weight: bold; display: flex; align-items: center; justify-content: center;
}
.cronologia-item img { width: 140px; height: 200px; object-fit: cover; border-radius: 10px; flex-shrink: 0; }
.cronologia-sin-poster {
  width: 140px; height: 200px; border-radius: 10px; background: rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: center; font-size: 3rem; flex-shrink: 0;
}
.cronologia-titulo { font-weight: bold; font-size: 1.1rem; }
.cronologia-nota { font-size: 0.85rem; color: #888; margin-top: 4px; }

/* Cuadro de atribución de fuentes de datos */
.attribution-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 5000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.attribution-box {
  max-width: 480px; background: rgba(15,15,20,0.98); border: 1px solid rgba(255,255,255,0.15);
  border-radius: 16px; padding: 25px; box-shadow: 0 15px 40px rgba(0,0,0,0.6);
}
.attribution-box h3 { color: #4CAF50; margin-top: 0; }
.attribution-box p { font-size: 0.95rem; color: #ddd; line-height: 1.5; }
.attribution-box button {
  margin-top: 15px; background: #4CAF50; color: white; border: none;
  padding: 10px 22px; border-radius: 20px; font-weight: bold; cursor: pointer; width: 100%;
}
@media (min-width: 769px) {
  .content-grid { flex-direction: row; gap: 30px; }
  .poster-img-container { width: 280px; flex-shrink: 0; }
  .poster-view { max-width: 1050px; padding: 35px 45px; }
}
</style>
`;

// Genera el bloque de trailer como un video flotante estilo Picture-in-Picture (PiP),
// fijo en la esquina inferior, visible siempre que se navegue por la página.
// Intenta arrancar CON sonido; si el navegador lo bloquea (política del navegador,
// no se puede forzar desde el código), cae a silencioso automáticamente.
// El botón de silenciar/activar queda siempre visible en la otra esquina.
// Genera el bloque de trailer como un video GRANDE, embebido arriba de la ficha
// (no flotante). Intenta arrancar CON sonido; si el navegador lo bloquea (política
// del navegador, no se puede forzar desde el código), cae a silencioso automáticamente.
// El botón de silenciar/activar queda siempre visible flotando en la esquina.
// Genera el bloque de trailer:
// - De fondo: el MISMO video, difuminado, ocupando toda la pantalla (silencioso, es decorativo).
// - Al frente: el reproductor grande de siempre, que intenta sonar CON audio desde el arranque;
//   si el navegador lo bloquea (política del navegador, no se puede forzar desde el código),
//   cae a silencioso automáticamente. El botón de silenciar/activar queda siempre visible.
// Alerta fija abajo de la página (usada tanto para estrenos de cine como para conciertos).
// Se puede cerrar con la "X"; vuelve a aparecer si se recarga la página o se busca otra cosa.
// Clasifica un evento para saber qué sonido ponerle al hacer clic:
// deportes -> corneta sintetizada (no es un archivo de audio de nadie, se genera en el navegador)
// religioso -> canción de Enigma (vía Deezer, igual que en la sección Música)
// música -> canción real del artista principal (vía Deezer)
// cualquier otro -> sin sonido especial
function categorizarEvento(ev) {
  const texto = `${ev.nombre} ${ev.categoria || ''}`.toLowerCase();
  if (ev.categoria && ev.categoria.toLowerCase().includes('sport')) return 'deportes';
  if (/iglesia|church|cristian|christian|cat[oó]lic|worship|misa|ministerio|ministry|gospel/.test(texto)) return 'religioso';
  if (ev.categoria && ev.categoria.toLowerCase().includes('music')) return 'musica';
  return 'otro';
}

function bloqueAlertaFija(mensajeHTML) {
  if (!mensajeHTML) return '';
  return `<div class="sticky-alert">${mensajeHTML}<button class="close-alert" onclick="this.parentElement.remove()">✕</button></div>`;
}

function bloqueTrailer(videoId, esMovil) {
  if (!videoId) return '';

  return `
    <div class="bg-video-container">
      <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&showinfo=0" allow="autoplay" title="Fondo"></iframe>
    </div>
    <div class="bg-overlay"></div>

    <div class="trailer-frame"><div id="yt-trailer"></div></div>
    <button id="soundBtn" class="sound-toggle-btn" onclick="toggleTrailerSound()">🔈 Silenciar</button>
    <script>
      var trailerPlayer, trailerMuted = false;
      var ytTag = document.createElement('script');
      ytTag.src = "https://www.youtube.com/iframe_api";
      document.getElementsByTagName('script')[0].parentNode.insertBefore(ytTag, document.getElementsByTagName('script')[0]);

      function onYouTubeIframeAPIReady() {
        trailerPlayer = new YT.Player('yt-trailer', {
          height: '100%', width: '100%', videoId: '${videoId}',
          playerVars: { autoplay: 1, mute: 0, controls: 1, playsinline: 1, modestbranding: 1 },
          events: {
            onReady: function(event) {
              event.target.setVolume(40);
              event.target.playVideo();
              setTimeout(function() {
                if (event.target.getPlayerState() !== 1) {
                  event.target.mute();
                  trailerMuted = true;
                  document.getElementById('soundBtn').innerHTML = '🔇 Activar sonido';
                  event.target.playVideo();
                }
              }, 700);
            }
          }
        });
      }

      function toggleTrailerSound() {
        if (!trailerPlayer) return;
        if (trailerMuted) {
          trailerPlayer.unMute();
          document.getElementById('soundBtn').innerHTML = '🔈 Silenciar';
          trailerMuted = false;
        } else {
          trailerPlayer.mute();
          document.getElementById('soundBtn').innerHTML = '🔇 Activar sonido';
          trailerMuted = true;
        }
      }
    </script>
  `;
}

// Cuadro de atribución de fuentes de datos (aparece una vez, se recuerda en el navegador)
const cuadroAtribucion = `
  <div id="attributionOverlay" class="attribution-overlay" style="display:none;">
    <div class="attribution-box">
      <h3>Sobre el contenido de esta página</h3>
      <p>
        La información de películas y series (sinopsis, reparto, pósters, trailers) proviene de
        <b>TMDB (The Movie Database)</b>. La información musical proviene de <b>Deezer</b> y
        <b>Apple iTunes</b>. Los videos se muestran a través del reproductor oficial embebido de
        <b>YouTube</b>. No alojamos ni reclamamos derechos sobre ningún contenido; todo pertenece
        a sus respectivos dueños y plataformas.
      </p>
      <p style="font-size:0.8rem; color:#888;">
        Este producto usa la API de TMDB pero no está aprobado ni certificado por TMDB.
      </p>
      <button onclick="cerrarAtribucion()">Entendido</button>
    </div>
  </div>
  <script>
    function cerrarAtribucion() {
      document.getElementById('attributionOverlay').style.display = 'none';
      localStorage.setItem('atribucionVista', 'true');
    }
    if (!localStorage.getItem('atribucionVista')) {
      document.getElementById('attributionOverlay').style.display = 'flex';
    }
  </script>
`;

// Se llama al hacer clic en un evento de música o religioso, para traer una previsualización real.
// Los eventos deportivos NO llaman a esto — su sonido se genera en el navegador (ver reproducirFanfarreaDeportiva).
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Página dedicada a mostrar una cronología curada a mano (Star Wars, MCU, etc.)
app.get('/cronologia/:clave', async (req, res) => {
  const region = req.query.region || 'mx';
  let idioma = idiomaParaRegion(region);
  if (req.query.idioma && IDIOMAS_DISPONIBLES.includes(req.query.idioma)) idioma = req.query.idioma;

  const resultado = await resolverFranquiciaCompleta(hacerPeticion, TMDB_API_KEY, req.params.clave, idioma);

  let contenidoHTML = '';
  if (!resultado) {
    contenidoHTML = `<div class="poster-view" style="text-align:center;"><h2>Esa cronología no existe</h2></div>`;
  } else {
    contenidoHTML = `
      <div class="poster-view">
        <h2 style="margin-bottom:20px;">${escaparHTML(resultado.nombre)}</h2>
        <div class="cronologia-list">
          ${resultado.items.map((item, idx) => `
            <a href="/?q=${encodeURIComponent(item.titulo)}&region=${region}&idioma=${idioma}&mode=${item.tipo === 'movie' ? 'pelicula' : 'serie'}" class="cronologia-item">
              <span class="cronologia-numero">${idx + 1}</span>
              ${item.poster ? `<img src="${escaparHTML(item.poster)}" alt="">` : `<div class="cronologia-sin-poster">${item.tipo === 'movie' ? '🎬' : '📺'}</div>`}
              <div>
                <div class="cronologia-titulo">${escaparHTML(item.titulo)}${item.anio ? ` (${item.anio})` : ''}</div>
                ${item.nota ? `<div class="cronologia-nota">${escaparHTML(item.nota)}</div>` : ''}
              </div>
            </a>
          `).join('')}
        </div>
      </div>`;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cronología — MEAN Cinema</title>
      ${estilosGlobales}
    </head>
    <body>
      ${cuadroAtribucion}
      <div class="navbar">
        <a href="/">MEAN Cinema</a>
        <a href="/" style="color:#ccc; text-decoration:none; font-size:0.9rem;">← Volver al buscador</a>
      </div>
      <div style="padding-bottom: 40px;">${contenidoHTML}</div>
      <footer style="text-align:center; padding:30px 20px 40px; color:#888; font-size:0.85rem; border-top:1px solid rgba(255,255,255,0.08); margin-top:30px;">
        <p style="margin:4px 0;">Hecho con 💚 por <b style="color:#4CAF50;">Dani</b></p>
        <p style="margin:4px 0;">¿Preguntas o dudas? <a href="mailto:dcastillohor@yahoo.com" style="color:#4CAF50;">dcastillohor@yahoo.com</a></p>
      </footer>
    </body>
    </html>
  `);
});

app.get('/api/evento-sonido', async (req, res) => {
  const categoria = req.query.categoria || '';
  const nombre = req.query.nombre || '';
  try {
    let preview = null;
    if (categoria === 'religioso') {
      const resultados = await buscarEnDeezer(hacerPeticion, 'Enigma');
      preview = resultados[0] ? resultados[0].preview : null;
    } else if (categoria === 'musica' && nombre) {
      const resultados = await buscarEnDeezer(hacerPeticion, nombre);
      preview = resultados[0] ? resultados[0].preview : null;
    }
    res.json({ preview });
  } catch (e) {
    res.json({ preview: null });
  }
});

// Se llama desde el navegador cuando alguien abre un álbum en el desplegable de discografía.
app.get('/api/album/:id', async (req, res) => {
  try {
    const canciones = await obtenerCancionesAlbum(hacerPeticion, req.params.id);
    res.json({ canciones });
  } catch (e) {
    res.status(500).json({ canciones: [], error: 'No se pudo cargar el álbum' });
  }
});

// Se llama al abrir un lugar en el desplegable de "Qué hacer".
// Usamos query string (?id=...) en vez de parte de la URL, porque el place_id
// de Geoapify puede traer caracteres como "/" que rompen el ruteo de Express.
app.get('/api/lugar', async (req, res) => {
  try {
    const detalle = await obtenerDetalleLugar(hacerPeticion, GEOAPIFY_API_KEY, req.query.id);
    res.json(detalle || {});
  } catch (e) {
    res.status(500).json({});
  }
});

app.get('/', async (req, res) => {
  let query = req.query.q ? req.query.q.trim() : '';
  const mode = req.query.mode || 'pelicula'; // 'pelicula' | 'serie' | 'musica'
  const indexParam = parseInt(req.query.index) || 0;

  const userAgent = req.headers['user-agent'] || '';
  const esMovil = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());

  // Región: si el usuario ya la eligió manualmente (desde el selector), respetamos esa.
  // Si no vino en la URL, intentamos detectar el país automáticamente por IP.
  let region = req.query.region;
  if (!region) {
    const ipCliente = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const paisDetectado = await detectarPaisPorIP(hacerPeticion, ipCliente);
    region = REGIONES_SOPORTADAS.includes(paisDetectado) ? paisDetectado : (paisDetectado || 'mx');
  }
  let idioma = idiomaParaRegion(region);
  if (req.query.idioma && IDIOMAS_DISPONIBLES.includes(req.query.idioma)) {
    idioma = req.query.idioma;
  }

  let contenidoHTML = '';
  let tabsHTML = '';

  if (mode === 'cronologia') {
    // ---------- CRONOLOGÍAS (curadas a mano) ----------
    const franquicias = listaFranquiciasDisponibles();
    contenidoHTML = `
      <div class="poster-view">
        <h2 style="margin-bottom:5px;">Cronologías</h2>
        <p style="color:#888; font-size:0.85rem; margin-top:0;">Orden narrativo recomendado, curado a mano — no es el orden de estreno.</p>
        <div class="cronologia-list">
          ${franquicias.map(f => `
            <a href="/cronologia/${f.key}?region=${region}&idioma=${idioma}" class="cronologia-item">
              <span class="cronologia-numero">📖</span>
              <div class="cronologia-titulo">${escaparHTML(f.nombre)}</div>
            </a>
          `).join('')}
        </div>
      </div>`;

  } else if (query || mode === 'eventos' || mode === 'quehacer') {
    if (mode === 'quehacer') {
      // ---------- QUÉ HACER (OpenTripMap) ----------
      try {
        if (!GEOAPIFY_API_KEY) {
          contenidoHTML = `<div class="poster-view" style="text-align:center;"><h2>Falta configurar la API de lugares</h2><p style="color:#888;">(Esto lo resuelve quien administra el sitio)</p></div>`;
        } else if (!req.query.ciudad) {
          contenidoHTML = `<div class="poster-view" style="text-align:center;"><h2>Escribí una ciudad para empezar</h2><p>Ej: Toronto, Madrid, Ciudad de México...</p></div>`;
        } else {
          const coords = await obtenerCoordenadasCiudad(hacerPeticion, GEOAPIFY_API_KEY, req.query.ciudad);
          if (!coords) {
            contenidoHTML = `<div class="poster-view" style="text-align:center;"><h2>No pudimos encontrar "${escaparHTML(req.query.ciudad)}"</h2></div>`;
          } else {
            const lugares = await buscarLugaresInteresantes(hacerPeticion, GEOAPIFY_API_KEY, coords.lat, coords.lon);
            if (lugares.length > 0) {
              contenidoHTML = `
                <div class="poster-view">
                  <p style="margin:4px 0;">Hecho con 💚 por <b style="color:#4CAF50;">Dani</b></p>
                  <p style="color:#888; font-size:0.85rem; margin-top:0;">Tocá un lugar para ver más info</p>
                  ${lugares.map(l => `
                    <details class="album-dropdown" data-placeid="${escaparHTML(l.placeId)}">
                      <summary><span>${escaparHTML(l.nombre)} <small style="color:#888;">(${escaparHTML(l.categoria)})</small></span></summary>
                      <div class="album-tracklist lugar-detalle">Cargando información…</div>
                    </details>
                  `).join('')}
                </div>
                <script>
                  document.querySelectorAll('.album-dropdown[data-placeid]').forEach(function(det) {
                    var cargado = false;
                    det.addEventListener('toggle', function() {
                      if (det.open && !cargado) {
                        cargado = true;
                        var contenedor = det.querySelector('.lugar-detalle');
                        fetch('/api/lugar?id=' + encodeURIComponent(det.dataset.placeid))
                          .then(function(r) { return r.json(); })
                          .then(function(data) {
                            if (!data || !data.nombre) {
                              contenedor.innerHTML = 'No se pudo cargar la información.';
                              return;
                            }
                            var mapaUrl = (data.lat && data.lon) ? 'https://www.google.com/maps?q=' + data.lat + ',' + data.lon : '';
                            contenedor.innerHTML =
                              (data.direccion ? '<p>' + data.direccion.replace(/</g,'&lt;') + '</p>' : '') +
                              (data.horario ? '<p><b>Horario:</b> ' + data.horario.replace(/</g,'&lt;') + '</p>' : '') +
                              (data.sitioWeb ? '<a href="' + data.sitioWeb + '" target="_blank" style="color:#4CAF50; display:block; margin-bottom:6px;">Sitio web</a>' : '') +
                              (data.wikipediaUrl ? '<a href="' + data.wikipediaUrl + '" target="_blank" style="color:#4CAF50; display:block; margin-bottom:6px;">Ver en Wikipedia</a>' : '') +
                              (mapaUrl ? '<a href="' + mapaUrl + '" target="_blank" style="color:#4CAF50; display:block;">Ver en el mapa</a>' : '');
                          })
                          .catch(function() { contenedor.innerHTML = 'Error al cargar.'; });
                      }
                    });
                  });
                </script>`;
            } else {
              contenidoHTML = `<div class="poster-view" style="text-align:center;"><h2>No se encontraron lugares en ${escaparHTML(req.query.ciudad)}</h2></div>`;
            }
          }
        }
      } catch (err) {
        console.error('[Qué hacer] error:', err.message);
        contenidoHTML = `<div class="poster-view"><h2>Error al buscar lugares</h2></div>`;
      }

    } else if (mode === 'eventos') {
      // ---------- EVENTOS (Ticketmaster Discovery API) ----------
      try {
        const eventos = await buscarEventos(hacerPeticion, TICKETMASTER_API_KEY, {
          countryCode: region,
          ciudad: req.query.ciudad || '',
          palabraClave: query
        });

        if (!TICKETMASTER_API_KEY) {
          contenidoHTML = `<div class="poster-view" style="text-align:center;"><h2>Falta configurar la API de eventos</h2><p style="color:#888;">(Esto lo resuelve quien administra el sitio)</p></div>`;
        } else if (eventos.length > 0) {
          contenidoHTML = `
            <div class="poster-view">
              <h2 style="margin-bottom:5px;">Eventos en ${req.query.ciudad ? escaparHTML(req.query.ciudad) + ', ' : ''}${region.toUpperCase()}</h2>
              <p style="color:#888; font-size:0.85rem; margin-top:0;">Tocá un evento para escuchar algo relacionado 🔊</p>
              <div class="event-list">
                ${eventos.map(ev => {
                  const categoria = categorizarEvento(ev);
                  const nombreParaSonido = categoria === 'musica' ? (ev.artistaPrincipal || ev.nombre) : ev.nombre;
                  return `
                  <div class="event-card">
                    ${ev.imagen ? `<img src="${escaparHTML(ev.imagen)}" alt="" class="event-img">` : ''}
                    <div class="event-info" data-categoria="${categoria}" data-nombre="${escaparHTML(nombreParaSonido)}" onclick="reproducirSonidoEvento(this)" style="cursor:pointer;">
                      <h3>${escaparHTML(ev.nombre)} ${categoria !== 'otro' ? '🔊' : ''}</h3>
                      <p>${ev.categoria ? escaparHTML(ev.categoria) + ' — ' : ''}${ev.recinto ? escaparHTML(ev.recinto) + ', ' : ''}${escaparHTML(ev.ciudad)}${ev.provincia ? ', ' + escaparHTML(ev.provincia) : ''}</p>
                      <p>${ev.fecha ? escaparHTML(ev.fecha) : 'Fecha por confirmar'}${ev.hora ? ' — ' + escaparHTML(ev.hora) : ''}</p>
                      <a href="${escaparHTML(ev.linkCompra)}" target="_blank" class="stream-btn btn-tickets" onclick="event.stopPropagation();">Comprar entradas</a>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>
            <script>
              var audioEventoGlobal = null;

              function reproducirSonidoEvento(el) {
                var categoria = el.dataset.categoria;
                var nombre = el.dataset.nombre;

                if (categoria === 'deportes') {
                  reproducirFanfarreaDeportiva();
                  return;
                }
                if (categoria === 'musica' || categoria === 'religioso') {
                  fetch('/api/evento-sonido?categoria=' + encodeURIComponent(categoria) + '&nombre=' + encodeURIComponent(nombre))
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                      if (data.preview) {
                        if (!audioEventoGlobal) audioEventoGlobal = new Audio();
                        audioEventoGlobal.src = data.preview;
                        audioEventoGlobal.play();
                      }
                    });
                }
              }

              // Sintetiza el clásico toque de corneta de estadio ("Charge!") con el Web Audio API.
              // No usa ningún archivo de audio — las notas se generan matemáticamente en el navegador.
              function reproducirFanfarreaDeportiva() {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var notas = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
                var inicio = ctx.currentTime;
                notas.forEach(function(freq, i) {
                  var osc = ctx.createOscillator();
                  var gain = ctx.createGain();
                  osc.type = 'square';
                  osc.frequency.value = freq;
                  gain.gain.setValueAtTime(0.2, inicio + i * 0.12);
                  gain.gain.exponentialRampToValueAtTime(0.001, inicio + i * 0.12 + 0.11);
                  osc.connect(gain).connect(ctx.destination);
                  osc.start(inicio + i * 0.12);
                  osc.stop(inicio + i * 0.12 + 0.12);
                });
              }
            </script>`;
        } else {
          contenidoHTML = `<div class="poster-view" style="text-align:center;"><h2>No se encontraron eventos${req.query.ciudad ? ' en ' + escaparHTML(req.query.ciudad) : ''}</h2><p>Probá con otra ciudad o dejá el campo de búsqueda vacío para ver todo lo disponible.</p></div>`;
        }
      } catch (err) {
        console.error('[Eventos] error:', err.message);
        contenidoHTML = `<div class="poster-view"><h2>Error al buscar eventos</h2></div>`;
      }

    } else if (mode === 'musica') {
      // ---------- MÚSICA (Deezer + iTunes de respaldo) ----------
      try {
        const resultados = await buscarMusica(hacerPeticion, query);

        if (resultados.length > 0) {
          if (resultados.length > 1) {
            tabsHTML = `<div class="tabs-container">`;
            resultados.forEach((track, idx) => {
              const activeClass = idx === indexParam ? 'active' : '';
              tabsHTML += `<a href="/?q=${encodeURIComponent(req.query.q)}&region=${region}&mode=musica&index=${idx}" class="tab-btn ${activeClass}">${escaparHTML(track.titulo)} - ${escaparHTML(track.artista)}</a>`;
            });
            tabsHTML += `</div>`;
          }

          const selectedIndex = indexParam < resultados.length ? indexParam : 0;
          const track = resultados[selectedIndex];
          const minutos = Math.floor(track.duracion / 60);
          const segundos = track.duracion % 60;
          const duracionFormateada = `${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;

          const spotifySearch = `https://open.spotify.com/search/${encodeURIComponent(track.titulo + ' ' + track.artista)}`;
          const appleMusicSearch = `https://music.apple.com/${region}/search?term=${encodeURIComponent(track.titulo + ' ' + track.artista)}`;
          const bandsintownUrl = `https://www.bandsintown.com/a/${encodeURIComponent(track.artista)}?came_from=256`;
          const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(track.titulo + ' ' + track.artista + ' official video')}`;

          // Biografía (independiente de la fuente) y discografía (solo si tenemos artistaId de Deezer)
          const [bio, albumes] = await Promise.all([
            obtenerBiografiaArtista(hacerPeticion, track.artista),
            obtenerAlbumesArtista(hacerPeticion, track.artistaId)
          ]);

          // Video musical oficial (con caché en Mongo para no gastar cuota de YouTube de más)
          let videoMusicalId = null;
          if (YOUTUBE_API_KEY) {
            videoMusicalId = await buscarVideoConCache(hacerPeticion, YOUTUBE_API_KEY, `${track.titulo} ${track.artista} official video`);
          }

          // Alerta de concierto real en la región buscada
          let alertaConciertoHTML = '';
          if (BANDSINTOWN_APP_ID) {
            const conciertos = await proximosConciertosEnRegion(hacerPeticion, BANDSINTOWN_APP_ID, track.artista, region);
            if (conciertos.length > 0) {
              const ev = conciertos[0];
              const fechaTexto = ev.fecha
                ? new Date(ev.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'fecha por confirmar';
              const linkFinal = ev.linkTickets || bandsintownUrl;
              alertaConciertoHTML = bloqueAlertaFija(`
                🎟️ <b>${escaparHTML(track.artista)}</b> va a estar en concierto en tu región
                el <b>${escaparHTML(fechaTexto)}</b>${ev.recinto ? ` en ${escaparHTML(ev.recinto)}` : ''}${ev.ciudad ? `, ${escaparHTML(ev.ciudad)}` : ''}.
                <a href="${escaparHTML(linkFinal)}" target="_blank">Comprar entradas</a>
              `);
            }
          }

          const bioHTML = bio && bio.biografia
            ? `
              <div class="streaming-section">
                <div class="streaming-title">${t('sobre', idioma)} ${escaparHTML(track.artista)}</div>
                <p>${escaparHTML(bio.biografia.substring(0, 700))}${bio.biografia.length > 700 ? '…' : ''}</p>
                ${bio.generoMusical || bio.paisOrigen || bio.anioFormacion ? `
                  <p style="color:#aaa; font-size:0.9rem;">
                    ${bio.generoMusical ? `<b>Género:</b> ${escaparHTML(bio.generoMusical)} &nbsp;` : ''}
                    ${bio.paisOrigen ? `<b>Origen:</b> ${escaparHTML(bio.paisOrigen)} &nbsp;` : ''}
                    ${bio.anioFormacion ? `<b>Desde:</b> ${escaparHTML(String(bio.anioFormacion))}` : ''}
                  </p>` : ''}
              </div>`
            : '';

          const discografiaHTML = albumes.length > 0
            ? `
              <div class="streaming-section">
                <div class="streaming-title">${t('discografia', idioma)} (${albumes.length})</div>
                ${albumes.map(album => `
                  <details class="album-dropdown" data-album-id="${album.id}">
                    <summary>
                      ${album.portada ? `<img src="${escaparHTML(album.portada)}" alt="">` : ''}
                      <span>${escaparHTML(album.titulo)}${album.anio ? ' (' + album.anio + ')' : ''}</span>
                    </summary>
                    <div class="album-tracklist">Cargando canciones…</div>
                  </details>
                `).join('')}
              </div>
              <script>
                document.querySelectorAll('.album-dropdown').forEach(function(det) {
                  var cargado = false;
                  det.addEventListener('toggle', function() {
                    if (det.open && !cargado) {
                      cargado = true;
                      var contenedor = det.querySelector('.album-tracklist');
                      fetch('/api/album/' + det.dataset.albumId)
                        .then(function(r) { return r.json(); })
                        .then(function(data) {
                          if (!data.canciones || data.canciones.length === 0) {
                            contenedor.innerHTML = 'No se pudieron cargar las canciones.';
                            return;
                          }
                          contenedor.innerHTML = data.canciones.map(function(c) {
                            var min = Math.floor(c.duracion / 60);
                            var seg = String(c.duracion % 60).padStart(2, '0');
                            return '<div class="track-row">' +
                              '<span class="track-name">' + c.titulo.replace(/</g,'&lt;') + ' <small>(' + min + ':' + seg + ')</small></span>' +
                              (c.preview ? '<audio controls preload="none" src="' + c.preview + '"></audio>' : '<span style="color:#888;">Sin previsualización</span>') +
                              '</div>';
                          }).join('');
                        })
                        .catch(function() { contenedor.innerHTML = 'Error al cargar el álbum.'; });
                    }
                  });
                });
              </script>`
            : '';

          contenidoHTML = `
            <div class="poster-view">
              ${bloqueTrailer(videoMusicalId, esMovil)}
              ${alertaConciertoHTML}
              <div class="content-grid">
                ${track.poster ? `<div class="poster-img-container"><img src="${escaparHTML(track.poster)}" alt="${escaparHTML(track.titulo)}" class="poster-img"></div>` : ''}
                <div>
                  <h2>${escaparHTML(track.titulo)}</h2>
                  <p><b>${t('artista', idioma)}:</b> ${escaparHTML(track.artista)}</p>
                  <p><b>${t('album', idioma)}:</b> ${escaparHTML(track.album)}</p>
                  <p><b>${t('duracion', idioma)}:</b> ${duracionFormateada} min</p>
                  <p><b>Conciertos (${region.toUpperCase()}):</b> <a href="${bandsintownUrl}" target="_blank" style="color:#FF5722;">Ver giras de ${escaparHTML(track.artista)}</a></p>
                  ${track.preview ? `
                    <div style="margin:15px 0; background:rgba(0,0,0,0.4); padding:12px; border-radius:10px;">
                      <p style="color:#1DB954;"><b>Previsualización (30 seg):</b></p>
                      <audio controls autoplay style="width:100%;"><source src="${track.preview}" type="audio/mpeg"></audio>
                    </div>` : ''}
                  <div class="streaming-section">
                    <div class="streaming-title">${t('escucharConciertos', idioma)}</div>
                    <div class="streaming-grid">
                      <a href="${spotifySearch}" target="_blank" class="stream-btn btn-spotify">Spotify</a>
                      <a href="${appleMusicSearch}" target="_blank" class="stream-btn btn-apple">Apple Music</a>
                      <a href="${bandsintownUrl}" target="_blank" class="stream-btn btn-tickets">Ver Conciertos</a>
                      <a href="${ytSearchUrl}" target="_blank" class="stream-btn btn-youtube">Ver en YouTube</a>
                    </div>
                  </div>
                  ${bioHTML}
                </div>
              </div>
              ${discografiaHTML}
            </div>`;
        } else {
          contenidoHTML = `<div class="poster-view" style="text-align:center;"><h2>No se encontró "${escaparHTML(query)}"</h2><p>Probá con el nombre exacto de la canción, o "Artista - Canción".</p></div>`;
        }
      } catch (err) {
        console.error('[Música] error:', err.message);
        contenidoHTML = `<div class="poster-view"><h2>Error al consultar el servicio de música</h2></div>`;
      }

    } else {
      // ---------- PELÍCULAS o SERIES (TMDB, por separado) ----------
      try {
        const mediaType = mode === 'serie' ? 'tv' : 'movie';
        const resultados = mode === 'serie'
          ? await buscarSeries(hacerPeticion, TMDB_API_KEY, query, idioma)
          : await buscarPeliculas(hacerPeticion, TMDB_API_KEY, query, idioma);

        if (resultados.length > 0) {
          if (resultados.length > 1) {
            tabsHTML = `<div class="tabs-container">`;
            resultados.forEach((item, idx) => {
              const titulo = item.title || item.name;
              const anio = (item.release_date || item.first_air_date || '').substring(0, 4);
              const activeClass = idx === indexParam ? 'active' : '';
              tabsHTML += `<a href="/?q=${encodeURIComponent(req.query.q)}&region=${region}&mode=${mode}&index=${idx}" class="tab-btn ${activeClass}">${escaparHTML(titulo)}${anio ? ' (' + anio + ')' : ''}</a>`;
            });
            tabsHTML += `</div>`;
          }

          const selectedIndex = indexParam < resultados.length ? indexParam : 0;
          const seleccionado = resultados[selectedIndex];

          const detalle = await detalleTMDB(hacerPeticion, TMDB_API_KEY, seleccionado.id, mediaType, idioma);

          const nombre = detalle.title || detalle.name || 'N/A';
          const generos = detalle.genres ? detalle.genres.map(g => g.name).join(', ') : 'N/A';
          const estreno = detalle.release_date || detalle.first_air_date || 'N/A';
          const sinopsis = detalle.overview || 'Sin sinopsis disponible.';
          const posterUrl = imagenTMDB(detalle.poster_path, 'w500');
          const rating = detalle.vote_average ? detalle.vote_average.toFixed(1) : 'N/A';
          const productora = detalle.production_companies && detalle.production_companies.length > 0
            ? detalle.production_companies[0].name : 'N/A';
          const reparto = detalle.credits && detalle.credits.cast
            ? detalle.credits.cast.slice(0, 6).map(a => a.name).join(', ') : 'N/A';
          let trailerKey = trailerOficial(detalle.videos);

          // Respaldo: si TMDB no tiene trailer (pasa seguido con anime y series de nicho),
          // buscamos el opening/trailer oficial con la API de YouTube (con caché en Mongo).
          if (!trailerKey && YOUTUBE_API_KEY) {
            const terminoBusqueda = mediaType === 'tv' ? `${nombre} opening official` : `${nombre} official trailer`;
            trailerKey = await buscarVideoConCache(hacerPeticion, YOUTUBE_API_KEY, terminoBusqueda);
          }
          const proveedores = proveedoresPorRegion(detalle['watch/providers'], region);

          // Datos exclusivos de series (TMDB no los tiene para películas, así que solo aplica acá)
          let infoSeriesHTML = '';
          if (mediaType === 'tv') {
            const temporadas = detalle.number_of_seasons ?? 'N/A';
            const episodiosTotales = detalle.number_of_episodes ?? 'N/A';
            const estadoMap = {
              'Returning Series': 'En emisión', 'Ended': 'Finalizada', 'Canceled': 'Cancelada',
              'In Production': 'En producción', 'Planned': 'Planeada', 'Pilot': 'Piloto'
            };
            const estadoSerie = estadoMap[detalle.status] || detalle.status || 'N/A';
            const canalTV = detalle.networks && detalle.networks.length > 0
              ? detalle.networks.map(n => n.name).join(', ') : 'N/A';

            let proximoEpisodioHTML = '';
            if (detalle.next_episode_to_air) {
              const ep = detalle.next_episode_to_air;
              proximoEpisodioHTML = `<p><b>${t('proximoEpisodio', idioma)}:</b> ${ep.season_number}x${ep.episode_number}${ep.name ? ' - "' + escaparHTML(ep.name) + '"' : ''} — ${ep.air_date || '?'}</p>`;
            }

            infoSeriesHTML = `
              <p><b>${t('temporadas', idioma)}:</b> ${temporadas} &nbsp;|&nbsp; <b>${t('episodiosTotales', idioma)}:</b> ${episodiosTotales}</p>
              <p><b>${t('estado', idioma)}:</b> ${escaparHTML(estadoSerie)}</p>
              <p><b>${t('canalCadena', idioma)}:</b> ${escaparHTML(canalTV)}</p>
              ${proximoEpisodioHTML}
            `;
          }

          try {
            await new Busqueda({ nombre, generos, rating: String(rating), tipo: mediaType }).save();
          } catch (dbErr) {}

          let sagaHTML = '';
          if (mediaType === 'movie' && detalle.belongs_to_collection) {
            try {
              const coleccion = await coleccionTMDB(hacerPeticion, TMDB_API_KEY, detalle.belongs_to_collection.id);
              if (coleccion.parts && coleccion.parts.length > 0) {
                sagaHTML = `
                  <div class="streaming-section">
                    <div class="streaming-title">${t('sagaCompleta', idioma)}: ${escaparHTML(coleccion.name)}</div>
                    <div class="streaming-grid">
                      ${coleccion.parts.map(p => `
                        <a href="/?q=${encodeURIComponent(p.title)}&region=${region}&mode=${mode}" class="stream-btn" style="background:rgba(50,50,50,0.7);">
                          ${escaparHTML(p.title)}${p.release_date ? ' (' + p.release_date.substring(0,4) + ')' : ''}
                        </a>`).join('')}
                    </div>
                  </div>`;
              }
            } catch (e) {}
          }

          // Series: TMDB no tiene un "colección" oficial como en películas, así que
          // buscamos otras fichas con nombre parecido (típico en anime, donde cada
          // temporada suele ser una ficha separada) y las mostramos ordenadas por estreno.
          // Es una aproximación por nombre, no un dato oficial garantizado.
          if (mediaType === 'tv') {
            try {
              const nombreBase = nombre.replace(/[:\-–].*$/, '').trim();
              const primeraPalabra = nombreBase.split(' ')[0].toLowerCase();
              const relacionados = await buscarSeries(hacerPeticion, TMDB_API_KEY, nombreBase, idioma);
              const otrasTemporadas = relacionados
                .filter(r => r.id !== seleccionado.id && r.name && r.name.toLowerCase().includes(primeraPalabra))
                .sort((a, b) => new Date(a.first_air_date || '9999') - new Date(b.first_air_date || '9999'));

              if (otrasTemporadas.length > 0) {
                sagaHTML = `
                  <div class="streaming-section">
                    <div class="streaming-title">Otras temporadas / continuaciones (aproximado, por nombre)</div>
                    <div class="streaming-grid">
                      ${otrasTemporadas.map(o => `
                        <a href="/?q=${encodeURIComponent(o.name)}&region=${region}&idioma=${idioma}&mode=serie" class="stream-btn" style="background:rgba(50,50,50,0.7);">
                          ${escaparHTML(o.name)}${o.first_air_date ? ' (' + o.first_air_date.substring(0,4) + ')' : ''}
                        </a>`).join('')}
                    </div>
                  </div>`;
              }
            } catch (e) {}
          }

          // Cineplex: solo para películas, solo en Canadá, y solo si parece estar en cartelera
          // (usamos la fecha de estreno como estimación — TMDB no dice explícitamente
          // si sigue proyectándose en cines, así que esto es una aproximación razonable).
          // Alerta fija si la película todavía no se estrenó (dentro del próximo año)
          let alertaEstrenoHTML = '';
          if (mediaType === 'movie' && estreno !== 'N/A') {
            const diasHastaEstreno = (new Date(estreno).getTime() - Date.now()) / 86400000;
            if (diasHastaEstreno > 0 && diasHastaEstreno < 365) {
              const fechaLegible = new Date(estreno).toLocaleDateString(
                idioma === 'en-US' ? 'en-US' : 'es-MX',
                { year: 'numeric', month: 'long', day: 'numeric' }
              );
              alertaEstrenoHTML = bloqueAlertaFija(`🎬 <b>${escaparHTML(nombre)}</b> se estrena en cines el <b>${escaparHTML(fechaLegible)}</b>`);
            }
          }

          let cineplexHTML = '';
          if (mediaType === 'movie' && region === 'ca' && estreno !== 'N/A') {
            const diasDesdeEstreno = (Date.now() - new Date(estreno).getTime()) / 86400000;
            if (diasDesdeEstreno > -14 && diasDesdeEstreno < 60) {
              const cineplexUrl = `https://www.cineplex.com/Search?q=${encodeURIComponent(nombre)}`;
              cineplexHTML = `
                <div class="streaming-section">
                  <div class="streaming-title">🎟️ ${t('enCartelera', idioma)}</div>
                  <a href="${cineplexUrl}" target="_blank" class="stream-btn" style="background:#e01f27;">${t('comprarEntradas', idioma)} - Cineplex</a>
                  <p style="color:#888; font-size:0.85rem; margin-top:8px;">Te lleva a la búsqueda en Cineplex — la disponibilidad de funciones puede variar según tu ciudad.</p>
                </div>`;
            }
          }

          const plataformasHTML = proveedores.flatrate.length > 0
            ? proveedores.flatrate.map(p => `
                <a href="${proveedores.link || '#'}" target="_blank" class="provider-logo-btn" title="${escaparHTML(p.provider_name)}">
                  ${p.logo_url ? `<img src="${escaparHTML(p.logo_url)}" alt="${escaparHTML(p.provider_name)}">` : escaparHTML(p.provider_name)}
                </a>`).join('')
            : `<span style="color:#888;">No disponible en streaming por suscripción en tu región (${region.toUpperCase()})</span>`;

          contenidoHTML = `
            <div class="poster-view">
              ${bloqueTrailer(trailerKey, esMovil)}
              <div class="content-grid">
                ${posterUrl ? `<div class="poster-img-container"><img src="${escaparHTML(posterUrl)}" alt="${escaparHTML(nombre)}" class="poster-img"></div>` : ''}
                <div>
                  <h2>${escaparHTML(nombre)}</h2>
                  <p><b>${t('tipo', idioma)}:</b> ${mediaType === 'movie' ? t('pelicula', idioma) : t('serie', idioma)}</p>
                  <p><b>${t('generos', idioma)}:</b> ${escaparHTML(generos)}</p>
                  <p><b>${t('estreno', idioma)}:</b> ${escaparHTML(estreno)}</p>
                  <p><b>${t('productora', idioma)}:</b> ${escaparHTML(productora)}</p>
                  <p><b>${t('rating', idioma)}:</b> ${rating} / 10</p>
                  ${infoSeriesHTML}
                  <p><b>${t('repartoPrincipal', idioma)}:</b> ${escaparHTML(reparto)}</p>
                  <p><b>${t('sinopsis', idioma)}:</b><br>${escaparHTML(sinopsis)}</p>
                  <div class="streaming-section">
                    <div class="streaming-title">${t('dondeVer', idioma)} (${region.toUpperCase()})</div>
                    <div class="streaming-grid">${plataformasHTML}</div>
                  </div>
                  ${cineplexHTML}
                  ${sagaHTML}
                </div>
              </div>
            </div>
            ${alertaEstrenoHTML}`;
        } else {
          contenidoHTML = `<div class="poster-view" style="text-align:center;"><h2>No se encontraron resultados para "${escaparHTML(req.query.q)}"</h2></div>`;
        }
      } catch (error) {
        console.error('[TMDB] error:', error.message);
        contenidoHTML = `<div class="poster-view"><h2>Error en la búsqueda de TMDB</h2></div>`;
      }
    }
  } else {
    contenidoHTML = `
      <div class="poster-view" style="text-align:center; padding:40px 20px;">
        <h1>Buscador Pro Multimedia</h1>
        <p>Explora <b>Películas</b>, <b>Series</b> o <b>Música</b>.</p>
      </div>`;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Buscador Pro Multimedia</title>
      ${estilosGlobales}
    </head>
    <body>
      ${cuadroAtribucion}
      <div class="navbar">
        <a href="/">MEAN Cinema</a>
        <div class="controls-group">
          <form class="search-box" action="/" method="GET">
            <input type="hidden" name="region" value="${region}">
            <input type="hidden" name="idioma" value="${idioma}">
            <select name="mode" class="mode-select">
              <option value="pelicula" ${mode === 'pelicula' ? 'selected' : ''}>${t('pelicula', idioma)}</option>
              <option value="serie" ${mode === 'serie' ? 'selected' : ''}>${t('serie', idioma)}</option>
              <option value="musica" ${mode === 'musica' ? 'selected' : ''}>${t('musica', idioma)}</option>
              <option value="eventos" ${mode === 'eventos' ? 'selected' : ''}>${t('eventos', idioma)}</option>
              <option value="quehacer" ${mode === 'quehacer' ? 'selected' : ''}>Qué hacer</option>
              <option value="cronologia" ${mode === 'cronologia' ? 'selected' : ''}>Cronologías</option>
            </select>
            <input type="text" name="q" placeholder="${(mode === 'eventos' || mode === 'quehacer') ? 'Palabra clave (opcional)' : t('buscarPlaceholder', idioma)}" value="${escaparHTML(req.query.q || '')}" ${(mode === 'eventos' || mode === 'quehacer' || mode === 'cronologia') ? '' : 'required'}>
            ${(mode === 'eventos' || mode === 'quehacer') ? `<input type="text" name="ciudad" placeholder="Ciudad" value="${escaparHTML(req.query.ciudad || '')}">` : ''}
            <button type="submit">${t('buscar', idioma)}</button>
          </form>
        </div>
      </div>
      <div style="background: rgba(12,12,16,0.85); padding: 10px 20px; display:flex; justify-content:center; gap:10px; align-items:center; flex-wrap:wrap;">
        <span style="font-size:0.9rem; color:#ccc;">${t('region', idioma)}:</span>
        <select class="region-select" onchange="window.location.href='/?q=${encodeURIComponent(req.query.q || '')}&region=' + this.value + '&idioma=${idioma}&mode=${mode}&index=${indexParam}'">
          <option value="mx" ${region === 'mx' ? 'selected' : ''}>México</option>
          <option value="us" ${region === 'us' ? 'selected' : ''}>EE.UU.</option>
          <option value="ca" ${region === 'ca' ? 'selected' : ''}>Canadá</option>
          <option value="es" ${region === 'es' ? 'selected' : ''}>España</option>
          <option value="ar" ${region === 'ar' ? 'selected' : ''}>Argentina</option>
          <option value="co" ${region === 'co' ? 'selected' : ''}>Colombia</option>
        </select>

        <span style="font-size:0.9rem; color:#ccc;">${t('idioma', idioma)}:</span>
        <select class="region-select" onchange="window.location.href='/?q=${encodeURIComponent(req.query.q || '')}&region=${region}&idioma=' + this.value + '&mode=${mode}&index=${indexParam}'">
          <option value="es-MX" ${idioma === 'es-MX' || idioma === 'es-ES' ? 'selected' : ''}>🇲🇽 Español</option>
          <option value="en-US" ${idioma === 'en-US' ? 'selected' : ''}>🇺🇸 English</option>
          <option value="pt-BR" ${idioma === 'pt-BR' ? 'selected' : ''}>🇧🇷 Português</option>
          <option value="fr-FR" ${idioma === 'fr-FR' ? 'selected' : ''}>🇫🇷 Français</option>
        </select>
      </div>
      ${tabsHTML}
      <div style="padding-bottom: 40px;">${contenidoHTML}</div>

      <footer style="text-align:center; padding:30px 20px 110px; color:#888; font-size:0.85rem; border-top:1px solid rgba(255,255,255,0.08); margin-top:30px;">
        <p style="margin:4px 0;">Hecho con 💚 por <b style="color:#4CAF50;">Dani</b></p>
        <p style="margin:4px 0;">¿Preguntas o dudas? <a href="mailto:dcastillohor@yahoo.com" style="color:#4CAF50;">dcastillohor@yahoo.com</a></p>
      </footer>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log('====================================');
  console.log('  Buscador Pro Multimedia');
  console.log('====================================');
  console.log(`Servidor: http://localhost:${PORT}`);
});
