"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getUser } from "@/lib/auth";

const buildStorageKey = (batchId = "") => `badamclasses_live_chat_${String(batchId || "default").trim().toLowerCase()}`;
const tabs = ["Chat", "Add Notes", "PPT"];
const chatModes = ["Group Chat", "Private Chat"];

export default function LiveClassChat({ batchId = "", title = "Live Class" }) {
  const storageKey = useMemo(() => buildStorageKey(batchId), [batchId]);
  const [activeTab, setActiveTab] = useState("Chat");
  const [chatMode, setChatMode] = useState("Private Chat");
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
  }, [storageKey]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, chatMode]);

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
      mode: chatMode,
      text: content,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    };
    saveMessages([...messages, nextMessage]);
    setInput("");
  };

  return (
    <div className="flex h-full min-h-[560px] flex-col bg-[#0d1526] text-white">
      <div className="border-b border-white/70 px-4 pt-2">
        <div className="flex items-end gap-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-4 text-base font-bold transition ${
                activeTab === tab
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Chat" ? (
        <>
          <div className="border-b border-white/70 px-4">
            <div className="flex items-end justify-center gap-4">
              {chatModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChatMode(mode)}
                  className={`px-6 py-4 text-base font-bold transition ${
                    chatMode === mode
                      ? "bg-white text-black"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
            {messages.filter((message) => message.mode === chatMode).length ? (
              messages
                .filter((message) => message.mode === chatMode)
                .map((message) => (
                  <div key={message.id} className="rounded-xl bg-white/[0.06] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-white">{message.name}</span>
                      <span className="shrink-0 text-[11px] text-slate-500">{message.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-200">{message.text}</p>
                  </div>
                ))
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center text-center text-sm text-slate-500">
                {chatMode === "Private Chat" ? "Private messages will appear here." : "Group messages will appear here."}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
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
                placeholder="Type your message..."
                className="min-w-0 flex-1 rounded-xl border border-white/60 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="h-12 w-12 rounded-xl border border-white/60 text-lg text-white hover:bg-white/10"
                aria-label="Send message"
              >
                :)
              </button>
            </div>
          </div>
        </>
      ) : activeTab === "Add Notes" ? (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <p className="text-sm font-semibold text-white">Class Notes</p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Write your notes for this live class..."
            className="mt-4 min-h-0 flex-1 resize-none rounded-xl border border-white/20 bg-[#071023] p-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
          <div>
            <p className="text-lg font-bold text-white">PPT</p>
            <p className="mt-2 text-sm text-slate-400">{title} presentation will appear here after upload.</p>
          </div>
        </div>
      )}
    </div>
  );
}
