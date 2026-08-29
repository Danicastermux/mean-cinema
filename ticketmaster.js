// ticketmaster.js
// Busca eventos reales (conciertos, teatro, deportes, festivales) usando la
// Ticketmaster Discovery API — gratis, sin tarjeta de crédito, hasta 5000 pedidos/día.
// A diferencia de las plataformas de streaming, ACÁ sí hay enlaces directos reales
// a comprar la entrada de cada evento puntual.

async function buscarEventos(hacerPeticion, apiKey, { countryCode, ciudad, palabraClave }) {
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      countryCode: countryCode.toUpperCase(),
      size: '20',
      sort: 'date,asc'
    });

    if (ciudad) params.append('city', ciudad);
    if (palabraClave) params.append('keyword', palabraClave);

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
    const data = await hacerPeticion(url);

    if (!data || !data._embedded || !data._embedded.events) return [];

    return data._embedded.events.map(ev => {
      const venue = ev._embedded && ev._embedded.venues && ev._embedded.venues[0];
      const imagen = ev.images && ev.images.length > 0
        ? (ev.images.find(img => img.width > 500) || ev.images[0]).url
        : '';

      return {
        nombre: ev.name,
        artistaPrincipal: (ev._embedded && ev._embedded.attractions && ev._embedded.attractions[0])
          ? ev._embedded.attractions[0].name : null,
        fecha: ev.dates && ev.dates.start ? ev.dates.start.localDate : null,
        hora: ev.dates && ev.dates.start ? ev.dates.start.localTime : null,
        recinto: venue ? venue.name : '',
        ciudad: venue && venue.city ? venue.city.name : '',
        provincia: venue && venue.state ? venue.state.name : '',
        categoria: ev.classifications && ev.classifications[0] && ev.classifications[0].segment
          ? ev.classifications[0].segment.name : '',
        imagen,
        linkCompra: ev.url
      };
    });
  } catch (e) {
    console.error('[Ticketmaster] error al buscar eventos:', e.message);
    return [];
  }
}

module.exports = { buscarEventos };
