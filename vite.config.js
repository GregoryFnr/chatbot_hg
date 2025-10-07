import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // charge .env (FIREWORKS_API_KEY, etc.)

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

            const apiKey = env.FIREWORKS_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.end("Missing FIREWORKS_API_KEY in environment");
              return;
            }

            try {
              const prompt = `Tu es concierge, tu travailles à l'hôtel Gascogne situé à 25 allées Charles de Fitte, 31300 Toulouse. En fonction de la catégorie (restaurant, bar, activity) et des filtres (type, budget 1-3, maxWalk minutes à pied), propose une liste JSON d'au moins 3 lieux. Chaque objet doit avoir: name, address, type, typeLabel, budget (1-3), distanceMinutes (<= ${
                filters?.maxWalk || 25
              }), rating (0-5), mapsUrl (Google Maps query). Respecte la catégorie: ${category}. Type attendu: ${
                filters?.type || "any"
              }. Budget: ${
                filters?.budget || "any"
              }. Réponds UNIQUEMENT avec un tableau JSON valide sans texte autour.`;

              const resp = await fetch(
                "https://api.fireworks.ai/inference/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify({
                    model: "accounts/fireworks/models/llama-v3p1-8b-instruct",
                    messages: [
                      {
                        role: "system",
                        content:
                          "Tu renvoies uniquement du JSON strictement valide.",
                      },
                      { role: "user", content: prompt },
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                  }),
                }
              );

              if (!resp.ok) {
                res.statusCode = resp.status;
                res.end("AI provider error");
                return;
              }

              const data = await resp.json();
              const content = data?.choices?.[0]?.message?.content || "";
              let parsed = [];
              try {
                parsed = JSON.parse(content);
              } catch {}
              if (!Array.isArray(parsed)) parsed = [];

              // Exiger >= 3 propositions (sinon le client affichera un message)
              if (parsed.length < 3) {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify([]));
                return;
              }

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(parsed.slice(0, limit)));
            } catch (e) {
              res.statusCode = 500;
              res.end("AI request failed");
            }
          });
        },
      },
    ],
  };
});
