const defaultStores = [
  { name: "Thot Computacion", url: "https://thotcomputacion.com.uy/" },
  { name: "Hard PC", url: "https://www.hardpc.com.uy/" },
  { name: "NNET", url: "https://www.nnet.com.uy/" },
  { name: "PC Compu", url: "https://www.pccompu.com.uy/" },
  { name: "Digital Outlet", url: "https://www.digitaloutlet.com.uy/" },
  { name: "Pc Store", url: "https://pcstore.com.uy/" },
  { name: "TComponentes", url: "https://www.tcomponentes.com.uy/" },
  { name: "ZonaTecno", url: "https://www.zonatecno.com.uy/" },
  { name: "Digital World", url: "https://digitalworld.com.uy/" },
  { name: "LINK.UY", url: "https://link.uy/" },
  { name: "Pc Parts Uy", url: "https://pcpartsuy.com.uy/" },
  { name: "Aslan Hardware Store", url: "https://www.aslanstoreuy.com/" },
  { name: "Tecno PC Uruguay", url: "https://www.tecnopcuy.com/" },
  { name: "Zona Laptop", url: "https://www.zonalaptop.com.uy/" },
  { name: "CDR Medios / Labtech", url: "https://cdrmedios.com/" },
  { name: "Pro-Gamer", url: "https://www.facebook.com/progameruy/" },
  { name: "TOPTECNOUY", url: "https://www.toptecnouy.com/" },
  { name: "Infinit Technology", url: "https://www.infinit.com.uy/" },
  { name: "TiendaElectronicaUY", url: "https://tiendaelectronicauy.com/" },
  { name: "Banifox", url: "https://www.banifox.com/" }
];

const defaultAds = [
  {
    position: "top",
    label: "Sponsor principal",
    title: "Tu tienda puede aparecer aca",
    text: "Banner destacado para promociones de hardware, envios o descuentos.",
    action: "Reservar espacio",
    url: "#fuentes",
    tone: "green"
  },
  {
    position: "inline",
    label: "Publicidad",
    title: "Espacio entre resultados",
    text: "Ideal para ofertas semanales, lanzamientos o cupones.",
    action: "Ver opciones",
    url: "#fuentes",
    tone: "amber"
  },
  {
    position: "bottom",
    label: "Sponsor secundario",
    title: "Promociona accesorios, notebooks o upgrades",
    text: "Formato horizontal visible despues de la comparativa.",
    action: "Contactar",
    url: "#fuentes",
    tone: "graphite"
  }
];

const defaultDeals = [
  {
    title: "SSD NVMe 1TB",
    category: "Almacenamiento",
    store: "Thot Computacion",
    priceText: "US$ 89",
    oldPriceText: "US$ 109",
    badge: "Oferta del dia",
    text: "Buen punto de entrada para actualizar una PC gamer o notebook compatible.",
    url: "https://thotcomputacion.com.uy/",
    image: "assets/deals/ssd-nvme.svg",
    tone: "green"
  },
  {
    title: "Monitor 24 pulgadas 100Hz",
    category: "Monitores",
    store: "Hard PC",
    priceText: "US$ 119",
    oldPriceText: "US$ 139",
    badge: "Popular",
    text: "Formato comodo para escritorio, estudio y gaming casual.",
    url: "https://www.hardpc.com.uy/",
    image: "assets/deals/monitor-24.svg",
    tone: "graphite"
  },
  {
    title: "Mouse gamer inalambrico",
    category: "Perifericos",
    store: "Banifox",
    priceText: "US$ 24",
    oldPriceText: "US$ 32",
    badge: "Precio bajo",
    text: "Accesorio rapido para completar setup sin gastar demasiado.",
    url: "https://www.banifox.com/",
    image: "assets/deals/mouse-gamer.svg",
    tone: "amber"
  }
];

let stores = [...defaultStores];
let ads = [...defaultAds];
let deals = [...defaultDeals];
let automaticDeals = [];
let automaticDealsLoaded = false;
let staticCatalog = null;
const seenAdImpressions = new Set();

