const SSC_MATHS_PDF_PATH = "/mock-pdfs/ssc-maths-chapterwise-6500-pyqs-3rd-edition-english.pdf";
const SSC_MATHS_PDF_URL =
  "https://media.githubusercontent.com/media/aloksh6767-creator/Badamclasses/01b60f1370f4d1ce8dbf7fd13abcbe78ad5c977b/frontend/public/mock-pdfs/ssc-maths-chapterwise-6500-pyqs-3rd-edition-english.pdf";

export function resolvePdfAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw, "https://badamclasses.invalid");
    if (parsed.pathname === SSC_MATHS_PDF_PATH) return SSC_MATHS_PDF_URL;
  } catch {
    // Keep the original value so existing URL validation and error handling remain in control.
  }

  return raw;
}

export { SSC_MATHS_PDF_PATH, SSC_MATHS_PDF_URL };
