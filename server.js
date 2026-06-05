const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PRICE_HISTORY_FILE = path.join(ROOT, "data", "price-history.json");
const AD_METRICS_FILE = path.join(ROOT, "data", "ad-metrics.json");
const USD_TO_UYU = 40;
const RATES_TTL_MS = 30 * 60 * 1000;
const CATALOG_TTL_MS = 45 * 60 * 1000;
const DEALS_TTL_MS = 30 * 60 * 1000;
const SEARCH_TTL_MS = 20 * 60 * 1000;
const SEARCH_CACHE_MAX = 80;
const FETCH_TIMEOUT_MS = 9000;
const ENRICH_LIMIT = 18;
const ENRICH_CONCURRENCY = 4;
const BROU_RATES_URL = "https://www.brou.com.uy/c/portal/render_portlet?p_l_id=20593&p_p_col_count=2&p_p_col_id=column-1&p_p_col_pos=0&p_p_id=cotizacionfull_WAR_broutmfportlet_INSTANCE_otHfewh1klyS&p_p_isolated=1&p_p_lifecycle=0&p_p_mode=view&p_p_state=normal&p_t_lifecycle=0";
const DOLAR_API_URL = "https://uy.dolarapi.com/v1/cotizaciones/usd";
let ratesCache = null;
let catalogCache = null;
let automaticDealsCache = null;
const searchCache = new Map();
let priceHistoryCache = null;
let adMetricsCache = null;

const shops = [
  {
    id: "thot",
    name: "Thot Computacion",
    home: "https://thotcomputacion.com.uy/",
    searchUrl: (q) => `https://thotcomputacion.com.uy/?s=${encodeURIComponent(q)}&post_type=product&type_aws=true`,
    scrape: scrapeWooCommerce
  },
  {
    id: "hardpc",
    name: "Hard PC",
    home: "https://www.hardpc.com.uy/",
    searchUrl: (q) => `https://www.hardpc.com.uy/productos/scripts/buscador_dinamico_productos.php?q=${encodeURIComponent(q)}&page=1`,
    scrape: scrapeHardPc
  },
  {
    id: "banifox",
    name: "Banifox",
    home: "https://www.banifox.com/",
    searchUrl: (q) => `https://www.banifox.com/buscar?clave=${encodeURIComponent(q)}&pag=1`,
    scrape: scrapeBanifox
  },
  {
    id: "tcomponentes",
    name: "TComponentes",
    home: "https://www.tcomponentes.com.uy/",
    searchUrl: (q) => `https://www.tcomponentes.com.uy/search?q=${encodeURIComponent(q)}`,
    scrape: scrapeTComponentes
  },
  {
    id: "nnet",
    name: "NNET",
    home: "https://www.nnet.com.uy/",
    searchUrl: (q) => `https://www.nnet.com.uy/?s=${encodeURIComponent(q)}&post_type=product`,
    scrape: scrapeWooCommerce
  },
  {
    id: "digitaloutlet",
    name: "Digital Outlet",
    home: "https://www.digitaloutlet.com.uy/",
    searchUrl: (q) => `https://www.digitaloutlet.com.uy/?s=${encodeURIComponent(q)}&post_type=product`,
    scrape: scrapeWooCommerce
  },
  {
    id: "pcstore",
    name: "Pc Store",
    home: "https://pcstore.com.uy/",
    searchUrl: (q) => `https://pcstore.com.uy/?s=${encodeURIComponent(q)}&post_type=product`,
    scrape: scrapeWooCommerce
  },
  {
    id: "linkuy",
    name: "LINK.UY",
    home: "https://link.uy/",
    searchUrl: (q) => `https://link.uy/?s=${encodeURIComponent(q)}&post_type=product`,
    scrape: scrapeWooCommerce
  },
  {
    id: "pccompu",
    name: "PC Compu",
    home: "https://www.pccompu.com.uy/",
    searchUrl: (q) => `https://www.pccompu.com.uy/?s=${encodeURIComponent(q)}&post_type=product`,
    scrape: scrapeWooCommerce
  },
  {
    id: "pcpartsuy",
    name: "Pc Parts Uy",
    home: "https://pcpartsuy.com.uy/",
    searchUrl: (q) => `https://pcpartsuy.com.uy/?s=${encodeURIComponent(q)}&post_type=product`,
    scrape: scrapeWooCommerce
  },
  {
    id: "tecnopcuy",
    name: "Tecno PC Uruguay",
    home: "https://www.tecnopcuy.com/",
    searchUrl: (q) => `https://www.tecnopcuy.com/?s=${encodeURIComponent(q)}&post_type=product`,
    scrape: scrapeWooCommerce
  },
  {
    id: "infinit",
    name: "Infinit Technology",
    home: "https://www.infinit.com.uy/",
    searchUrl: (q) => `https://www.infinit.com.uy/?s=${encodeURIComponent(q)}&post_type=product`,
    scrape: scrapeWooCommerce
  }
];

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*"
  });
  res.end(data);
}

async function getExchangeRates() {
  const now = Date.now();
  if (ratesCache && now - ratesCache.fetchedAt < RATES_TTL_MS) return ratesCache.data;

  try {
    return cacheRates(now, await getBrouRates());
  } catch {
    try {
      return cacheRates(now, await getDolarApiRates());
    } catch {
      return {
        USD_TO_UYU,
        buy: null,
        sell: USD_TO_UYU,
        source: "Referencia fija",
        sourceUrl: "",
        updatedAt: new Date().toISOString(),
        fallback: true
      };
    }
  }
}