const demoProducts = [
  {
    name: "NVIDIA GeForce RTX 4070 Super 12GB",
    category: "Graficas",
    specs: "12 GB GDDR6X, DLSS 3, refrigeracion triple ventilador",
    visual: "linear-gradient(135deg, #1e2b31, #5ee0d1 52%, #f5a524)",
    shape: "polygon(6% 20%, 94% 20%, 94% 74%, 80% 74%, 80% 86%, 20% 86%, 20% 74%, 6% 74%)",
    offers: [
      { store: "Thot Computacion", price: 32990, stock: true, url: "https://thotcomputacion.com.uy/" },
      { store: "Hard PC", price: 31500, stock: true, url: "https://www.hardpc.com.uy/" },
      { store: "Banifox", price: 33900, stock: true, url: "https://www.banifox.com/" },
      { store: "Pc Parts Uy", price: 30990, stock: false, url: "https://pcpartsuy.com.uy/" }
    ]
  },
  {
    name: "Samsung 990 Pro 2TB NVMe",
    category: "Almacenamiento",
    specs: "PCIe 4.0, hasta 7450 MB/s, disipador integrado",
    visual: "linear-gradient(135deg, #26333b, #d94c6a 58%, #ffffff)",
    shape: "polygon(5% 35%, 95% 35%, 95% 65%, 5% 65%)",
    offers: [
      { store: "Digital Outlet", price: 5890, stock: true, url: "https://www.digitaloutlet.com.uy/" },
      { store: "NNET", price: 6250, stock: true, url: "https://www.nnet.com.uy/" },
      { store: "TComponentes", price: 6490, stock: true, url: "https://www.tcomponentes.com.uy/" }
    ]
  },
  {
    name: "AMD Ryzen 7 7800X3D",
    category: "Procesadores",
    specs: "8 nucleos, 16 hilos, 3D V-Cache, socket AM5",
    visual: "radial-gradient(circle at 50% 50%, #f5a524 0 18%, #202b31 19% 52%, #00897b 53%)",
    shape: "polygon(18% 18%, 82% 18%, 82% 82%, 18% 82%)",
    offers: [
      { store: "Thot Computacion", price: 17890, stock: true, url: "https://thotcomputacion.com.uy/" },
      { store: "Pc Store", price: 16990, stock: true, url: "https://pcstore.com.uy/" },
      { store: "Aslan Hardware Store", price: 18450, stock: false, url: "https://www.aslanstoreuy.com/" }
    ]
  },
  {
    name: "LG UltraGear 27 pulgadas QHD 180Hz",
    category: "Monitores",
    specs: "IPS, 2560x1440, 1 ms, HDMI 2.1 y DisplayPort",
    visual: "linear-gradient(145deg, #111a20 0 62%, #5ee0d1 63% 72%, #e7edf0 73%)",
    shape: "polygon(4% 8%, 96% 8%, 96% 72%, 58% 72%, 58% 88%, 76% 88%, 76% 96%, 24% 96%, 24% 88%, 42% 88%, 42% 72%, 4% 72%)",
    offers: [
      { store: "ZonaTecno", price: 12490, stock: true, url: "https://www.zonatecno.com.uy/" },
      { store: "Digital World", price: 12990, stock: true, url: "https://digitalworld.com.uy/" },
      { store: "Zona Laptop", price: 11990, stock: true, url: "https://www.zonalaptop.com.uy/" }
    ]
  },
  {
    name: "Logitech G Pro X Superlight 2",
    category: "Perifericos",
    specs: "Sensor Hero 2, inalambrico, 60 g, USB-C",
    visual: "linear-gradient(160deg, #ffffff, #dbe2e6 52%, #00897b)",
    shape: "ellipse(34% 48% at 50% 50%)",
    offers: [
      { store: "LINK.UY", price: 5490, stock: true, url: "https://link.uy/" },
      { store: "Tecno PC Uruguay", price: 5790, stock: true, url: "https://www.tecnopcuy.com/" },
      { store: "TOPTECNOUY", price: 6190, stock: false, url: "https://www.toptecnouy.com/" }
    ]
  },
  {
    name: "Corsair RM850x 80 Plus Gold",
    category: "Fuentes",
    specs: "850 W, modular, ATX 3.1, ventilador silencioso",
    visual: "linear-gradient(135deg, #26333b 0 50%, #66737d 51% 72%, #f5a524 73%)",
    shape: "polygon(14% 18%, 86% 18%, 94% 30%, 94% 78%, 14% 78%, 6% 66%, 6% 30%)",
    offers: [
      { store: "PC Compu", price: 6990, stock: true, url: "https://www.pccompu.com.uy/" },
      { store: "Infinit Technology", price: 7290, stock: true, url: "https://www.infinit.com.uy/" },
      { store: "TiendaElectronicaUY", price: 7490, stock: true, url: "https://tiendaelectronicauy.com/" }
    ]
  }
];

const formatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "UYU",
  maximumFractionDigits: 0
});

let exchangeRate = {
  USD_TO_UYU: 40
};

const state = {
  query: "",
  category: "Todas",
  store: "Todas",
  sort: "best",
  currency: "original",
  stockOnly: true,
  products: demoProducts,
  mode: "demo",
  loading: false,
  resultsVisible: false,
  message: "",
  sourceSummary: "",
  sources: [],
  cache: null,
  lastGeneratedAt: "",
  renderedProducts: []
};

