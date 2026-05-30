const frontendBaseUrl = process.env.FRONTEND_VERIFY_URL || process.env.FRONTEND_URL || "http://127.0.0.1:3001";

const routes = [
  "/",
  "/courses",
  "/login",
  "/signup",
  "/checkout?course=demo-course"
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const verifyRoute = async (route) => {
  const response = await fetch(`${frontendBaseUrl}${route}`, { cache: "no-store" });
  assert(response.ok, `${route} returned HTTP ${response.status}.`);
  const html = await response.text();
  assert(html.includes("<html"), `${route} did not render an HTML document.`);
  return {
    route,
    status: response.status
  };
};

const main = async () => {
  const results = [];
  for (const route of routes) {
    results.push(await verifyRoute(route));
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        frontend: frontendBaseUrl,
        routes: results
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(`[verify] ${error.message}`);
  process.exit(1);
});
