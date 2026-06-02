"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getUser } from "@/lib/auth";

const buildStorageKey = (batchId = "") => `badamclasses_live_chat_${String(batchId || "default").trim().toLowerCase()}`;

export default function LiveClassChat({ batchId = "", title = "Live Class" }) {
  const storageKey = useMemo(() => buildStorageKey(batchId), [batchId]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const user = getUser();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setMessages(Array.isArray(parsed) ? parsed : []);
    } catch {
      setMessages([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const saveMessages = (items) => {
    setMessages(items);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items.slice(-80)));
    } catch {}
  };

  const sendMessage = () => {
    const content = input.trim();
    if (!content) return;

    const nextMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: user?.name || user?.email || "Student",
      text: content,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    };
    saveMessages([...messages, nextMessage]);
    setInput("");
  };

  return (
    <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-400/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Live Chat</p>
          <p className="mt-1 text-sm text-slate-300">{title}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-xl border border-cyan-200/40 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/10"
        >
          {open ? "Hide" : "Open"}
        </button>
      </div>

      {open ? (
        <div className="mt-4">
          <div ref={listRef} className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-[#071023] p-3">
            {messages.length ? (
              messages.map((message) => (
                <div key={message.id} className="rounded-xl bg-white/[0.055] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-white">{message.name}</span>
                    <span className="shrink-0 text-[11px] text-slate-500">{message.time}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-200">{message.text}</p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-sm text-slate-400">
                No messages yet.
              </p>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type live class message"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#071023] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
            />
            <button
              type="button"
              onClick={sendMessage}
              className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-200"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