const categorySelect = document.querySelector("#categorySelect");
const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const storeSelect = document.querySelector("#storeSelect");
const sortSelect = document.querySelector("#sortSelect");
const currencySelect = document.querySelector("#currencySelect");
const stockOnly = document.querySelector("#stockOnly");
const productsSection = document.querySelector("#productos");
const productsGrid = document.querySelector("#productsGrid");
const resultCount = document.querySelector("#resultCount");
const resultsTitle = document.querySelector("#resultsTitle");
const sourceStatus = document.querySelector("#sourceStatus");
const template = document.querySelector("#productTemplate");
const dealTemplate = document.querySelector("#dealTemplate");
const storesGrid = document.querySelector("#storesGrid");
const dealsGrid = document.querySelector("#dealsGrid");
const refreshDealsButton = document.querySelector("#refreshDealsButton");
const topAd = document.querySelector("#topAd");
const bottomAd = document.querySelector("#bottomAd");
const rateStatus = document.querySelector("#rateStatus");
const productModal = document.querySelector("#productModal");
const modalImage = document.querySelector("#modalImage");
const modalVisual = document.querySelector("#modalVisual");
const modalCategory = document.querySelector("#modalCategory");
const modalTitle = document.querySelector("#modalTitle");
const modalSpecs = document.querySelector("#modalSpecs");
const modalBestPrice = document.querySelector("#modalBestPrice");
const modalBestStore = document.querySelector("#modalBestStore");
const modalMeta = document.querySelector("#modalMeta");
const modalOffers = document.querySelector("#modalOffers");
const modalHistory = document.querySelector("#modalHistory");
const targetPriceInput = document.querySelector("#targetPriceInput");
const saveAlertButton = document.querySelector("#saveAlertButton");
const alertStatus = document.querySelector("#alertStatus");
let activeDetailProduct = null;

function readAlerts() {
  try {
    return JSON.parse(localStorage.getItem("deTaquitoAlerts") || "{}");
  } catch {
    return {};
  }
}

function writeAlerts(alerts) {
  localStorage.setItem("deTaquitoAlerts", JSON.stringify(alerts));
}

function availableOffers(product) {
  return product.offers
    .filter((offer) => state.store === "Todas" || offer.store === state.store)
    .filter((offer) => !state.stockOnly || offer.stock);
}

function offerValue(offer) {
  return offer.priceUYU ?? offer.price ?? Number.POSITIVE_INFINITY;
}

function offerAmountInCurrency(offer, currency) {
  const amount = offer.amount ?? offer.price ?? offer.priceUYU ?? 0;
  const sourceCurrency = offer.currency || "UYU";

  if (currency === sourceCurrency) return amount;
  if (currency === "UYU") return offer.priceUYU ?? (sourceCurrency === "USD" ? amount * exchangeRate.USD_TO_UYU : amount);
  if (currency === "USD") return sourceCurrency === "USD" ? amount : (offer.priceUYU ?? amount) / exchangeRate.USD_TO_UYU;
  return amount;
}

