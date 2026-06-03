"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/auth";

const buildStorageKey = (batchId = "") => `badamclasses_live_chat_${String(batchId || "default").trim().toLowerCase()}`;
const buildNotesStorageKey = (batchId = "") => `badamclasses_live_notes_${String(batchId || "default").trim().toLowerCase()}`;
const tabs = ["Discussion", "Notes", "Resources"];
const chatModes = ["Group Chat", "Private Chat"];

export default function LiveClassChat({ batchId = "", title = "Live Class", teacherName = "Faculty" }) {
  const storageKey = useMemo(() => buildStorageKey(batchId), [batchId]);
  const notesStorageKey = useMemo(() => buildNotesStorageKey(batchId), [batchId]);
  const [activeTab, setActiveTab] = useState("Discussion");
  const [chatMode, setChatMode] = useState("Group Chat");
  const [input, setInput] = useState("");
  const [note, setNote] = useState("");
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

    try {
      setNote(window.localStorage.getItem(notesStorageKey) || "");
    } catch {
      setNote("");
    }
  }, [notesStorageKey, storageKey]);

  useEffect(() => {
    let active = true;
    const loadMessages = async () => {
      try {
        const data = await apiFetch(`/live-chat?batchId=${encodeURIComponent(batchId)}&limit=120`);
        if (!active || !Array.isArray(data)) return;
        const normalized = data.map((message) => ({
          ...message,
          id: message._id || message.id,
          name: message.senderName || "Student",
          time: new Date(message.createdAt || Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        }));
        setMessages(normalized);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(normalized.slice(-80)));
        } catch {}
      } catch {
        // Keep local fallback chat working when backend/session is unavailable.
      }
    };
    loadMessages();
    const timer = window.setInterval(loadMessages, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [batchId, storageKey]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, chatMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(notesStorageKey, note);
    } catch {}
  }, [note, notesStorageKey]);

  const saveMessages = (items) => {
    setMessages(items);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items.slice(-80)));
    } catch {}
  };

  const filteredMessages = messages.filter((message) => message.mode === chatMode);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;

    const localMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: user?.name || user?.email || "Student",
      senderName: user?.name || user?.email || "Student",
      senderEmail: user?.email || "",
      mode: chatMode,
      text: content,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      pending: true
    };
    saveMessages([...messages, localMessage]);
    setInput("");

    try {
      const saved = await apiFetch("/live-chat", {
        method: "POST",
        body: JSON.stringify({
          batchId,
          batchTitle: title,
          mode: chatMode,
          text: content
        })
      });
      saveMessages([
        ...messages,
        {
          ...localMessage,
          id: saved._id || localMessage.id,
          _id: saved._id,
          senderName: saved.senderName || localMessage.senderName,
          senderEmail: saved.senderEmail || localMessage.senderEmail,
          createdAt: saved.createdAt || localMessage.createdAt,
          pending: false
        }
      ]);
    } catch {
      saveMessages([...messages, { ...localMessage, pending: false, offline: true }]);
    }
  };

  return (
    <div className="flex h-full min-h-[860px] flex-col text-white">
      <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(8,17,33,0.98),rgba(8,17,33,0.82))] px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Class companion</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Discussion & notes</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{title} ke saath live doubts, personal notes aur class resources yahin manage karein.</p>
      </div>

      <div className="border-b border-white/10 px-4 py-3">
        <div className="grid grid-cols-3 gap-2 rounded-[20px] border border-white/10 bg-white/[0.03] p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-white text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.16)]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Discussion" ? (
        <>
          <div className="border-b border-white/10 px-4 py-4">
            <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="flex gap-2">
                {chatModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChatMode(mode)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      chatMode === mode
                        ? "bg-cyan-300 text-slate-950"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">{filteredMessages.length} msgs</span>
            </div>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
            {filteredMessages.length ? (
              filteredMessages.map((message) => (
                <div key={message.id} className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{message.senderName || message.name}</p>
                      <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-500">{message.mode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">{message.time}</p>
                      {message.pending ? <p className="text-[11px] text-cyan-200">Sending</p> : message.offline ? <p className="text-[11px] text-orange-200">Saved offline</p> : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{message.text}</p>
                </div>
              ))
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
                {chatMode === "Private Chat" ? "Private discussion thread yahan visible hogi." : "Group discussion class start hote hi active rahegi."}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Ask a doubt</p>
                  <p className="text-xs text-slate-400">Keep messages short for faster response.</p>
                </div>
                <p className="text-xs text-slate-500">{teacherName}</p>
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your question..."
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#071023] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === "Notes" ? (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-orange-200">Personal notes</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Revision sheet</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">Important formulas, shortcuts aur faculty instructions ko yahin save karein. Notes local device par persist hoti hain.</p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Write key points from the class..."
              className="mt-5 min-h-[360px] w-full resize-none rounded-[24px] border border-white/10 bg-[#071023] p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200">Resources</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Class support</h3>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-[#081223] px-4 py-3">
                <p className="text-sm font-semibold text-white">Faculty</p>
                <p className="mt-1 text-sm text-slate-300">{teacherName}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081223] px-4 py-3">
                <p className="text-sm font-semibold text-white">Batch</p>
                <p className="mt-1 text-sm text-slate-300">{title}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081223] px-4 py-3">
                <p className="text-sm font-semibold text-white">Usage tip</p>
                <p className="mt-1 text-sm text-slate-300">Agar stream briefly ruk jaye, player refresh button use karein. Notes aur chat locally safe rehte hain.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