function cacheRates(now, data) {
  ratesCache = {
    fetchedAt: now,
    data
  };
  return ratesCache.data;
}

function searchCacheKey(query = "") {
  return normalizeSearchText(query).replace(/\s+/g, " ").trim();
}

function getCachedSearch(query) {
  const key = searchCacheKey(query);
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > SEARCH_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  searchCache.delete(key);
  searchCache.set(key, cached);
  return {
    ...cached.data,
    cache: {
      hit: true,
      cachedAt: new Date(cached.fetchedAt).toISOString(),
      ttlSeconds: Math.max(0, Math.round((SEARCH_TTL_MS - (Date.now() - cached.fetchedAt)) / 1000))
    }
  };
}

function setCachedSearch(query, data) {
  const key = searchCacheKey(query);
  searchCache.set(key, {
    fetchedAt: Date.now(),
    data: {
      ...data,
      cache: {
        hit: false,
        cachedAt: null,
        ttlSeconds: Math.round(SEARCH_TTL_MS / 1000)
      }
    }
  });
  while (searchCache.size > SEARCH_CACHE_MAX) {
    searchCache.delete(searchCache.keys().next().value);
  }
  return searchCache.get(key).data;
}

function readPriceHistory() {
  if (priceHistoryCache) return priceHistoryCache;
  try {
    priceHistoryCache = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, "utf8"));
  } catch {
    priceHistoryCache = {};
  }
  return priceHistoryCache;
}

function writePriceHistory(history) {
  priceHistoryCache = history;
  try {
    fs.writeFileSync(PRICE_HISTORY_FILE, `${JSON.stringify(history, null, 2)}\n`, "utf8");
  } catch {
    // History is useful but should never break live searches.
  }
}

function readAdMetrics() {
  if (adMetricsCache) return adMetricsCache;
  try {
    adMetricsCache = JSON.parse(fs.readFileSync(AD_METRICS_FILE, "utf8"));
  } catch {
    adMetricsCache = {};
  }
  return adMetricsCache;
}

function writeAdMetrics(metrics) {
  adMetricsCache = metrics;
  try {
    fs.writeFileSync(AD_METRICS_FILE, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  } catch {
    // Ad metrics are best-effort and should not break the app.
  }
}

function trackAd(adId = "", event = "") {
  const safeId = compactSearchText(adId).slice(0, 80);
  const safeEvent = event === "click" ? "clicks" : "impressions";
  if (!safeId) return null;
  const metrics = readAdMetrics();
  const current = metrics[safeId] || {
    impressions: 0,
    clicks: 0,
    lastImpressionAt: "",
    lastClickAt: "",
    lastEventAt: ""
  };
  current[safeEvent] += 1;
  current.lastEventAt = new Date().toISOString();
  if (safeEvent === "clicks") current.lastClickAt = current.lastEventAt;
  if (safeEvent === "impressions") current.lastImpressionAt = current.lastEventAt;
  metrics[safeId] = current;
  writeAdMetrics(metrics);
  return current;
}

function historyEntryFromProduct(product, generatedAt) {
  const best = product.offers?.[0];
  if (!best) return null;
  return {
    at: generatedAt,
    priceUYU: Math.round(best.priceUYU || 0),
    amount: best.amount || null,
    currency: best.currency || "UYU",
    priceText: best.priceText || "",
    store: best.store,
    offers: product.offers.length
  };
}

function attachPriceHistory(products = [], generatedAt) {
  const history = readPriceHistory();
  let changed = false;

  products.forEach((product) => {
    const key = product.historyKey || productIdentityKey(product.offers?.[0] || { name: product.name });
    const entry = historyEntryFromProduct(product, generatedAt);
    product.historyKey = key;
    product.priceHistory = history[key] || [];
    if (!entry) return;

    const previous = history[key]?.[history[key].length - 1];
    const sameRecent = previous
      && previous.priceUYU === entry.priceUYU
      && previous.store === entry.store
      && Date.now() - new Date(previous.at).getTime() < 60 * 60 * 1000;

    if (!sameRecent) {
      history[key] = [...(history[key] || []), entry].slice(-30);
      product.priceHistory = history[key];
      changed = true;
    }
  });

  if (changed) writePriceHistory(history);
  return products;
}

function parseUruguayNumber(value = "") {
  const normalized = htmlDecode(value)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  return Number.parseFloat(normalized);
}

async function getBrouRates() {
  const html = await fetchText(BROU_RATES_URL, "https://www.brou.com.uy/cotizaciones");
  const row = normalizeSearchText(htmlDecode(html.replace(/<[^>]+>/g, " ")))
    .replace(/\s+/g, " ")
    .match(/d.lar\s+([0-9.,]+)\s+([0-9.,]+)/i);
  if (!row) throw new Error("No se encontro dolar BROU");

  const compra = parseUruguayNumber(row[1]);
  const venta = parseUruguayNumber(row[2]);
  if (!Number.isFinite(venta) || venta <= 0) throw new Error("Cotizacion BROU invalida");

  return {
    USD_TO_UYU: venta,
    buy: Number.isFinite(compra) ? compra : null,
    sell: venta,
    source: "BROU",
    sourceUrl: "https://www.brou.com.uy/cotizaciones",
    updatedAt: new Date().toISOString(),
    fallback: false
  };
}

async function getDolarApiRates() {
  const response = await fetch(DOLAR_API_URL, {
    headers: {
      "accept": "application/json",
      "user-agent": "DeTaquito/0.1"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const venta = Number(data.venta);
  const compra = Number(data.compra);
  if (!Number.isFinite(venta) || venta <= 0) throw new Error("Cotizacion invalida");

  return {
    USD_TO_UYU: venta,
    buy: Number.isFinite(compra) ? compra : null,
    sell: venta,
    source: "DolarApi Uruguay",
    sourceUrl: DOLAR_API_URL,
    updatedAt: data.fechaActualizacion || new Date().toISOString(),
    fallback: true
  };
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml; charset=utf-8"
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("No encontrado");
      return;
    }
    res.writeHead(200, {
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(data);
  });
}

function htmlDecode(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&aacute;/g, "a")
    .replace(/&eacute;/g, "e")
    .replace(/&iacute;/g, "i")
    .replace(/&oacute;/g, "o")
    .replace(/&uacute;/g, "u")
    .replace(/&ntilde;/g, "n")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value = "") {
  return htmlDecode(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[”″]/g, '"')
    .toLowerCase();
}

function compactSearchText(value = "") {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, "");
}

function extractCapacityGb(value = "") {
  const normalized = normalizeSearchText(value).replace(/,/g, ".");
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(tb|gb)\b/g)];
  return matches.map((match) => {
    const amount = Number.parseFloat(match[1]);
    return match[2] === "tb" ? amount * 1024 : amount;
  });
}