function formatCurrency(amount, currency) {
  if (currency === "USD") {
    return `US$ ${amount.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
  }
  return `$ ${amount.toLocaleString("es-UY", { maximumFractionDigits: 0 })}`;
}

function offerPrice(offer) {
  if (state.currency === "original") {
    return offer.priceText || formatter.format(offer.price ?? offer.priceUYU ?? 0);
  }
  return formatCurrency(offerAmountInCurrency(offer, state.currency), state.currency);
}

function offerOriginalNote(offer) {
  if (state.currency === "original" || !offer.priceText) return "";
  return ` · original ${offer.priceText}`;
}

function bestOffer(product) {
  const offers = availableOffers(product);
  return offers.reduce((best, offer) => (!best || offerValue(offer) < offerValue(best) ? offer : best), null);
}

function maxPrice(product) {
  return Math.max(...product.offers.map((offer) => offerValue(offer)));
}

function saving(product) {
  const best = bestOffer(product);
  return best ? maxPrice(product) - offerValue(best) : 0;
}

function productStoreCount(product) {
  return new Set((product.offers || []).map((offer) => offer.store)).size;
}

function formatDateTime(value) {
  if (!value) return "Sin fecha de consulta";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha de consulta";
  return date.toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function historyPrice(entry) {
  if (state.currency === "USD") {
    return formatCurrency((entry.priceUYU || 0) / exchangeRate.USD_TO_UYU, "USD");
  }
  if (state.currency === "original" && entry.priceText) return entry.priceText;
  return formatCurrency(entry.priceUYU || 0, "UYU");
}

function historyDelta(entry, previous) {
  if (!previous) return "Primer registro";
  const diff = (entry.priceUYU || 0) - (previous.priceUYU || 0);
  if (!diff) return "Sin cambio";
  return `${diff < 0 ? "Bajo" : "Subio"} ${formatCurrency(Math.abs(diff), "UYU")}`;
}

function targetAmountToUyu(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return state.currency === "USD" ? amount * exchangeRate.USD_TO_UYU : amount;
}

function renderAlertStatus(product) {
  const alerts = readAlerts();
  const key = product.historyKey || product.name;
  const alert = alerts[key];
  const best = bestOffer(product);
  targetPriceInput.value = alert?.targetUYU ? Math.round(alert.targetUYU) : "";

  if (!alert) {
    alertStatus.textContent = "Sin alerta guardada para este producto.";
    return;
  }

  if (offerValue(best) <= alert.targetUYU) {
    alertStatus.textContent = `Objetivo alcanzado: mejor precio ${offerPrice(best)}.`;
    alertStatus.className = "modal-meta alert-hit";
  } else {
    alertStatus.textContent = `Alerta activa: objetivo ${formatCurrency(alert.targetUYU, "UYU")}.`;
    alertStatus.className = "modal-meta";
  }
}

function saveActiveAlert() {
  if (!activeDetailProduct) return;
  const targetUYU = targetAmountToUyu(targetPriceInput.value);
  if (!targetUYU) {
    alertStatus.textContent = "Ingresa un precio objetivo valido.";
    return;
  }

  const key = activeDetailProduct.historyKey || activeDetailProduct.name;
  const alerts = readAlerts();
  alerts[key] = {
    productName: activeDetailProduct.name,
    targetUYU,
    createdAt: new Date().toISOString()
  };
  writeAlerts(alerts);
  renderAlertStatus(activeDetailProduct);
}

function setupCategories() {
  const categories = ["Todas", ...new Set(state.products.map((product) => product.category))];
  categorySelect.innerHTML = categories.map((category) => `<option value="${category}">${category}</option>`).join("");
  categorySelect.value = state.category;
}

function setupStoreFilter() {
  const storeNames = new Set();
  state.products.forEach((product) => {
    product.offers.forEach((offer) => storeNames.add(offer.store));
  });
  const options = ["Todas", ...[...storeNames].sort((a, b) => a.localeCompare(b, "es"))];
  storeSelect.innerHTML = options.map((store) => `<option value="${store}">${store}</option>`).join("");
  if (!options.includes(state.store)) state.store = "Todas";
  storeSelect.value = state.store;
}

function renderStores() {
  storesGrid.innerHTML = stores
    .map((store) => `<a href="${store.url}" target="_blank" rel="noopener">${store.name}</a>`)
    .join("");
}

function slug(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "anuncio";
}

function searchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function productMatchesStaticQuery(product, query) {
  const tokens = searchText(query).split(/[^a-z0-9]+/).filter((token) => token.length > 1);
  const haystack = searchText([
    product.name,
    product.category,
    product.specs,
    ...(product.offers || []).map((offer) => `${offer.name || ""} ${offer.store || ""}`)
  ].join(" "));
  return tokens.every((token) => haystack.includes(token));
}

async function loadStaticCatalog() {
  if (staticCatalog) return staticCatalog;
  const response = await fetch(`data/live-catalog.json?v=${Date.now()}`);
  if (!response.ok) throw new Error("No se pudo cargar el catalogo estatico");
  staticCatalog = await response.json();
  return staticCatalog;
}

async function searchStaticCatalog(query) {
  const catalog = await loadStaticCatalog();
  const products = (catalog.products || [])
    .filter((product) => productMatchesStaticQuery(product, query))
    .slice(0, 40);
  return {
    query,
    generatedAt: catalog.generatedAt || "",
    sources: catalog.sources || [],
    products,
    matchMode: "static",
    cache: {
      hit: true,
      cachedAt: catalog.generatedAt || null
    }
  };
}

function adId(ad) {
  return ad.id || `${ad.position || "ad"}-${slug(ad.title || ad.label || "anuncio")}`;
}

function trackAdId(id, event) {
  if (!id || !["impression", "click"].includes(event)) return;
  if (event === "impression") {
    if (seenAdImpressions.has(id)) return;
    seenAdImpressions.add(id);
  }

  const url = `/api/ads/track?id=${encodeURIComponent(id)}&event=${event}`;
  if (event === "click" && navigator.sendBeacon) {
    navigator.sendBeacon(url);
    return;
  }
  fetch(url, { keepalive: true }).catch(() => {});
}

function trackAd(ad, event) {
  trackAdId(adId(ad), event);
}

function renderAd(ad, variant = "wide") {
  const id = adId(ad);
  const url = ad.url || "#fuentes";
  const external = url.startsWith("http");
  const logo = ad.logo ? `<img class="ad-logo" src="${ad.logo}" alt="">` : "";
  const image = ad.image ? `<img class="ad-image" src="${ad.image}" alt="">` : "";
  return `
    <a class="ad-card ad-${ad.tone || "green"} ad-${variant}" href="${url}" data-ad-id="${id}" ${external ? 'target="_blank" rel="noopener"' : ""}>
      <span class="ad-label">${logo}${ad.label || "Publicidad"}</span>
      <strong>${ad.title || "Espacio publicitario"}</strong>
      <span>${ad.text || ""}</span>
      <em>${ad.action || "Ver mas"}</em>
      ${image}
    </a>
  `;
}

function renderAds() {
  const top = ads.find((ad) => ad.position === "top");
  const bottom = ads.find((ad) => ad.position === "bottom");
  if (top) {
    topAd.innerHTML = renderAd(top, "wide");
    trackAd(top, "impression");
  }
  if (bottom) {
    bottomAd.innerHTML = renderAd(bottom, "wide");
    trackAd(bottom, "impression");
  }
}

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error("No se pudo cargar el archivo");
    const data = await response.json();
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
}

async function loadSiteData() {
  const [loadedStores, loadedAds, loadedDeals] = await Promise.all([
    loadJson("data/stores.json", defaultStores),
    loadJson("data/ads.json", defaultAds),
    loadJson("data/deals.json", defaultDeals)
  ]);
  stores = loadedStores;
  ads = loadedAds;
  deals = loadedDeals;
}

async function loadExchangeRate() {
  try {
    const response = await fetch("/api/rates");
    if (!response.ok) throw new Error("No se pudo cargar la cotizacion");
    const data = await response.json();
    if (!Number.isFinite(Number(data.USD_TO_UYU))) throw new Error("Cotizacion invalida");
    exchangeRate = data;
  } catch {
    try {
      const response = await fetch("data/live-rates.json");
      if (!response.ok) throw new Error("No se pudo cargar cotizacion estatica");
      const data = await response.json();
      if (!Number.isFinite(Number(data.USD_TO_UYU))) throw new Error("Cotizacion estatica invalida");
      exchangeRate = data;
    } catch {
      exchangeRate = {
        USD_TO_UYU: 40,
        source: "Referencia fija",
        fallback: true
      };
    }
  }
}

async function loadAutomaticDeals({ refresh = false } = {}) {
  automaticDealsLoaded = false;
  if (refreshDealsButton) refreshDealsButton.disabled = true;
  renderDeals();
  try {
    const response = await fetch(`/api/deals?limit=3${refresh ? "&refresh=1" : ""}`);
    if (!response.ok) throw new Error("No se pudieron cargar ofertas automaticas");
    const data = await response.json();
    automaticDeals = Array.isArray(data.deals) ? data.deals : [];
  } catch {
    try {
      const response = await fetch(`data/live-deals.json${refresh ? `?v=${Date.now()}` : ""}`);
      if (!response.ok) throw new Error("No se pudieron cargar ofertas estaticas");
      const data = await response.json();
      automaticDeals = Array.isArray(data.deals) ? data.deals : [];
    } catch {
      automaticDeals = [];
    }
  } finally {
    automaticDealsLoaded = true;
    if (refreshDealsButton) refreshDealsButton.disabled = false;
  }
}

function renderRateStatus() {
  const rate = Number(exchangeRate.USD_TO_UYU || 40);
  const source = exchangeRate.source || "Referencia fija";
  const note = exchangeRate.fallback ? "modo respaldo" : "cotizacion actual";
  rateStatus.textContent = `USD/UYU ${rate.toLocaleString("es-UY", { maximumFractionDigits: 2 })} · ${source} · ${note}`;
}

function sourceSummary(sources = []) {
  if (!sources.length) return "";
  return sources
    .map((source) => `${source.shop}: ${source.ok ? `${source.offers.length} resultados brutos` : "fallo"}`)
    .join(" · ");
}

function sourceHealth(sources = []) {
  if (!sources.length) return "";
  const ok = sources.filter((source) => source.ok).length;
  const failed = sources.filter((source) => !source.ok).map((source) => source.shop);
  return failed.length
    ? `${ok} de ${sources.length} tiendas respondieron. Sin respuesta: ${failed.join(", ")}.`
    : `${ok} de ${sources.length} tiendas respondieron.`;
}

function renderSourceStatus() {
  sourceStatus.innerHTML = "";
  if (!state.resultsVisible || state.loading || !state.sources.length) return;

  const chips = state.sources.map((source) => `
    <span class="source-chip ${source.ok ? "ok" : "fail"}">
      ${source.shop}
      <small>${source.ok ? `${source.offers?.length || 0} resultados` : "sin respuesta"}</small>
    </span>
  `);

  if (state.cache?.hit) {
    chips.unshift(`
      <span class="source-chip cache">
        Cache
        <small>resultado reciente</small>
      </span>
    `);
  }

  sourceStatus.innerHTML = chips.join("");
}

function filteredProducts() {
  return state.products
    .filter((product) => {
      const haystack = `${product.name} ${product.category} ${product.specs}`.toLowerCase();
      const matchesQuery = state.mode === "real" || haystack.includes(state.query.toLowerCase());
      const matchesCategory = state.category === "Todas" || product.category === state.category;
      return matchesQuery && matchesCategory && bestOffer(product);
    })
    .sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name, "es");
      if (state.sort === "saving") return saving(b) - saving(a);
      return offerValue(bestOffer(a)) - offerValue(bestOffer(b));
    });
}

function renderProduct(product, productIndex) {
  const node = template.content.firstElementChild.cloneNode(true);
  const best = bestOffer(product);
  const productSaving = saving(product);
  const sortedOffers = availableOffers(product).sort((a, b) => offerValue(a) - offerValue(b));

  const visual = node.querySelector(".product-visual");
  const image = node.querySelector(".product-img");
  if (product.image) {
    image.src = product.image;
    image.alt = product.name;
    image.hidden = false;
    image.addEventListener("error", () => {
      image.hidden = true;
      visual.hidden = false;
    }, { once: true });
    image.addEventListener("load", () => {
      if (image.naturalWidth < 140 || image.naturalHeight < 140) {
        image.hidden = true;
        visual.hidden = false;
      }
    }, { once: true });
    visual.hidden = true;
  } else {
    image.hidden = true;
    visual.hidden = false;
    visual.style.setProperty("--visual", product.visual);
    visual.style.setProperty("--shape", product.shape);
  }
  node.querySelector(".category-pill").textContent = product.category;
  node.querySelector("h3").textContent = product.name;
  node.querySelector(".specs").textContent = product.specs;
  node.querySelector(".saving-badge").textContent = state.mode === "real"
    ? `${productStoreCount(product)} tienda${productStoreCount(product) === 1 ? "" : "s"}`
    : productSaving > 0 ? `Ahorra ${formatter.format(productSaving)}` : "Sin diferencia";
  node.querySelector(".best-price strong").textContent = offerPrice(best);
  node.querySelector(".best-price small").textContent = `${best.store} · ${best.stock ? "disponible" : "sin stock"}${offerOriginalNote(best)}`;

  node.querySelector(".detail-button").dataset.productIndex = String(productIndex);

  node.querySelector(".offers").innerHTML = sortedOffers
    .map((offer) => {
      const isBest = offer === best;
      return `
        <div class="offer-row">
          <div class="store">
            <strong>${offer.store}${isBest ? " · mejor" : ""}</strong>
            <span class="stock ${offer.stock ? "" : "out"}">${offer.stock ? "Disponible" : "Sin stock"}</span>
          </div>
          <span class="price" title="${state.currency === "original" ? "" : offer.priceText || ""}">${offerPrice(offer)}</span>
          <a class="store-link" href="${offer.url}" target="_blank" rel="noopener" aria-label="Ir a la tienda ${offer.store}">Ir a la tienda</a>
        </div>
      `;
    })
    .join("");

  return node;
}

function openProductDetail(product) {
  activeDetailProduct = product;
  const best = bestOffer(product);
  const sortedOffers = availableOffers(product).sort((a, b) => offerValue(a) - offerValue(b));

  modalCategory.textContent = product.category;
  modalTitle.textContent = product.name;
  modalSpecs.textContent = product.specs || "";
  modalBestPrice.textContent = offerPrice(best);
  modalBestStore.textContent = `${best.store} - ${best.stock ? "disponible" : "sin stock"}${offerOriginalNote(best)}`;
  modalMeta.textContent = `${productStoreCount(product)} tienda${productStoreCount(product) === 1 ? "" : "s"} comparada${productStoreCount(product) === 1 ? "" : "s"} - Consulta: ${formatDateTime(state.lastGeneratedAt)}`;

  if (product.image) {
    modalImage.src = product.image;
    modalImage.alt = product.name;
    modalImage.hidden = false;
    modalVisual.hidden = true;
    modalImage.addEventListener("error", () => {
      modalImage.hidden = true;
      modalVisual.hidden = false;
    }, { once: true });
  } else {
    modalImage.hidden = true;
    modalVisual.hidden = false;
    modalVisual.style.setProperty("--visual", product.visual);
    modalVisual.style.setProperty("--shape", product.shape);
  }

  modalOffers.innerHTML = sortedOffers.map((offer) => `
    <tr>
      <td>
        <strong>${offer.store}</strong>
        ${offer.enriched ? "<span>Ficha revisada</span>" : ""}
      </td>
      <td>
        <strong>${offerPrice(offer)}</strong>
        ${state.currency === "original" || !offer.priceText ? "" : `<span>Original ${offer.priceText}</span>`}
      </td>
      <td><span class="stock ${offer.stock ? "" : "out"}">${offer.stock ? "Disponible" : "Sin stock"}</span></td>
      <td><a href="${offer.url}" target="_blank" rel="noopener">Ir a la tienda</a></td>
    </tr>
  `).join("");

  const history = [...(product.priceHistory || [])].slice(-8);
  modalHistory.innerHTML = history.length
    ? history.reverse().map((entry, index, list) => {
      const previous = list[index + 1];
      return `
        <div class="history-item">
          <strong>${historyPrice(entry)}</strong>
          <span>${entry.store} - ${formatDateTime(entry.at)}</span>
          <em class="${previous && entry.priceUYU < previous.priceUYU ? "down" : previous && entry.priceUYU > previous.priceUYU ? "up" : ""}">${historyDelta(entry, previous)}</em>
        </div>
      `;
    }).join("")
    : '<p class="muted">Todavia no hay historial suficiente para este producto.</p>';
  renderAlertStatus(product);

  productModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeProductDetail() {
  activeDetailProduct = null;
  productModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function renderHeroDeal(items) {
  const [first] = items;
  if (!first) return;

  const best = bestOffer(first);
  document.querySelector("#heroDealName").textContent = first.name;
  document.querySelector("#heroDealPrice").textContent = offerPrice(best);
  document.querySelector("#heroDealStore").textContent = `${best.store} - comparado en ${productStoreCount(first)} tienda${productStoreCount(first) === 1 ? "" : "s"}`;
  document.querySelector("#heroDealStore").textContent = `${best.store} · comparado con ${first.offers.length} tiendas`;
  document.querySelector("#heroDealStore").textContent = `${best.store} - comparado en ${productStoreCount(first)} tienda${productStoreCount(first) === 1 ? "" : "s"}`;
}

function renderHeroPrompt() {
  document.querySelector("#heroDealName").textContent = "Busca un producto para ver la mejor oferta";
  document.querySelector("#heroDealPrice").textContent = "";
  document.querySelector("#heroDealStore").textContent = "Comparamos tiendas conectadas y te llevamos directo a la oferta.";
}

function loadingSummary() {
  const names = storeSelect.options.length > 1
    ? [...storeSelect.options].map((option) => option.value).filter((value) => value !== "Todas")
    : stores.map((store) => store.name);
  const visible = names.slice(0, 8).map((store) => `<span>${store}</span>`);
  if (names.length > 8) visible.push(`<span>+${names.length - 8} tiendas</span>`);
  return visible.join("");
}

function render() {
  productsSection.hidden = !state.resultsVisible && !state.loading;
  if (productsSection.hidden) {
    sourceStatus.innerHTML = "";
    return;
  }

  const items = filteredProducts();
  state.renderedProducts = items;
  resultsTitle.textContent = state.query ? `Resultados para "${state.query}"` : "Productos encontrados";
  resultCount.textContent = state.loading ? "Buscando precios reales..." : state.message || `${items.length} ${state.mode === "real" ? "ofertas" : "productos"}`;
  productsGrid.innerHTML = "";
  renderSourceStatus();

  if (state.loading) {
    sourceStatus.innerHTML = "";
    productsGrid.innerHTML = `
      <div class="empty-state loading-state">
        <strong>Consultando tiendas conectadas...</strong>
        <span>${loadingSummary()}</span>
      </div>
    `;
    return;
  }

  if (!items.length) {
    const message = state.message || (state.query ? "Pulsa Comparar para consultar precios reales." : "No hay productos que coincidan con esos filtros.");
    productsGrid.innerHTML = `
      <div class="empty-state">
        <strong>${message}</strong>
        ${state.sourceSummary ? `<span>${state.sourceSummary}</span>` : ""}
      </div>
    `;
    return;
  }

  const inlineAd = ads.find((ad) => ad.position === "inline");
  items.forEach((product, index) => {
    productsGrid.appendChild(renderProduct(product, index));
    if (inlineAd && index === 1) {
      const adNode = document.createElement("div");
      adNode.className = "ad-slot product-ad";
      adNode.innerHTML = renderAd(inlineAd, "card");
      productsGrid.appendChild(adNode);
      trackAd(inlineAd, "impression");
    }
  });
  if (state.mode === "real") renderHeroDeal(items);
}

function renderDeals() {
  dealsGrid.innerHTML = "";
  const visibleDeals = automaticDeals
    .map((deal) => ({
      ...deal,
      source: "auto",
      badge: deal.badge || "Precio real"
    }))
    .slice(0, 3);

  if (!visibleDeals.length) {
    dealsGrid.innerHTML = `
      <div class="empty-state">
        <strong>${automaticDealsLoaded ? "No pudimos actualizar ofertas reales ahora." : "Actualizando ofertas reales..."}</strong>
        <span>${automaticDealsLoaded ? "La seccion evita mostrar precios manuales desactualizados. Volvera a intentar al recargar." : "Estamos consultando tiendas conectadas para traer precios vigentes."}</span>
      </div>
    `;
    return;
  }

  visibleDeals.forEach((deal) => {
    const node = dealTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector(".deal-img");
    const visual = node.querySelector(".deal-visual");

    node.classList.add(`deal-${deal.tone || "green"}`);
    if (deal.source === "auto") node.classList.add("deal-live");
    node.querySelector(".deal-badge").textContent = deal.badge || "Oferta";
    node.querySelector(".deal-category").textContent = `${deal.category || "Oferta"} · ${deal.store || "Tienda"}`;
    node.querySelector("h3").textContent = deal.title;
    node.querySelector("p").textContent = deal.text || "";
    node.querySelector(".deal-updated").textContent = deal.generatedAt ? `Actualizado ${formatDateTime(deal.generatedAt)}` : "Precio consultado recientemente";
    node.querySelector(".deal-price strong").textContent = deal.priceText;
    node.querySelector(".deal-price span").textContent = deal.oldPriceText || "";
    node.querySelector("a").href = deal.url;

    if (deal.image) {
      image.src = deal.image;
      image.alt = deal.title;
      image.hidden = false;
      visual.hidden = true;
      image.addEventListener("error", () => {
        image.hidden = true;
        visual.hidden = false;
      }, { once: true });
    } else {
      image.hidden = true;
      visual.hidden = false;
    }

    dealsGrid.appendChild(node);
  });
}

async function searchRealPrices() {
  const query = searchInput.value.trim();
  state.query = query;

  if (query.length < 2) {
    state.mode = "demo";
    state.products = demoProducts;
    state.resultsVisible = false;
    state.message = "Escribe un producto para comparar";
    state.sources = [];
    state.cache = null;
    state.lastGeneratedAt = "";
    renderHeroPrompt();
    setupCategories();
    setupStoreFilter();
    render();
    return;
  }

  state.loading = true;
  state.resultsVisible = true;
  state.message = "";
  state.sources = [];
  state.cache = null;
  state.lastGeneratedAt = "";
  render();

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error("No se pudo consultar el servidor");
    const data = await response.json();
    state.mode = "real";
    state.products = data.products || [];
    state.category = "Todas";
    state.store = "Todas";
    const okSources = (data.sources || []).filter((source) => source.ok).length;
    const offers = state.products.reduce((sum, product) => sum + product.offers.length, 0);
    state.sourceSummary = sourceHealth(data.sources || []);
    state.sources = data.sources || [];
    state.cache = data.cache || null;
    state.lastGeneratedAt = data.generatedAt || "";
    state.message = offers
      ? data.matchMode === "approximate"
        ? `${offers} alternativas aproximadas · ${okSources} tiendas respondieron`
        : `${offers} ofertas reales · ${okSources} tiendas respondieron`
      : "No encontramos ofertas reales para esa busqueda";
    if (data.cache?.hit && offers) state.message = `${state.message} - cache reciente`;
  } catch (error) {
    try {
      const data = await searchStaticCatalog(query);
      state.mode = "real";
      state.products = data.products || [];
      state.category = "Todas";
      state.store = "Todas";
      const offers = state.products.reduce((sum, product) => sum + product.offers.length, 0);
      state.sourceSummary = data.generatedAt ? `Catalogo actualizado: ${formatDateTime(data.generatedAt)}` : "Catalogo estatico";
      state.sources = data.sources || [];
      state.cache = data.cache || null;
      state.lastGeneratedAt = data.generatedAt || "";
      state.message = offers
        ? `${offers} ofertas del catalogo actualizado automaticamente`
        : "No encontramos ofertas en el catalogo actualizado";
    } catch {
      state.mode = "demo";
      state.products = demoProducts;
      state.resultsVisible = true;
      state.message = "No pudimos cargar el catalogo actualizado. Mostramos ejemplos para mantener la vista.";
      state.sourceSummary = "";
      state.sources = [];
      state.cache = null;
      state.lastGeneratedAt = "";
      renderHeroPrompt();
    }
  } finally {
    state.loading = false;
    setupCategories();
    setupStoreFilter();
    render();
  }
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  if (state.mode === "real") {
    state.mode = "demo";
    state.products = demoProducts;
    state.resultsVisible = false;
    state.category = "Todas";
    state.store = "Todas";
    state.message = state.query ? "Vista previa. Pulsa Comparar para consultar precios reales." : "";
    state.sourceSummary = "";
    state.sources = [];
    state.cache = null;
    state.lastGeneratedAt = "";
    renderHeroPrompt();
    setupCategories();
    setupStoreFilter();
  }
  render();
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchRealPrices();
});

searchButton.addEventListener("click", searchRealPrices);

saveAlertButton.addEventListener("click", saveActiveAlert);

productsGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".detail-button");
  if (!button) return;
  const product = state.renderedProducts[Number(button.dataset.productIndex)];
  if (product) openProductDetail(product);
});

productModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) closeProductDetail();
});

document.addEventListener("click", (event) => {
  const adLink = event.target.closest("[data-ad-id]");
  if (adLink) trackAdId(adLink.dataset.adId, "click");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !productModal.hidden) closeProductDetail();
});

categorySelect.addEventListener("change", (event) => {
  state.category = event.target.value;
  render();
});

storeSelect.addEventListener("change", (event) => {
  state.store = event.target.value;
  render();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

currencySelect.addEventListener("change", (event) => {
  state.currency = event.target.value;
  render();
});

stockOnly.addEventListener("change", (event) => {
  state.stockOnly = event.target.checked;
  render();
});

refreshDealsButton?.addEventListener("click", () => {
  loadAutomaticDeals({ refresh: true }).then(() => renderDeals());
});

async function init() {
  await Promise.all([loadSiteData(), loadExchangeRate()]);
  setupCategories();
  setupStoreFilter();
  renderStores();
  renderAds();
  renderDeals();
  renderRateStatus();
  renderHeroPrompt();
  render();
  loadAutomaticDeals().then(() => renderDeals());
}

init();
