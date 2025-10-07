// Recommendation service that calls the backend AI endpoint only.
// Do NOT put API keys here. The dev server exposes POST /api/recommend.

export async function getRecommendations({ category, filters, limit = 6 }) {
  const resp = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, filters, limit }),
  });

  if (!resp.ok) {
    return [];
  }

  try {
    const data = await resp.json();
    return Array.isArray(data) ? data.slice(0, limit) : [];
  } catch {
    return [];
  }
}
