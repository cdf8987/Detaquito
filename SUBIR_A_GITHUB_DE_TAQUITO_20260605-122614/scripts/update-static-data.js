const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { buildCatalog, getExchangeRates } = require("../server");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CATALOG_ASSET_DIR = path.join(ROOT, "assets", "catalog");
const MAX_CACHED_IMAGES = 160;
const IMAGE_CONCURRENCY = 6;

function writeJson(fileName, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [catalog, rates] = await Promise.allSettled([
    buildCatalog({ refresh: true }),
    getExchangeRates()
  ]);

  const catalogData = catalog.status === "fulfilled" ? catalog.value : {
    generatedAt,
    source: "catalog",
    error: catalog.reason?.message || "No se pudo actualizar catálogo",
    sources: [],
    products: []
  };

  if (!catalogData.products?.length) {
    catalogData.error = catalogData.error || "La actualizacion termino sin productos. Revisa si las tiendas bloquearon la consulta o si no respondieron desde GitHub Actions.";
  }

  await cacheCatalogImages(catalogData);

  writeJson("live-catalog.json", catalogData);

  writeJson("live-deals.json", catalog.status === "fulfilled" ? {
    generatedAt: catalogData.generatedAt || generatedAt,
    source: "static-catalog",
    deals: dealsFromCatalog(catalogData.products || [])
  } : {
    generatedAt,
    source: "automatic",
    error: catalog.reason?.message || "No se pudieron actualizar ofertas",
    deals: []
  });

  writeJson("live-rates.json", rates.status === "fulfilled" ? rates.value : {
    USD_TO_UYU: 40,
    source: "Referencia fija",
    updatedAt: generatedAt,
    fallback: true
  });
}

async function cacheCatalogImages(catalogData) {
  const products = Array.isArray(catalogData.products) ? catalogData.products : [];
  fs.rmSync(CATALOG_ASSET_DIR, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_ASSET_DIR, { recursive: true });

  const jobs = products
    .map((product) => ({
      product,
      offer: (product.offers || []).find((offer) => offer.image) || product.offers?.[0],
      url: product.image || (product.offers || []).find((offer) => offer.image)?.image || ""
    }))
    .filter((job) => isRemoteUrl(job.url))
    .slice(0, MAX_CACHED_IMAGES);

  await runLimited(jobs, IMAGE_CONCURRENCY, async (job) => {
    const localImage = await cacheImage(job.url, `${job.product.name}-${job.offer?.store || ""}`);
    if (!localImage) return;
    job.product.image = localImage;
    if (job.offer) job.offer.image = localImage;
  });

  fs.writeFileSync(path.join(CATALOG_ASSET_DIR, ".gitkeep"), "", "utf8");
}

async function runLimited(items, limit, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        await worker(item);
      } catch {
        // Missing images should not block catalog updates.
      }
    }
  });
  await Promise.all(workers);
}

function isRemoteUrl(value = "") {
  return /^https?:\/\//i.test(value);
}

async function cacheImage(url, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "accept": "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        "referer": new URL(url).origin,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36"
      }
    });
    if (!response.ok) return "";

    const type = response.headers.get("content-type") || "";
    if (!/^image\//i.test(type)) return "";

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1200) return "";

    const ext = imageExtension(url, type);
    const hash = crypto.createHash("sha1").update(`${label}:${url}`).digest("hex").slice(0, 16);
    const fileName = `${safeFileName(label).slice(0, 44)}-${hash}${ext}`;
    const filePath = path.join(CATALOG_ASSET_DIR, fileName);
    fs.writeFileSync(filePath, bytes);
    return `assets/catalog/${fileName}`;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function imageExtension(url, type) {
  if (/webp/i.test(type)) return ".webp";
  if (/png/i.test(type)) return ".png";
  if (/gif/i.test(type)) return ".gif";
  if (/jpe?g/i.test(type)) return ".jpg";
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  } catch {
    // Fall through to jpg.
  }
  return ".jpg";
}

function safeFileName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "producto";
}

function dealsFromCatalog(products) {
  const seenCategories = new Set();
  return products
    .filter((product) => product.offers?.[0]?.stock !== false)
    .sort((a, b) => (a.offers?.[0]?.priceUYU || Number.POSITIVE_INFINITY) - (b.offers?.[0]?.priceUYU || Number.POSITIVE_INFINITY))
    .filter((product) => {
      if (!product.category || seenCategories.has(product.category)) return false;
      seenCategories.add(product.category);
      return true;
    })
    .slice(0, 3)
    .map((product) => {
      const best = product.offers[0];
      return {
        title: product.name,
        category: product.category,
        store: best.store,
        priceText: best.priceText,
        oldPriceText: "",
        badge: "Precio real",
        text: `Oferta tomada del catálogo actualizado automáticamente.`,
        url: best.url,
        image: product.image || best.image || "",
        tone: product.category === "Monitores" || product.category === "Graficas" ? "graphite" : product.category === "Perifericos" ? "amber" : "green",
        source: "auto",
        generatedAt: product.generatedAt || new Date().toISOString()
      };
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
