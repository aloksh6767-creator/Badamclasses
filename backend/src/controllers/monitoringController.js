import { notifyErrorAlert } from "../utils/alertNotifier.js";

const getText = (value, fallback = "") => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
};

export const reportFrontendError = async (req, res) => {
  try {
    const alert = await notifyErrorAlert({
      severity: "high",
      source: getText(req.body?.source, "frontend"),
      title: getText(req.body?.title, "Frontend runtime error"),
      message: getText(req.body?.message, "Unknown frontend error"),
      page: getText(req.body?.page, req.headers.origin || ""),
      stack: getText(req.body?.stack),
      userAgent: getText(req.headers["user-agent"])
    });

    return res.status(202).json({
      reported: alert.sent,
      reason: alert.reason || null
    });
  } catch (error) {
    console.error("Frontend monitoring alert failed:", error.message);
    return res.status(500).json({ message: "Monitoring alert failed" });
  }
};
