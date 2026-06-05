# De Taquito

Comparador de precios de informatica para Uruguay.

## Ejecutar

```bash
npm start
```

Luego abrir:

```text
http://localhost:3000
```

## Tiendas conectadas

- Thot Computacion
- Hard PC
- Banifox
- TComponentes
- NNET
- Digital Outlet
- Pc Store
- LINK.UY
- PC Compu
- Pc Parts Uy
- Tecno PC Uruguay
- Infinit Technology

La página mantiene productos de ejemplo si se abre como archivo local, pero los precios reales se consultan desde el servidor en `/api/search?q=producto`.

## Anuncios directos

Los espacios publicitarios se configuran en `data/ads.json`.

Campos utiles:

- `id`: identificador estable del anuncio.
- `position`: `top`, `inline` o `bottom`.
- `title`, `text`, `action`, `url`: contenido y enlace.
- `logo`: ruta opcional a un logo, por ejemplo `assets/ads/tienda-logo.png`.
- `image`: ruta opcional a una imagen de producto o banner.
- `tone`: `green`, `amber` o `graphite`.

Las metricas basicas se guardan en `data/ad-metrics.json` y tambien se pueden consultar en `/api/ads/metrics`.

## Ofertas del día

La sección publica ofertas automáticas por defecto:

- Automáticas: el servidor consulta precios reales en pocas búsquedas semilla y las expone en `/api/deals?limit=3`.
- Manuales: `data/deals.json` queda como base opcional para promociones fijas o sponsors, pero no se usa como precio diario por defecto.

Las ofertas automáticas usan caché para no consultar tiendas en cada visita.

## GitHub Pages

GitHub Pages no ejecuta `server.js`, por eso los endpoints `/api/search`, `/api/deals` y `/api/rates` no funcionan directamente ahi.

Para la portada estatica, la web usa estos archivos cuando no hay servidor:

- `data/live-catalog.json`
- `data/live-deals.json`
- `data/live-rates.json`

La acción `.github/workflows/update-static-data.yml` los actualiza automáticamente cada 6 horas y también se puede ejecutar manualmente desde la pestaña Actions de GitHub.

En GitHub Pages, el buscador compara contra `data/live-catalog.json`. No es una consulta en vivo, pero permite distribuir la página como sitio estático con precios renovados automáticamente.

Para que el comparador con búsqueda real funcione en producción, hace falta desplegar `server.js` en un servicio con Node como Render, Railway, Fly.io o un VPS.
