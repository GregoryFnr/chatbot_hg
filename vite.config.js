import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

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
                items = nodes.map((n) => ({
                  name: n.tags?.name || "Sans nom",
                  address: buildAddress(n.tags),
                  type: category === "restaurant"
                    ? (n.tags?.amenity === "fast_food" ? "fastfood" : (filters?.type || null))
                    : (filters?.type || null),
                  typeLabel: mapTypeLabel(category, n.tags),
                  budget: category !== "activity" ? null : undefined,
                  lat: n.lat,
                  lon: n.lon,
                  tags: n.tags || {},
                })).filter((p) => !!p.name);
                if (items.length >= 3) break;
              } catch {}
            }

            const withDurations = [];
            for (const it of items) {
              try {
                const minutes = await getWalkMinutes(HOTEL, { lat: it.lat, lon: it.lon });
                if (minutes == null) continue;
                it.distanceMinutes = minutes;
                withDurations.push(it);
              } catch {}
            }

            let results = withDurations;
            if (filters?.maxWalk) {
              results = results.filter((p) => p.distanceMinutes <= filters.maxWalk);
            }
            results.sort((a, b) => (a.distanceMinutes || 9999) - (b.distanceMinutes || 9999));

            const mapped = results.map((p) => ({
              name: p.name,
              address: p.address,
              type: p.type,
              typeLabel: p.typeLabel,
              budget: p.budget ?? null,
              distanceMinutes: p.distanceMinutes ?? null,
              rating: null,
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
