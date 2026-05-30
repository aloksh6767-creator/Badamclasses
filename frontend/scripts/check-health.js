const frontendBaseUrl = process.env.FRONTEND_VERIFY_URL || process.env.FRONTEND_URL || "http://127.0.0.1:3001";
const apiBaseUrl = process.env.API_VERIFY_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readJson = async (response, label) => {
  const contentType = response.headers.get("content-type") || "";
  assert(response.ok, `${label} returned HTTP ${response.status}.`);
  assert(contentType.includes("application/json"), `${label} did not return JSON.`);
  return response.json();
};

const main = async () => {
  const apiHealthResponse = await fetch(`${apiBaseUrl}/health`, { cache: "no-store" });
  const apiHealth = await readJson(apiHealthResponse, "API health");
  assert(apiHealth.status === "ok", "API health status is not ok.");

  const paymentDebugResponse = await fetch(`${apiBaseUrl}/payments/debug`, { cache: "no-store" });
  const paymentDebug = await readJson(paymentDebugResponse, "Payment debug");
  assert(paymentDebug.status === "ok", "Payment debug status is not ok.");
  assert(paymentDebug.backend === "reachable", "Backend is not reachable.");

  const homeResponse = await fetch(frontendBaseUrl, { cache: "no-store" });
  assert(homeResponse.ok, `Frontend home page returned HTTP ${homeResponse.status}.`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        frontend: frontendBaseUrl,
        api: apiBaseUrl,
        database: apiHealth.database,
        dataLayer: apiHealth.dataLayer,
        razorpayConfigured: Boolean(paymentDebug.razorpay?.configured)
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(`[health] ${error.message}`);
  process.exit(1);
});