function sameCapacityGb(left, right) {
  const tolerance = Math.max(16, right * 0.08);
  return Math.abs(left - right) <= tolerance;
}

function extractScreenInches(value = "") {
  const normalized = normalizeSearchText(value).replace(/,/g, ".");
  const matches = [...normalized.matchAll(/(\d{2}(?:\.\d)?)\s*(?:"|pulgadas?|pulg|inch|inches)/g)];
  return matches.map((match) => Number.parseFloat(match[1]));
}

function extractGpuModel(value = "") {
  const normalized = normalizeSearchText(value);
  const match = normalized.match(/\b(rtx|gtx|rx)\s*-?\s*(\d{3,5})\s*(ti|super|xt|gre)?\b/);
  if (!match) return null;
  return {
    family: match[1],
    number: match[2],
    suffix: match[3] || ""
  };
}

function extractCpuModel(value = "") {
  const normalized = normalizeSearchText(value);
  const ryzen = normalized.match(/\b(?:amd\s*)?ryzen\s*([3579])\s*-?\s*(\d{4,5}[a-z0-9]*)?\b/);
  if (ryzen) {
    return {
      family: `ryzen${ryzen[1]}`,
      model: ryzen[2] || ""
    };
  }
  const core = normalized.match(/\b(?:intel\s*)?(?:core\s*)?i([3579])\s*-?\s*(\d{4,5}[a-z0-9]*)?\b/);
  if (!core) return null;
  return {
    family: `i${core[1]}`,
    model: core[2] || ""
  };
}

function extractQueryProfile(query) {
  const normalized = normalizeSearchText(query);
  const ignoredUnits = new Set(["gb", "tb", "pulgada", "pulgadas", "pulg", "inch", "inches"]);
  let tokens = normalized.split(/[^a-z0-9]+/i).filter((token) => token.length > 1 && !ignoredUnits.has(token) && !/^\d+(?:gb|tb)$/.test(token));
  const wantsMonitor = /\b(monitor|pantalla)\b/.test(normalized);
  const screenInches = extractScreenInches(query);
  if (wantsMonitor && !screenInches.length) {
    tokens
      .filter((token) => /^\d{2}$/.test(token))
      .map(Number)
      .filter((value) => value >= 10 && value <= 60)
      .forEach((value) => screenInches.push(value));
  }
  if (screenInches.length) {
    const inchTokens = new Set(screenInches.map((inch) => String(Math.round(inch))));
    tokens = tokens.filter((token) => !inchTokens.has(token));
  }
  return {
    normalized,
    compact: compactSearchText(query),
    tokens,
    capacitiesGb: extractCapacityGb(query),
    screenInches,
    gpu: extractGpuModel(query),
    cpu: extractCpuModel(query),
    wantsStorage: /\b(ssd|hdd|nvme|m\.?2|disco)\b/.test(normalized),
    wantsMonitor,
    wantsFullComputer: /\b(notebook|laptop|equipo|pc gamer|computadora|ordenador)\b/.test(normalized)
  };
}

function matchesQuery(name, query) {
  return matchesQueryProfile(name, extractQueryProfile(query));
}

function relaxedQueryProfile(profile) {
  return {
    ...profile,
    tokens: profile.tokens.filter((token) => !/^\d+$/.test(token)),
    capacitiesGb: [],
    screenInches: [],
    gpu: null,
    cpu: null
  };
}

function matchesQueryProfile(name, profile) {
  const normalizedName = normalizeSearchText(name);
  const compactName = compactSearchText(name);

  if (!profile.tokens.every((token) => compactName.includes(token))) return false;

  const isFullComputer = /\b(notebook|laptop|equipo|pc\b|pc gamer|computadora|ordenador|dell pro|thinkpad|ideapad|vivobook|aspire)\b/.test(normalizedName);
  if (!profile.wantsFullComputer && isFullComputer && (profile.wantsStorage || profile.gpu || profile.cpu)) return false;

  if (profile.gpu) {
    const productGpu = extractGpuModel(name);
    if (!productGpu) return false;
    if (productGpu.family !== profile.gpu.family || productGpu.number !== profile.gpu.number) return false;
    if (profile.gpu.suffix && productGpu.suffix !== profile.gpu.suffix) return false;
  }

  if (profile.cpu?.model) {
    const productCpu = extractCpuModel(name);
    if (!productCpu || productCpu.family !== profile.cpu.family || productCpu.model !== profile.cpu.model) return false;
  }

  if (profile.capacitiesGb.length && (profile.wantsStorage || profile.gpu)) {
    const productCapacities = extractCapacityGb(name);
    if (!profile.capacitiesGb.every((queryCapacity) => productCapacities.some((productCapacity) => sameCapacityGb(productCapacity, queryCapacity)))) {
      return false;
    }
  }

  if (profile.screenInches.length && profile.wantsMonitor) {
    const productInches = extractScreenInches(name);
    if (!profile.screenInches.every((queryInches) => productInches.some((productInch) => Math.abs(productInch - queryInches) <= 0.5))) {
      return false;
    }
  }

  return true;
}

function detectCategory(name = "") {
  const text = normalizeSearchText(name);
  if (/\b(notebook|laptop|ultrabook|macbook|thinkpad|ideapad|vivobook|aspire)\b/.test(text)) return "Notebooks";
  if (/\b(gpu|tarjeta de video|placa de video|geforce|radeon|rtx|gtx)\b/.test(text)) return "Graficas";
  if (/\b(cpu|procesador|ryzen|core i[3579]|intel i[3579])\b/.test(text)) return "Procesadores";
  if (/\b(ssd|nvme|m\.?2|disco solido|hdd|disco duro)\b/.test(text)) return "Almacenamiento";
  if (/\b(monitor|pantalla)\b/.test(text)) return "Monitores";
  if (/\b(memoria|ram|ddr[345])\b/.test(text)) return "Memorias";
  if (/\b(mother|motherboard|placa madre|mainboard|b650|b760|z790|a620|x670)\b/.test(text)) return "Motherboards";
  if (/\b(fuente|psu|80 plus|watt|watts)\b/.test(text)) return "Fuentes";
  if (/\b(teclado|mouse|auricular|headset|microfono|webcam|pad)\b/.test(text)) return "Perifericos";
  if (/\b(gabinete|case|chasis)\b/.test(text)) return "Gabinetes";
  return "Otros";
}

function categorySpecs(category, offers, filters) {
  const storesCount = new Set(offers.map((offer) => offer.store)).size;
  return `${offers.length} ofertas de ${category.toLowerCase()} encontradas en ${storesCount} tiendas. ${filters.length ? `Filtro exacto: ${filters.join(" · ")}. ` : ""}Los precios en USD se ordenan con referencia interna de ${USD_TO_UYU} UYU por USD.`;
}

const KNOWN_BRANDS = [
  "msi", "asus", "gigabyte", "zotac", "xfx", "sapphire", "palit", "pny", "evga", "galax", "powercolor", "asrock",
  "amd", "intel", "kingston", "crucial", "samsung", "western digital", "wd", "seagate", "adata", "xpg", "lexar",
  "sandisk", "corsair", "logitech", "razer", "hyperx", "redragon", "acer", "aoc", "lg", "viewsonic", "dell", "hp", "lenovo"
];

function extractBrand(name = "") {
  const normalized = normalizeSearchText(name);
  return KNOWN_BRANDS.find((brand) => new RegExp(`\\b${brand.replace(/\s+/g, "\\s+")}\\b`, "i").test(normalized)) || "";
}

function extractVramGb(name = "") {
  const match = normalizeSearchText(name).match(/\b(\d{1,2})\s*gb\b/);
  return match ? Number(match[1]) : null;
}

function extractRefreshHz(name = "") {
  const match = normalizeSearchText(name).match(/\b(\d{2,3})\s*hz\b/);
  return match ? Number(match[1]) : null;
}

function cleanProductName(name = "") {
  return normalizeSearchText(name)
    .replace(/\b(nuevo|ingreso|oferta|promo|promocion|disponible|stock|gaming|gamer)\b/g, " ")
    .replace(/\b(tarjeta|placa)\s+de\s+(video|grafica)\b/g, " ")
    .replace(/\b(disco|solido|duro|interno|externo)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productIdentityKey(offer) {
  const name = offer.name || "";
  const category = detectCategory(name);
  const brand = extractBrand(name);
  const gpu = extractGpuModel(name);
  const cpu = extractCpuModel(name);
  const capacities = extractCapacityGb(name).map((value) => Math.round(value)).sort((a, b) => a - b);
  const inches = extractScreenInches(name).map((value) => Math.round(value * 10) / 10).sort((a, b) => a - b);
  const refresh = extractRefreshHz(name);
  const cleaned = compactSearchText(cleanProductName(name));
  const normalized = normalizeSearchText(name);

  if (gpu) return ["gpu", brand, gpu.family, gpu.number, gpu.suffix, extractVramGb(name) || ""].join(":");
  if (cpu?.model) return ["cpu", brand, cpu.family, cpu.model].join(":");
  if (category === "Almacenamiento" && capacities.length) {
    const storageType = /\bnvme|m\.?2\b/i.test(normalized) ? "nvme" : /\bhdd\b/i.test(normalized) ? "hdd" : "ssd";
    return ["storage", brand, storageType, capacities.join("-"), cleaned.slice(0, 34)].join(":");
  }
  if (category === "Monitores" && inches.length) return ["monitor", brand, inches.join("-"), refresh || "", cleaned.slice(0, 34)].join(":");
  return [category, brand, cleaned.slice(0, 52)].join(":");
}

function chooseProductName(offers = []) {
  return offers
    .map((offer) => offer.name)
    .sort((a, b) => a.length - b.length)[0] || "Producto";
}

function groupOffers(offers, matchMode, filters) {
  const groups = new Map();
  offers.forEach((offer) => {
    const key = productIdentityKey(offer);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(offer);
  });

  return [...groups.values()]
    .map((group) => {
      group.sort((a, b) => a.priceUYU - b.priceUYU);
      const best = group[0];
      const category = detectCategory(best.name);
      const storesCount = new Set(group.map((offer) => offer.store)).size;
      const suffix = [
        `${group.length} oferta${group.length === 1 ? "" : "s"}`,
        `${storesCount} tienda${storesCount === 1 ? "" : "s"}`,
        group.some((offer) => offer.enriched) ? "Ficha revisada" : "",
        matchMode === "approximate" ? "Coincidencia aproximada" : "",
        filters.length ? `Filtro: ${filters.join(" / ")}` : ""
      ].filter(Boolean).join(" - ");

      return {
        name: chooseProductName(group),
        category,
        specs: suffix,
        image: group.find((offer) => offer.image)?.image || "",
        offers: group
      };
    })
    .sort((a, b) => {
      const bestA = a.offers[0]?.priceUYU ?? Number.POSITIVE_INFINITY;
      const bestB = b.offers[0]?.priceUYU ?? Number.POSITIVE_INFINITY;
      return bestA - bestB;
    });
}

function absoluteUrl(base, value = "") {
  if (!value) return "";
  try {
    return new URL(htmlDecode(value).replace(/^\/\//, "https://"), base).href;
  } catch {
    return "";
  }
}

function attributeValues(block = "", attribute = "") {
  const values = [];
  const pattern = new RegExp(`${attribute}="([^"]+)"`, "gi");
  let match;
  while ((match = pattern.exec(block))) values.push(match[1]);
  return values;
}

function srcsetCandidates(block = "") {
  return attributeValues(block, "srcset").flatMap((srcset) => (
    srcset
      .split(",")
      .map((entry) => {
        const [url, size = "0w"] = entry.trim().split(/\s+/);
        return {
          url,
          width: Number.parseInt(size, 10) || 0
        };
      })
      .filter((entry) => entry.url)
  ));
}

function imageScore(candidate = {}) {
  const url = candidate.url || "";
  if (!url || /data:image\/gif|data:image\/svg|blank\.gif|noimg|placeholder/i.test(url)) return -1;
  const lowQualityPenalty = /blur_|blur=|\/blur\/|tiny|transparent/i.test(url) ? 1000 : 0;
  const widthFromUrl = Number(url.match(/(?:^|[,_/])w[_-]?(\d{2,4})/i)?.[1] || 0);
  const heightFromUrl = Number(url.match(/(?:^|[,_/])h[_-]?(\d{2,4})/i)?.[1] || 0);
  return Math.max(candidate.width || 0, widthFromUrl, heightFromUrl) - lowQualityPenalty;
}

function firstImageFromBlock(block = "", base = "") {
  const candidates = [
    ...attributeValues(block, "data-src").map((url) => ({ url, width: 0 })),
    ...attributeValues(block, "data-lazy-src").map((url) => ({ url, width: 0 })),
    ...attributeValues(block, "data-original").map((url) => ({ url, width: 0 })),
    ...srcsetCandidates(block),
    ...attributeValues(block, "src").map((url) => ({ url, width: 0 })),
    ...(block.match(/https:\/\/static\.wixstatic\.com\/media\/[^"'\\\s<]+/gi) || []).map((url) => ({ url, width: 0 }))
  ]
    .map((candidate) => ({
      ...candidate,
      url: improveImageQuality(absoluteUrl(base, candidate.url))
    }))
    .filter((candidate) => imageScore(candidate) >= 0)
    .sort((a, b) => imageScore(b) - imageScore(a));

  return candidates[0]?.url || "";
}

function improveImageQuality(url = "") {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    parsed.search = "";
    if (/static\.wixstatic\.com$/i.test(parsed.hostname) && parsed.pathname.includes("/v1/")) {
      parsed.pathname = parsed.pathname.split("/v1/")[0];
      return parsed.href;
    }
    const cleanedPath = parsed.pathname.replace(/-\d+x\d+(?=\.(?:png|jpe?g|webp)$)/i, "");
    parsed.pathname = cleanedPath;
    return parsed.href;
  } catch {
    return url;
  }
}

function metaContent(html = "", key = "") {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const wanted = key.toLowerCase();
  const tag = tags.find((item) => {
    const property = item.match(/\bproperty=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const name = item.match(/\bname=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    return property === wanted || name === wanted;
  });
  return htmlDecode(tag?.match(/\bcontent=["']([^"']+)["']/i)?.[1] || "");
}

function pageProductName(html = "", fallback = "") {
  const candidates = [
    metaContent(html, "og:title"),
    metaContent(html, "twitter:title"),
    htmlDecode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ""),
    htmlDecode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
  ]
    .map((value) => value
      .replace(/\s*[-|–]\s*(Thot.*|Hard PC.*|Banifox.*|TComponentes.*)$/i, "")
      .replace(/\s+/g, " ")
      .trim())
    .filter((value) => value.length >= 6 && value.length <= 180);

  return candidates[0] || fallback;
}

function pageStock(html = "", fallback = true) {
  const text = normalizeSearchText(html);
  if (/\b(sin stock|agotado|no disponible|out of stock|sold out)\b/.test(text)) return false;
  if (/\b(disponible|en stock|hay stock|comprar|agregar al carrito)\b/.test(text)) return true;
  return fallback;
}

function pageImage(html = "", base = "") {
  const candidates = [
    metaContent(html, "og:image"),
    metaContent(html, "twitter:image"),
    firstImageFromBlock(html, base)
  ]
    .map((url) => improveImageQuality(absoluteUrl(base, url)))
    .filter(Boolean);

  return candidates[0] || "";
}

async function enrichOfferFromPage(offer) {
  if (!offer.url) return offer;
  try {
    const html = await fetchText(offer.url, offer.url);
    return {
      ...offer,
      name: pageProductName(html, offer.name),
      image: pageImage(html, offer.url) || offer.image,
      stock: pageStock(html, offer.stock),
      enriched: true
    };
  } catch {
    return offer;
  }
}

async function enrichOffers(offers = []) {
  const enriched = [...offers];
  const limit = Math.min(ENRICH_LIMIT, enriched.length);
  for (let start = 0; start < limit; start += ENRICH_CONCURRENCY) {
    const batch = enriched.slice(start, start + ENRICH_CONCURRENCY);
    const updates = await Promise.all(batch.map((offer) => enrichOfferFromPage(offer)));
    updates.forEach((offer, index) => {
      enriched[start + index] = offer;
    });
  }
  return enriched;
}

function parsePrice(text = "") {
  const clean = htmlDecode(text);
  const match = clean.match(/(?:US\$|U\$S|USD|\$)\s*([0-9][0-9.,]*)/i);
  if (!match) return null;

  const raw = match[1];
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  const decimalMark = lastComma > lastDot ? "," : ".";
  const normalized = raw
    .replace(new RegExp(`\\${decimalMark}(?=\\d{3}(\\D|$))`, "g"), "")
    .replace(decimalMark === "," ? /\./g : /,/g, "")
    .replace(decimalMark, ".");
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) return null;

  const currency = /US\$|U\$S|USD/i.test(clean) ? "USD" : "UYU";
  return {
    amount,
    currency,
    priceText: `${currency === "USD" ? "US$" : "$"} ${amount.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`,
    priceUYU: currency === "USD" ? amount * USD_TO_UYU : amount
  };
}

function cleanItems(items) {
  const seen = new Set();
  return items
    .filter((item) => item.name && item.url && item.priceText)
    .filter((item) => {
      const key = `${item.store}:${item.name}:${item.priceText}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

async function fetchText(url, referer) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
        "accept-language": "es-UY,es;q=0.9,en;q=0.6",
        "referer": referer || url,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36"
      }
    });
    const buffer = await response.arrayBuffer();
    const type = response.headers.get("content-type") || "";
    const encoding = /8859|1252/i.test(type) ? "latin1" : "utf-8";
    const text = new TextDecoder(encoding).decode(buffer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function scrapeWooCommerce(html, shop) {
  const blocks = html.match(/<li[^>]+class="[^"]*product[^"]*"[\s\S]*?<\/li>/gi) || [];
  const items = blocks.map((block) => {
    const name = htmlDecode(block.match(/woocommerce-loop-product__title[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
    const url = block.match(/class="product-loop-title"\s+href="([^"]+)"/i)?.[1] || block.match(/<a\s+href="([^"]+)"/i)?.[1];
    const price = parsePrice(block.match(/<span class="price">([\s\S]*?)<\/span>\s*<input/i)?.[1] || block);
    return price && {
      store: shop.name,
      name,
      url: absoluteUrl(shop.home, url),
      image: firstImageFromBlock(block, shop.home),
      stock: !/outofstock|agotado|sin stock/i.test(block),
      ...price
    };
  }).filter(Boolean);
  return cleanItems(items);
}

function scrapeHardPc(text, shop) {
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  return cleanItems(data.map((option) => {
    const name = htmlDecode(option.text || option.nombre || option.name || "");
    const price = parsePrice(option.precio || option.price || option.html || "");
    return price && {
      store: shop.name,
      name,
      url: absoluteUrl(shop.home, option.url || ""),
      image: absoluteUrl(shop.home, option.url_img || option.img || option.imagen || ""),
      stock: String(option.stock ?? "1") !== "0",
      ...price
    };
  }).filter(Boolean));
}

function scrapeBanifox(html, shop) {
  const blocks = html.match(/<div[^>]+class="[^"]*(?:producto|item|card)[^"]*"[\s\S]{0,3500}?(?:<\/article>|<\/div>\s*<\/div>\s*<\/div>)/gi) || [];
  const source = blocks.length ? blocks : html.split(/(?=<a[^>]+href="[^"]*(?:producto|productos|articulo)[^"]*")/i).slice(0, 20);
  const items = source.map((block) => {
    const name = htmlDecode(
      block.match(/alt="([^"]{8,160})"/i)?.[1] ||
      block.match(/title="([^"]{8,160})"/i)?.[1] ||
      block.match(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/i)?.[1]
    );
    const url = block.match(/<a[^>]+href="([^"]+)"/i)?.[1];
    const price = parsePrice(block);
    return price && {
      store: shop.name,
      name,
      url: absoluteUrl(shop.home, url),
      image: firstImageFromBlock(block, shop.home),
      stock: !/sin stock|agotado/i.test(block),
      ...price
    };
  }).filter(Boolean);
  return cleanItems(items);
}

function scrapeTComponentes(html, shop) {
  const blocks = html.match(/<div[^>]+data-slug="[^"]+"[\s\S]*?data-hook="product-item-root"[\s\S]*?(?=<div[^>]+data-slug=|<\/main>|<\/body>)/gi) || [];
  const items = blocks.map((block) => {
    const label = block.match(/aria-label="Galer[^"]* de ([^"]+)"/i)?.[1] || "";
    const name = htmlDecode(label.replace(/\.\s*$/, ""));
    const url = block.match(/<a[^>]+href="([^"]*product-page[^"]+)"/i)?.[1];
    const price = parsePrice(block);
    return price && {
      store: shop.name,
      name,
      url: absoluteUrl(shop.home, url),
      image: firstImageFromBlock(block, shop.home),
      stock: !/agotado|sin stock/i.test(block),
      ...price
    };
  }).filter(Boolean);
  return cleanItems(items);
}

async function searchShop(shop, query) {
  try {
    const html = await fetchText(shop.searchUrl(query), shop.home);
    const offers = shop.scrape(html, shop);
    return { shop: shop.name, ok: true, offers };
  } catch (error) {
    return { shop: shop.name, ok: false, offers: [], error: error.message };
  }
}

async function searchAll(query) {
  const cached = getCachedSearch(query);
  if (cached) return cached;

  const settled = await Promise.all(shops.map((shop) => searchShop(shop, query)));
  const queryProfile = extractQueryProfile(query);
  const rawOffers = settled.flatMap((result) => result.offers);
  let offers = rawOffers.filter((offer) => matchesQueryProfile(offer.name, queryProfile));
  let matchMode = "exact";

  if (!offers.length && rawOffers.length) {
    offers = rawOffers.filter((offer) => matchesQueryProfile(offer.name, relaxedQueryProfile(queryProfile)));
    matchMode = offers.length ? "approximate" : "none";
  }

  offers.sort((a, b) => a.priceUYU - b.priceUYU);
  offers = await enrichOffers(offers);

  offers.forEach((offer) => {
    offer.category = detectCategory(offer.name);
  });
  offers.sort((a, b) => a.priceUYU - b.priceUYU);

  const filters = [];
  if (queryProfile.gpu) filters.push(`${queryProfile.gpu.family.toUpperCase()} ${queryProfile.gpu.number}${queryProfile.gpu.suffix ? ` ${queryProfile.gpu.suffix}` : ""}`);
  if (queryProfile.cpu?.model) filters.push(`${queryProfile.cpu.family.toUpperCase()} ${queryProfile.cpu.model}`);
  if (queryProfile.capacitiesGb.length && (queryProfile.wantsStorage || queryProfile.gpu)) filters.push(queryProfile.capacitiesGb.map((gb) => `${gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`}`).join(", "));
  if (queryProfile.screenInches.length && queryProfile.wantsMonitor) filters.push(queryProfile.screenInches.map((inch) => `${inch}"`).join(", "));
  const generatedAt = new Date().toISOString();
  const products = attachPriceHistory(groupOffers(offers, matchMode, filters), generatedAt);

  return setCachedSearch(query, {
    query,
    generatedAt,
    sources: settled,
    filters,
    matchMode,
    products: products.length ? products : offers.map((offer) => ({
      name: offer.name,
      category: offer.category,
      specs: `${offer.store} · ${offer.stock ? "Disponible" : "Sin stock"}${matchMode === "approximate" ? " · Coincidencia aproximada" : ""}${filters.length ? ` · Filtro: ${filters.join(" · ")}` : ""}`,
      image: offer.image || "",
      offers: [offer]
    }))
  });
}

function loadCatalogSeeds() {
  const fallback = ["ssd", "nvme", "rtx", "ryzen", "monitor", "notebook", "fuente", "mouse"];
  try {
    const file = fs.readFileSync(path.join(ROOT, "data", "catalog-seeds.json"), "utf8");
    const seeds = JSON.parse(file);
    return Array.isArray(seeds) && seeds.length ? seeds.map(String).filter(Boolean) : fallback;
  } catch {
    return fallback;
  }
}

function catalogOfferKey(offer) {
  return [
    offer.store,
    compactSearchText(offer.name),
    offer.priceText || offer.priceUYU || ""
  ].join(":");
}

async function buildCatalog({ refresh = false } = {}) {
  const now = Date.now();
  if (!refresh && catalogCache && now - catalogCache.fetchedAt < CATALOG_TTL_MS) {
    return catalogCache.data;
  }

  const seeds = loadCatalogSeeds();
  const runs = [];
  for (const seed of seeds) {
    runs.push({
      seed,
      results: await Promise.all(shops.map((shop) => searchShop(shop, seed)))
    });
  }

  const sourcesByShop = new Map(shops.map((shop) => [shop.name, {
    shop: shop.name,
    ok: false,
    offers: [],
    seeds: 0,
    errors: []
  }]));
  const offersByKey = new Map();

  runs.forEach(({ seed, results }) => {
    results.forEach((result) => {
      const source = sourcesByShop.get(result.shop);
      source.seeds += 1;
      source.ok = source.ok || result.ok;
      if (!result.ok && result.error) source.errors.push(`${seed}: ${result.error}`);

      result.offers.forEach((offer) => {
        offer.category = detectCategory(offer.name);
        offer.catalogSeed = seed;
        source.offers.push(offer);
        if (!offersByKey.has(catalogOfferKey(offer))) {
          offersByKey.set(catalogOfferKey(offer), offer);
        }
      });
    });
  });

  const offers = [...offersByKey.values()]
    .sort((a, b) => {
      const categoryOrder = a.category.localeCompare(b.category, "es");
      return categoryOrder || a.priceUYU - b.priceUYU || a.name.localeCompare(b.name, "es");
    });

  const data = {
    generatedAt: new Date().toISOString(),
    seeds,
    sources: [...sourcesByShop.values()].map((source) => ({
      shop: source.shop,
      ok: source.ok,
      offers: source.offers,
      seeds: source.seeds,
      error: source.errors[0] || ""
    })),
    products: offers.map((offer) => ({
      name: offer.name,
      category: offer.category,
      specs: `${offer.store} - ${offer.stock ? "Disponible" : "Sin stock"} - Catalogo conectado`,
      image: offer.image || "",
      offers: [offer]
    }))
  };

  catalogCache = { fetchedAt: now, data };
  return data;
}

function dealTone(category = "") {
  if (category === "Monitores" || category === "Graficas") return "graphite";
  if (category === "Perifericos" || category === "Procesadores") return "amber";
  return "green";
}

function automaticDealFromProduct(product, generatedAt) {
  const best = product.offers?.[0];
  if (!best) return null;
  const storeCount = productStoreCountServer(product);
  return {
    title: product.name,
    category: product.category || detectCategory(product.name),
    store: best.store,
    priceText: best.priceText,
    oldPriceText: "",
    badge: "Precio real",
    text: `Oferta detectada automaticamente. Comparada en ${storeCount} tienda${storeCount === 1 ? "" : "s"}.`,
    url: best.url,
    image: product.image || best.image || "",
    tone: dealTone(product.category || detectCategory(product.name)),
    source: "auto",
    generatedAt
  };
}

function productStoreCountServer(product) {
  return new Set((product.offers || []).map((offer) => offer.store)).size;
}

function dealKey(deal) {
  return `${compactSearchText(deal.title)}:${compactSearchText(deal.store)}:${deal.priceText || ""}`;
}

async function buildAutomaticDeals({ refresh = false, limit = 3 } = {}) {
  const now = Date.now();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 3, 6));
  if (!refresh && automaticDealsCache && now - automaticDealsCache.fetchedAt < DEALS_TTL_MS) {
    return {
      ...automaticDealsCache.data,
      cache: {
        hit: true,
        cachedAt: new Date(automaticDealsCache.fetchedAt).toISOString()
      }
    };
  }

  const seeds = loadCatalogSeeds();
  const preferred = ["ssd", "monitor", "mouse", "rtx", "ryzen", "notebook"]
    .filter((seed) => seeds.some((candidate) => compactSearchText(candidate) === compactSearchText(seed)));
  const selectedSeeds = (preferred.length ? preferred : seeds).slice(0, 4);
  const generatedAt = new Date().toISOString();
  const byKey = new Map();
  const sources = [];

  for (const seed of selectedSeeds) {
    try {
      const data = await searchAll(seed);
      sources.push({
        seed,
        ok: true,
        products: data.products?.length || 0,
        cache: Boolean(data.cache?.hit)
      });
      (data.products || []).forEach((product) => {
        const deal = automaticDealFromProduct(product, generatedAt);
        if (deal && !byKey.has(dealKey(deal))) byKey.set(dealKey(deal), deal);
      });
    } catch (error) {
      sources.push({
        seed,
        ok: false,
        products: 0,
        error: error.message
      });
    }
    if (byKey.size >= safeLimit * 2) break;
  }

  const deals = [...byKey.values()]
    .sort((a, b) => (parsePrice(a.priceText)?.priceUYU || Number.POSITIVE_INFINITY) - (parsePrice(b.priceText)?.priceUYU || Number.POSITIVE_INFINITY))
    .slice(0, safeLimit);
  const data = {
    generatedAt,
    source: "automatic",
    seeds: selectedSeeds,
    sources,
    deals,
    cache: {
      hit: false,
      cachedAt: null
    }
  };
  automaticDealsCache = { fetchedAt: now, data };
  return data;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === "/api/search") {
    const query = requestUrl.searchParams.get("q")?.trim();
    if (!query) {
      sendJson(res, 400, { error: "Falta la busqueda" });
      return;
    }
    sendJson(res, 200, await searchAll(query));
    return;
  }

  if (requestUrl.pathname === "/api/catalog") {
    const refresh = requestUrl.searchParams.get("refresh") === "1";
    sendJson(res, 200, await buildCatalog({ refresh }));
    return;
  }

  if (requestUrl.pathname === "/api/deals") {
    const refresh = requestUrl.searchParams.get("refresh") === "1";
    const limit = Number(requestUrl.searchParams.get("limit") || 3);
    sendJson(res, 200, await buildAutomaticDeals({ refresh, limit }));
    return;
  }

  if (requestUrl.pathname === "/api/rates") {
    sendJson(res, 200, await getExchangeRates());
    return;
  }

  if (requestUrl.pathname === "/api/ads/track") {
    const id = requestUrl.searchParams.get("id") || "";
    const event = requestUrl.searchParams.get("event") || "";
    if (!id || !["impression", "click"].includes(event)) {
      sendJson(res, 400, { ok: false, error: "Anuncio o evento invalido" });
      return;
    }
    sendJson(res, 200, { ok: true, metrics: trackAd(id, event) });
    return;
  }

  if (requestUrl.pathname === "/api/ads/metrics") {
    sendJson(res, 200, readAdMetrics());
    return;
  }

  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Prohibido");
    return;
  }
  sendFile(res, filePath);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`De Taquito disponible en http://localhost:${PORT}`);
  });
}

module.exports = { searchAll, searchShop, buildCatalog, buildAutomaticDeals, getExchangeRates, shops, server, detectCategory };
