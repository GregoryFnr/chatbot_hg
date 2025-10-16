import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";

// Coordinates of Hôtel Gascogne (approx). Adjust if needed.
const HOTEL = { lat: 43.595307, lon: 1.432281 };

function bboxFromCenter(lat, lon, meters) {
  const dLat = meters / 111111;
  const dLon = meters / (111111 * Math.cos((lat * Math.PI) / 180));
  return { s: lat - dLat, w: lon - dLon, n: lat + dLat, e: lon + dLon };
}

function buildOverpassQL(category, filters, hotel, radiusMeters) {
  const { s, w, n, e } = bboxFromCenter(hotel.lat, hotel.lon, radiusMeters);

  let selector = "";
  if (category === "restaurant") {
    if (filters?.type === "fastfood") {
      selector = 'node["amenity"="fast_food"]';
    } else {
      selector = 'node["amenity"="restaurant"]';
      if (filters?.type === "asian")
        selector += '["cuisine"~"japanese|chinese|thai|asian",i]';
      if (filters?.type === "italian") selector += '["cuisine"~"italian",i]';
      if (filters?.type === "french") selector += '["cuisine"~"french",i]';
    }
  } else if (category === "bar") {
    selector = 'node["amenity"~"bar|pub"]';
    if (filters?.type === "wine") selector += '["name"~"wine|vin",i]';
    if (filters?.type === "cocktail") selector += '["name"~"cocktail",i]';
    if (filters?.type === "brasserie") selector += '["name"~"brasserie",i]';
  } else if (category === "activity") {
    if (filters?.type === "museum") selector = 'node["tourism"="museum"]';
    else if (filters?.type === "heritage") selector = 'node["historic"]';
    else if (filters?.type === "park")
      selector = 'node["leisure"~"park|garden"]';
    else
      selector =
        '(node["tourism"="museum"];node["historic"];node["leisure"~"park|garden"])';
    if (filters?.price === "free") {
      selector = selector
        .replace(/^node/, 'node["fee"="no"]')
        .replace(/^\(/, '(node["fee"="no"]');
    } else if (filters?.price === "paid") {
      selector = selector
        .replace(/^node/, 'node["fee"="yes"]')
        .replace(/^\(/, '(node["fee"="yes"]');
    }
  } else {
    selector = "node";
  }

  const ql = `
    [out:json][timeout:25];
    (
      ${selector}(${s},${w},${n},${e});
    );
    out body;
    >;
    out skel qt;
  `;
  return ql;
}

async function fetchOverpass(ql) {
  const resp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({ data: ql }),
  });
  if (!resp.ok) throw new Error("Overpass error");
  return resp.json();
}

function tagText(tags, keys, fallback = "") {
  for (const k of keys) if (tags?.[k]) return tags[k];
  return fallback;
}

function buildAddress(tags) {
  const parts = [
    tagText(tags, ["addr:housenumber"]),
    tagText(tags, ["addr:street"]),
    tagText(tags, ["addr:postcode"]),
    tagText(tags, ["addr:city"]),
  ].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return tagText(tags, ["addr:full", "name"], "");
}

async function getWalkMinutes(from, to) {
  const url = `https://router.project-osrm.org/route/v1/foot/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false&alternatives=false&steps=false`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("OSRM error");
  const data = await resp.json();
  const seconds = data?.routes?.[0]?.duration ?? null;
  if (!seconds) return null;
  return Math.ceil(seconds / 60);
}

function mapTypeLabel(category, tags) {
  if (category === "restaurant") {
    const c = tags?.cuisine || "";
    if (/italian/i.test(c)) return "Restaurant italien";
    if (/french/i.test(c)) return "Restaurant français";
    if (/japanese|chinese|thai|asian/i.test(c)) return "Cuisine asiatique";
    if (tags?.amenity === "fast_food") return "Fast food";
    return "Restaurant";
  }
  if (category === "bar") return "Bar / Pub";
  if (category === "activity") {
    if (tags?.tourism === "museum") return "Musée";
    if (tags?.historic) return "Patrimoine";
    if (/park|garden/.test(tags?.leisure || "")) return "Parc / Jardin";
    return "Activité";
  }
  return "";
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      vue(),
      {
        name: "recommendation-api",
        configureServer(server) {
          server.middlewares.use("/api/recommend", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.end("Method Not Allowed");
              return;
            }

            // Parse JSON body
            const body = await new Promise((resolve, reject) => {
              let data = "";
              req.on("data", (chunk) => (data += chunk));
              req.on("end", () => {
                try {
                  resolve(JSON.parse(data || "{}"));
                } catch (e) {
                  reject(e);
                }
              });
              req.on("error", reject);
            }).catch(() => ({}));

            const { category, filters, limit = 6 } = body || {};

            const searchRadii = [1200, 2000, 3000];
            let items = [];
            for (const r of searchRadii) {
              try {
                const ql = buildOverpassQL(category, filters, HOTEL, r);
                const data = await fetchOverpass(ql);
                const nodes = (data?.elements || []).filter(
                  (el) => el.type === "node"
                );
                items = nodes
                  .map((n) => ({
                    name: n.tags?.name || "Sans nom",
                    address: buildAddress(n.tags),
                    type:
                      category === "restaurant"
                        ? n.tags?.amenity === "fast_food"
                          ? "fastfood"
                          : filters?.type || null
                        : filters?.type || null,
                    typeLabel: mapTypeLabel(category, n.tags),
                    budget: category !== "activity" ? null : undefined,
                    lat: n.lat,
                    lon: n.lon,
                    tags: n.tags || {},
                  }))
                  .filter((p) => !!p.name);
                if (items.length >= 3) break;
              } catch {}
            }

            const withDurations = [];
            for (const it of items) {
              try {
                const minutes = await getWalkMinutes(HOTEL, {
                  lat: it.lat,
                  lon: it.lon,
                });
                if (minutes == null) continue;
                it.distanceMinutes = minutes;
                withDurations.push(it);
              } catch {}
            }

            let results = withDurations;
            if (filters?.maxWalk) {
              results = results.filter(
                (p) => p.distanceMinutes <= filters.maxWalk
              );
            }
            results.sort(
              (a, b) =>
                (a.distanceMinutes || 9999) - (b.distanceMinutes || 9999)
            );

            const mapped = results.map((p) => ({
              name: p.name,
              address: p.address,
              type: p.type,
              typeLabel: p.typeLabel,
              budget: p.budget ?? null,
              distanceMinutes: p.distanceMinutes ?? null,
              rating: null,
              phone: p.tags?.phone ?? null,
              website: p.tags?.website ?? null,
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`,
            }));

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(mapped.slice(0, limit)));
          });
        },
      },
    ],
  };
});
