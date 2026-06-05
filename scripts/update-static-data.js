const fs = require("node:fs");
const path = require("node:path");
const { buildCatalog, getExchangeRates } = require("../server");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

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
    error: catalog.reason?.message || "No se pudo actualizar catalogo",
    sources: [],
    products: []
  };

  if (!catalogData.products?.length) {
    catalogData.error = catalogData.error || "La actualizacion termino sin productos. Revisa si las tiendas bloquearon la consulta o si no respondieron desde GitHub Actions.";
  }

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
        text: `Oferta tomada del catalogo actualizado automaticamente.`,
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
