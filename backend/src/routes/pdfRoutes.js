import dns from "node:dns/promises";
import net from "node:net";
import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();
const MAX_PDF_BYTES = 25 * 1024 * 1024;

const isPrivateAddress = (address = "") => {
  if (!address) return true;
  if (net.isIPv4(address)) {
    const parts = address.split(".").map((part) => Number(part));
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    );
  }

  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80");
};

const assertSafePdfUrl = async (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    const error = new Error("PDF URL is required");
    error.statusCode = 400;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    const error = new Error("PDF URL is invalid");
    error.statusCode = 400;
    throw error;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    const error = new Error("Only HTTP and HTTPS PDF URLs are supported");
    error.statusCode = 400;
    throw error;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    const error = new Error("Local PDF URLs are not allowed");
    error.statusCode = 400;
    throw error;
  }

  const records = await dns.lookup(hostname, { all: true });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    const error = new Error("PDF URL host is not allowed");
    error.statusCode = 400;
    throw error;
  }

  return parsed.toString();
};

router.get(
  "/proxy",
  asyncHandler(async (req, res) => {
    const pdfUrl = await assertSafePdfUrl(req.query.url);
    const upstream = await fetch(pdfUrl, {
      headers: {
        accept: "application/pdf,*/*"
      },
      redirect: "follow"
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ message: "PDF could not be fetched" });
    }

    const contentLength = Number(upstream.headers.get("content-length") || 0);
    if (contentLength > MAX_PDF_BYTES) {
      return res.status(413).json({ message: "PDF file is too large" });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_PDF_BYTES) {
      return res.status(413).json({ message: "PDF file is too large" });
    }

    const buffer = Buffer.from(arrayBuffer);
    const startsWithPdfHeader = buffer.subarray(0, 5).toString("utf8") === "%PDF-";
    if (!startsWithPdfHeader) {
      return res.status(415).json({ message: "URL did not return a valid PDF file" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Content-Disposition", 'inline; filename="document.pdf"');
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buffer);
  })
);

export default router;
