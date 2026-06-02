"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getCourseStorageKey } from "@/lib/localCourseState";

const formatTime = (value = "") => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
};

const getBatchKey = (batch = {}) => getCourseStorageKey(batch) || String(batch._id || batch.id || batch.title || "default").trim().toLowerCase();

export default function LiveChatInbox({ batches = [] }) {
  const [messages, setMessages] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const batchOptions = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(batches) ? batches : [])
      .map((batch) => ({
        id: getBatchKey(batch),
        title: batch.title || batch.liveClassTitle || "Untitled batch"
      }))
      .filter((batch) => {
        if (!batch.id || seen.has(batch.id)) return false;
        seen.add(batch.id);
        return true;
      });
  }, [batches]);

  const visibleMessages = useMemo(() => {
    const items = selectedBatchId
      ? messages.filter((message) => message.batchId === selectedBatchId)
      : messages;
    return items.slice().sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [messages, selectedBatchId]);

  const selectedBatch = batchOptions.find((batch) => batch.id === selectedBatchId);

  const loadMessages = async () => {
    setLoading(true);
    setStatus("");
    try {
      const suffix = selectedBatchId ? `?batchId=${encodeURIComponent(selectedBatchId)}&limit=200` : "?limit=200";
      const data = await apiFetch(`/live-chat/admin${suffix}`);
      setMessages(Array.isArray(data) ? data : []);
      setStatus("Live chat refreshed.");
    } catch (error) {
      setStatus(error.message || "Live chat load failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [selectedBatchId]);

  const sendReply = async () => {
    const content = reply.trim();
    if (!content || !selectedBatchId) return;
    setStatus("");
    try {
      const saved = await apiFetch("/live-chat", {
        method: "POST",
        body: JSON.stringify({
          batchId: selectedBatchId,
          batchTitle: selectedBatch?.title || "",
          mode: "Private Chat",
          text: content
        })
      });
      setMessages((current) => [...current, saved]);
      setReply("");
      setStatus("Admin reply sent.");
    } catch (error) {
      setStatus(error.message || "Reply send failed.");
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0b1634]/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-white">Live Chat Inbox</h3>
          <p className="mt-2 text-sm text-slate-300">Student live class messages yahan admin ke liye visible rahenge.</p>
        </div>
        <button
          type="button"
          onClick={loadMessages}
          disabled={loading}
          className="rounded-xl border border-cyan-300/35 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/10 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-[#081127] p-3">
          <label className="text-xs uppercase tracking-[0.22em] text-slate-400">Batch</label>
          <select
            value={selectedBatchId}
            onChange={(event) => setSelectedBatchId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1634] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All live chats</option>
            {batchOptions.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.title}
              </option>
            ))}
          </select>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
            {visibleMessages.length} message{visibleMessages.length === 1 ? "" : "s"}
          </div>
          {status ? (
            <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">{status}</p>
          ) : null}
        </div>

        <div className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-[#081127]">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {visibleMessages.length ? (
              visibleMessages.map((message) => (
                <div
                  key={message._id || `${message.batchId}-${message.createdAt}-${message.text}`}
                  className={`rounded-2xl border px-4 py-3 ${
                    message.senderRole === "admin"
                      ? "border-cyan-300/20 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.045]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{message.senderName || "Student"}</p>
                      <p className="truncate text-xs text-slate-500">{message.senderEmail || message.batchTitle || message.batchId}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
                      <span className="rounded-full border border-white/10 px-2 py-1">{message.mode || "Private Chat"}</span>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{message.text}</p>
                </div>
              ))
            ) : (
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-slate-500">
                No live chat messages yet.
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendReply();
                  }
                }}
                disabled={!selectedBatchId}
                placeholder={selectedBatchId ? "Type admin reply..." : "Select a batch to reply"}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1634] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={!selectedBatchId || !reply.trim()}
                className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
