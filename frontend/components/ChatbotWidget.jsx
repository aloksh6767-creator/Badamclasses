"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { batches } from "@/lib/fixtures";
import { readAdminWorkspace } from "@/lib/adminWorkspace";
import { filterDeletedCourses, filterDeletedCoursesFromStorage, readLocalCourses } from "@/lib/localCourseState";
import { getUserScopedStorageEventName, readUserScopedString } from "@/lib/userScopedStorage";

const quickSuggestions = [
  "Show me popular courses",
  "Which batch is best for maths?",
  "How do I buy a course?",
  "Where are my purchased courses?",
  "Help with payment failure",
  "I need support contact"
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const AVATAR_KEY = "bsc_avatar";
const CHAT_LOG_KEY = "bsc_chat_log";
const readChatLog = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeChatLog = (items) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(items));
};

const normalizeText = (value = "") => String(value || "").trim().toLowerCase();

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getAssistantCatalog = () => {
  const localCourses = filterDeletedCoursesFromStorage(readLocalCourses());
  const merged = [...localCourses, ...filterDeletedCourses(batches)];
  const seen = new Set();
  const courses = merged.filter((item, index) => {
    const key = normalizeText(item._id || item.id || `${item.title}-${index}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return courses;
};

const buildAssistantReply = (message) => {
  const query = normalizeText(message);
  const workspace = readAdminWorkspace();
  const courses = getAssistantCatalog();
  const supportEmail = workspace.settings?.supportEmail || "support@badamclasses.com";
  const activeCoupons = (workspace.coupons || []).filter((coupon) => coupon.status === "active");
  const paidOrders = (workspace.orders || []).filter((order) => order.status === "paid");

  if (!query) {
    return "Ask me about courses, batches, timings, payments, PDFs, mock tests, or support.";
  }

  if (query.includes("popular") || query.includes("best course") || query.includes("top course")) {
    const topCourses = courses.slice(0, 3).map((course) => `${course.title} (${formatCurrency(course.price || course.priceValue || 0)})`);
    return `Popular options right now are: ${topCourses.join(", ")}. If you want, ask by subject like Maths, Reasoning, English, GS, Science, or Computer.`;
  }

  if (query.includes("math") || query.includes("mathematics")) {
    const mathsCourses = courses.filter((course) => normalizeText(`${course.title} ${course.category}`).includes("math"));
    if (mathsCourses.length) {
      const courseList = mathsCourses.slice(0, 3).map((course) => `${course.title} - ${formatCurrency(course.price || course.priceValue || 0)}`);
      return `For Mathematics, I recommend: ${courseList.join(", ")}. Inside maths courses, topics are organized with Arithmetic and Advance sections for smoother learning.`;
    }
  }

  if (query.includes("reasoning")) {
    const reasoningCourses = courses.filter((course) => normalizeText(`${course.title} ${course.category}`).includes("reasoning"));
    if (reasoningCourses.length) {
      return `Reasoning options available: ${reasoningCourses.slice(0, 3).map((course) => course.title).join(", ")}. These can be organized into Verbal and Non-Verbal categories in the reusable subject system.`;
    }
  }

  if (query.includes("buy") || query.includes("purchase") || query.includes("enroll") || query.includes("checkout")) {
    return "To buy a course: open the batch details page, click Buy Course or Enroll Now, complete checkout, and then access it from My Courses / Dashboard after payment success.";
  }

  if (query.includes("payment failure") || (query.includes("payment") && query.includes("fail"))) {
    return `If payment failed, refresh the checkout page once and try again. If the amount was deducted but access is not unlocked, contact support at ${supportEmail} with your registered number and payment screenshot.`;
  }

  if (query.includes("purchased") || query.includes("my course") || query.includes("dashboard")) {
    return "Purchased courses are available in My Courses / Dashboard after login. If a valid purchase is missing, open the course again or contact support with your payment details.";
  }

  if (query.includes("login") || query.includes("signup") || query.includes("register")) {
    return "For login or signup issues, first confirm your registered email or phone and retry. If the problem continues, use the Contact page or support email so the admin team can verify your account.";
  }

  if (query.includes("pdf") || query.includes("notes") || query.includes("sheet")) {
    return "PDF notes are available inside the course detail page under the Sheets tab. Some PDFs unlock only after purchase.";
  }

  if (query.includes("mock") || query.includes("test")) {
    return "Mock tests are available from the Mock Tests section. Admin can also generate structured subject-wise tests for Maths, Reasoning, English, GS, Science, and Computer.";
  }

  if (query.includes("coupon") || query.includes("discount")) {
    if (activeCoupons.length) {
      const codes = activeCoupons.map((coupon) =>
        coupon.discountType === "percent"
          ? `${coupon.code} (${coupon.discountValue}% OFF)`
          : `${coupon.code} (₹${coupon.discountValue} OFF)`
      );
      return `Current active coupon options are: ${codes.join(", ")}. Apply them at checkout if eligible.`;
    }
    return "There is no active discount code configured right now. Keep checking the homepage notice or offer banner for new discounts.";
  }

  if (query.includes("support") || query.includes("contact") || query.includes("help")) {
    return `You can contact support by email at ${supportEmail}. You can also use the Contact page for admission, payment, login, or batch-access help.`;
  }

  if (query.includes("live class") || query.includes("timing") || query.includes("schedule")) {
    const scheduled = courses
      .filter((course) => course.batchTime || course.startTime)
      .slice(0, 3)
      .map((course) => `${course.title}: ${course.batchTime || course.startTime}`);
    return scheduled.length
      ? `Upcoming / scheduled batches include ${scheduled.join(", ")}. Open the batch details page to see the latest timing and class structure.`
      : "Batch timings are managed by admin and shown on course detail pages once scheduled.";
  }

  const directMatch = courses.find((course) => query.includes(normalizeText(course.title)));
  if (directMatch) {
    return `${directMatch.title} is available for ${formatCurrency(directMatch.price || directMatch.priceValue || 0)}. Category: ${directMatch.category || "General"}. Open the course details page to view classes, sheets, tests, and timings.`;
  }

  const paidCount = paidOrders.length;
  return `I can help with courses, timings, payments, PDFs, and support. Right now the site has ${courses.length} course or batch option(s) and ${paidCount} paid order record(s) in the admin workspace. Try asking about Maths, Reasoning, payments, login, PDFs, or coupons.`;
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [typingPreview, setTypingPreview] = useState("");
  const [avatar, setAvatar] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello 👋 I am your AI course assistant. Ask me about batches, pricing, timings, PDFs, payments, or support."
    }
  ]);

  const listRef = useRef(null);
  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, typingPreview, open]);

  useEffect(() => {
    const syncAvatar = () => {
      setAvatar(readUserScopedString(AVATAR_KEY, ""));
    };

    syncAvatar();
    window.addEventListener("storage", syncAvatar);
    window.addEventListener(getUserScopedStorageEventName(), syncAvatar);

    return () => {
      window.removeEventListener("storage", syncAvatar);
      window.removeEventListener(getUserScopedStorageEventName(), syncAvatar);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const log = readChatLog().slice().reverse().slice(-12);
    if (log.length) {
      setMessages([
        {
          role: "assistant",
          content: "Hello 👋 I am your AI course assistant. Ask me about batches, pricing, timings, PDFs, payments, or support."
        },
        ...log.map((item) => ({ role: item.role, content: item.content }))
      ]);
    }
  }, [open]);

  const animateAssistantReply = async (text) => {
    setTypingPreview("");

    for (let i = 1; i <= text.length; i += 2) {
      setTypingPreview(text.slice(0, i));
      await wait(8);
    }

    await wait(120);
    setTypingPreview("");
    const msg = { role: "assistant", content: text };
    setMessages((prev) => [...prev, msg]);
    const log = readChatLog();
    writeChatLog([{ ...msg, time: new Date().toISOString() }, ...log]);
  };

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMessage = { role: "user", content };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    const log = readChatLog();
    writeChatLog([{ ...userMessage, time: new Date().toISOString() }, ...log]);

    try {
      const reply = buildAssistantReply(content);
      await wait(220);
      await animateAssistantReply(reply);
    } catch {
      await animateAssistantReply("I can help with courses, batches, timings, payments, notes, and support. Please try asking in a simpler way.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open ? (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-indigo-300/25 bg-[#111827]/95 shadow-2xl backdrop-blur md:bottom-6 md:right-6">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-indigo-300/40 bg-slate-800">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">{"🤖"}</div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">BadamClasses AI</p>
                <p className="text-xs text-slate-400">Courses, support, and recommendation assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-300 transition hover:border-white/30"
            >
              Close
            </button>
          </div>

          <div ref={listRef} className="max-h-96 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((msg, idx) => (
              <div key={`${msg.role}-${idx}`} className={`flex transition-all duration-200 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm transition-all duration-200 ${
                    msg.role === "user"
                      ? "bg-indigo-500 text-white"
                      : "border border-white/10 bg-slate-800/80 text-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">
                  {typingPreview ? (
                    <span>{typingPreview}</span>
                  ) : (
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-3 pt-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="rounded-full border border-indigo-300/25 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200 transition hover:bg-indigo-500/20"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mb-3 flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about courses, payments, support, timing, or notes"
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!canSend}
                className="btn-anim rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="pulse-glow fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-indigo-300/30 bg-indigo-500/90 text-2xl text-white shadow-[0_0_30px_rgba(99,102,241,0.45)] transition hover:scale-105 hover:bg-indigo-400 md:bottom-6 md:right-6"
        aria-label="Open AI Assistant"
      >
        {avatar ? (
          <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          "💬"
        )}
      </button>
    </>
  );
}
