import {
  filterCurrentAffairsByTopic,
  getLatestCurrentAffairsSnapshot,
  refreshCurrentAffairsSnapshot
} from "../utils/currentAffairsService.js";

const normalizeMode = (mode = "full") => {
  const m = String(mode || "full").toLowerCase();
  if (m === "daily" || m === "monthly" || m === "quiz" || m === "year") return m;
  return "full";
};

export const getCurrentAffairs = async (req, res) => {
  try {
    const topic = req.query.topic || "All";
    const dashboard = await getLatestCurrentAffairsSnapshot();
    const filtered = filterCurrentAffairsByTopic(dashboard, topic);
    res.json(filtered);
  } catch (error) {
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      dailyLabel: new Date().toLocaleDateString("en-IN"),
      monthlyLabel: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      topics: ["All", "National", "International", "Economy", "Polity", "Science & Tech", "Sports"],
      daily: [],
      monthly: [],
      quiz: [],
      source: "safe-fallback"
    });
  }
};

export const refreshCurrentAffairsNow = async (req, res) => {
  try {
    const data = await refreshCurrentAffairsSnapshot(new Date());
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Refresh failed" });
  }
};

export const downloadCurrentAffairsPdf = async (req, res) => {
  try {
    const { default: PDFDocument } = await import("pdfkit");

    const topic = req.query.topic || "All";
    const mode = normalizeMode(req.query.mode || "full");

    const dashboard = await getLatestCurrentAffairsSnapshot();
    const data = filterCurrentAffairsByTopic(dashboard, topic);

    const safeTopic = String(topic).replace(/[^a-zA-Z0-9\-_ ]/g, "").replace(/\s+/g, "-") || "all";
    const filename = `current-affairs-${safeTopic}-${mode}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);

    const doc = new PDFDocument({ margin: 36, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).text("BadamClasses Current Affairs", { align: "center" });
    doc.moveDown(0.4);
    doc.fontSize(11).text(`Topic: ${topic} | Mode: ${mode.toUpperCase()}`, { align: "center" });
    doc.fontSize(10).text(`Generated: ${new Date(data.generatedAt || Date.now()).toLocaleString("en-IN")}`, { align: "center" });
    doc.moveDown();

    if (mode === "full" || mode === "daily" || mode === "year") {
      doc.fontSize(14).text("Daily Updates", { underline: true });
      doc.moveDown(0.4);
      (data.daily || []).forEach((item, idx) => {
        doc.fontSize(12).text(`${idx + 1}. [${item.topic || item.category}] ${item.headline}`);
        doc.fontSize(10).fillColor("#444444").text(item.summary, { indent: 10 });
        doc.fillColor("black");
        doc.moveDown(0.6);
      });
    }

    if (mode === "full" || mode === "monthly" || mode === "year") {
      if (mode === "full" || mode === "year") doc.moveDown(0.5);
      doc.fontSize(14).text("Monthly Digest", { underline: true });
      doc.moveDown(0.4);
      (data.monthly || []).forEach((bucket, idx) => {
        doc.fontSize(12).text(`${idx + 1}. ${bucket.bucket}`);
        (bucket.highlights || []).forEach((h) => doc.fontSize(10).text(`- ${h}`, { indent: 12 }));
        doc.moveDown(0.5);
      });
    }

    if (mode === "full" || mode === "quiz" || mode === "year") {
      doc.addPage();
      doc.fontSize(14).text("Practice Quiz", { underline: true });
      doc.moveDown(0.4);
      (data.quiz || []).forEach((q) => {
        doc.fontSize(12).text(`Q${q.id}. ${q.question}`);
        (q.options || []).forEach((opt, i) => {
          const label = String.fromCharCode(65 + i);
          doc.fontSize(10).text(`${label}. ${opt}`, { indent: 10 });
        });
        doc.fontSize(10).fillColor("#2c7a2c").text(`Answer: ${String.fromCharCode(65 + (q.answer || 0))}`, { indent: 10 });
        doc.fillColor("black");
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: "PDF service unavailable" });
  }
};

