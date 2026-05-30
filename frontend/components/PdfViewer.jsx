"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getApiUrl } from "@/lib/api";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

let pdfJsLoadPromise;

function loadPdfJs() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PDF viewer is only available in the browser."));
  }

  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }

  if (!pdfJsLoadPromise) {
    pdfJsLoadPromise = import(/* webpackIgnore: true */ PDFJS_URL).then((module) => {
      const pdfjsLib = module?.default || module;
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      window.pdfjsLib = pdfjsLib;
      return pdfjsLib;
    });
  }

  return pdfJsLoadPromise;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function PdfViewer({ sourceUrl, title = "PDF Document" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  const viewerUrl = useMemo(() => {
    const raw = String(sourceUrl || "").trim();
    if (!raw) return "";
    return getApiUrl(`/pdfs/proxy?url=${encodeURIComponent(raw)}`);
  }, [sourceUrl]);

  useEffect(() => {
    let cancelled = false;
    setPdfDocument(null);
    setPageCount(0);
    setPageNumber(1);
    setPageInput("1");
    setError("");

    if (!viewerUrl) {
      setError("PDF URL is missing.");
      return undefined;
    }

    setLoading(true);
    loadPdfJs()
      .then((pdfjsLib) => pdfjsLib.getDocument({ url: viewerUrl, withCredentials: false }).promise)
      .then((document) => {
        if (cancelled) {
          document.destroy?.();
          return;
        }
        setPdfDocument(document);
        setPageCount(document.numPages || 0);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError?.message || "PDF could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [viewerUrl]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return undefined;

    let cancelled = false;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    setRendering(true);
    setError("");

    renderTaskRef.current?.cancel?.();

    pdfDocument
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return null;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(280, (containerRef.current?.clientWidth || 900) - 32);
        const fitScale = clamp(availableWidth / baseViewport.width, 0.45, 1.5);
        const viewport = page.getViewport({ scale: fitScale * scale });
        const ratio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        return task.promise;
      })
      .catch((renderError) => {
        if (!cancelled && renderError?.name !== "RenderingCancelledException") {
          setError(renderError?.message || "PDF page could not be rendered.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRendering(false);
        }
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [pageNumber, pdfDocument, scale]);

  const goToPage = (nextPage) => {
    const targetPage = clamp(Number(nextPage) || 1, 1, pageCount || 1);
    setPageNumber(targetPage);
    setPageInput(String(targetPage));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#071022]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(pageNumber - 1)}
            disabled={!pdfDocument || pageNumber <= 1}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => goToPage(pageNumber + 1)}
            disabled={!pdfDocument || pageNumber >= pageCount}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              goToPage(pageInput);
            }}
            className="flex items-center gap-2 text-sm text-slate-200"
          >
            <span>Page</span>
            <input
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              inputMode="numeric"
              className="h-10 w-16 rounded-lg border border-white/15 bg-[#10214a] px-2 text-center text-sm text-white outline-none"
              aria-label="Page number"
            />
            <span>of {pageCount || "-"}</span>
          </form>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((value) => clamp(Number((value - 0.15).toFixed(2)), 0.6, 2))}
            disabled={!pdfDocument}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            -
          </button>
          <span className="w-14 text-center text-sm text-slate-200">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => setScale((value) => clamp(Number((value + 0.15).toFixed(2)), 0.6, 2))}
            disabled={!pdfDocument}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto flex min-h-full w-full justify-center">
          {loading ? (
            <div className="grid min-h-[360px] place-items-center text-sm text-slate-300">Loading PDF...</div>
          ) : error ? (
            <div className="grid min-h-[360px] max-w-xl place-items-center text-center text-sm text-rose-100">
              <div className="rounded-2xl border border-rose-300/25 bg-rose-500/10 p-5">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2">{error}</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {rendering ? (
                <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-xs text-slate-200">
                  Rendering...
                </div>
              ) : null}
              <canvas ref={canvasRef} className="max-w-full rounded-sm bg-white shadow-[0_18px_50px_rgba(0,0,0,0.35)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
