import re

# ---------- tmdb.js ----------
with open('tmdb.js', 'r', encoding='utf-8') as f:
    tmdb = f.read()

anchor = "module.exports = {"
nueva_funcion = """// Trae posters de peliculas populares (para el collage de fondo del inicio)
async function peliculasPopulares(hacerPeticion, apiKey, idioma = 'es-MX', paginas = 3) {
  let posters = [];
  for (let pagina = 1; pagina <= paginas; pagina++) {
    const url = tmdbUrl('/movie/popular', apiKey, { page: pagina }, idioma);
    const data = await hacerPeticion(url);
    const resultados = data.results || [];
    posters.push(...resultados.filter(r => r.poster_path).map(r => `${TMDB_IMG}/w342${r.poster_path}`));
  }
  return posters;
}

module.exports = {
  peliculasPopulares,"""

if anchor in tmdb:
    tmdb = tmdb.replace(anchor, nueva_funcion, 1)
    with open('tmdb.js', 'w', encoding='utf-8') as f:
        f.write(tmdb)
    print("OK: tmdb.js actualizado")
else:
    print("FALLO: no encontre 'module.exports = {' en tmdb.js")

# ---------- server.js ----------
with open('server.js', 'r', encoding='utf-8') as f:
    server = f.read()

cambios_ok = []
cambios_fallidos = []

# 1) agregar al require
viejo_req = "const { buscarPeliculas, buscarSeries, detalleTMDB, coleccionTMDB, imagenTMDB, trailerOficial, proveedoresPorRegion } = require('./tmdb');"
nuevo_req = "const { buscarPeliculas, buscarSeries, detalleTMDB, coleccionTMDB, imagenTMDB, trailerOficial, proveedoresPorRegion, peliculasPopulares } = require('./tmdb');"
if viejo_req in server:
    server = server.replace(viejo_req, nuevo_req, 1)
    cambios_ok.append("require de tmdb.js")
else:
    cambios_fallidos.append("require de tmdb.js")

# 2) declarar la variable postersFondoHTML
viejo_var = "let contenidoHTML = '';"
if viejo_var in server:
    server = server.replace(viejo_var, viejo_var + "\n  let postersFondoHTML = '';", 1)
    cambios_ok.append("declaracion de postersFondoHTML")
else:
    cambios_fallidos.append("declaracion de postersFondoHTML")

# 3) agregar el fetch de posters en la pantalla de bienvenida
patron_else = re.compile(
    r"(Explora <b>Pel[íi]culas</b>, <b>Series</b> o <b>M[úu]sica</b>\.</p>.*?`;)",
    re.DOTALL
)
inyeccion = """

    try {
      const posters = await peliculasPopulares(hacerPeticion, TMDB_API_KEY, idioma);
      if (posters.length > 0) {
        const columnas = 6;
        let columnasHTML = '';
        for (let c = 0; c < columnas; c++) {
          const colPosters = posters.filter((_, i) => i % columnas === c);
          const dobladas = [...colPosters, ...colPosters];
          columnasHTML += `<div class="poster-col">${dobladas.map(src => `<img src="${src}" loading="lazy">`).join('')}</div>`;
        }
        postersFondoHTML = `
        <div class="bg-poster-collage">${columnasHTML}</div>
        <div class="bg-overlay"></div>
        <style>
          .bg-poster-collage { position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:-2; overflow:hidden; display:flex; gap:4px; filter: brightness(1.28) saturate(1.15); pointer-events:none; }
          .poster-col { flex:1; display:flex; flex-direction:column; gap:4px; animation: bgScrollUp 50s linear infinite; }
          .poster-col:nth-child(even) { animation-direction: reverse; }
          .poster-col img { width:100%; height:auto; display:block; border-radius:4px; opacity:0.9; }
          @keyframes bgScrollUp { from { transform: translateY(0); } to { transform: translateY(-50%); } }
          @media (max-width:768px) { .bg-poster-collage { display:none !important; } }
        </style>`;
      }
    } catch (e) {
      console.error('Error cargando collage de posters de fondo:', e.message);
    }"""

if patron_else.search(server):
    server = patron_else.sub(lambda m: m.group(1) + inyeccion, server, count=1)
    cambios_ok.append("fetch de posters populares")
else:
    cambios_fallidos.append("fetch de posters populares")

# 4) insertar el collage justo despues del <body> del home (identificado por controls-group)
patron_body = re.compile(
    r'(<body>\s*)(\$\{cuadroAtribucion\}\s*<div class="navbar">\s*<a href="/">MEAN Cinema</a>\s*<div class="controls-group">)',
    re.DOTALL
)
if patron_body.search(server):
    server = patron_body.sub(lambda m: m.group(1) + "${postersFondoHTML}\n        " + m.group(2), server, count=1)
    cambios_ok.append("insercion del collage en el <body> del home")
else:
    cambios_fallidos.append("insercion del collage en el <body> del home")

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(server)

print("Cambios aplicados en server.js:", cambios_ok)
if cambios_fallidos:
    print("Cambios que fallaron:", cambios_fallidos)
