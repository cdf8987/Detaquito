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

La pagina mantiene productos de ejemplo si se abre como archivo local, pero los precios reales se consultan desde el servidor en `/api/search?q=producto`.

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
