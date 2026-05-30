import OpenAI from "openai";
import CurrentAffairsSnapshot from "../models/CurrentAffairsSnapshot.js";
import { isDatabaseConnected } from "../config/db.js";
import { getCurrentAffairsDashboard } from "./currentAffairsData.js";

const NEWS_API_URL = process.env.NEWS_API_URL || "https://newsapi.org/v2/top-headlines";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const TOPICS = ["National", "International", "Economy", "Polity", "Science & Tech", "Sports"];

const toDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const monthName = (date) =>
  date.toLocaleString("en-IN", {
    month: "long",
    year: "numeric"
  });

const makeDateLabel = (date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

const clampText = (value, fallback) => {
  if (!value || typeof value !== "string") return fallback;
  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
};

const detectTopic = (text = "") => {
  const t = text.toLowerCase();
  if (/(gdp|inflation|repo|bank|rupee|export|market|economy|tax|budget|fiscal)/.test(t)) return "Economy";
  if (/(un|global|summit|international|treaty|diplomat|foreign|g20|cop\d+)/.test(t)) return "International";
  if (/(parliament|bill|act|constitution|governor|president|judiciary|cabinet|ministry|policy)/.test(t)) return "Polity";
  if (/(isro|space|ai|technology|innovation|scientist|research|satellite|quantum)/.test(t)) return "Science & Tech";
  if (/(cricket|olympic|sports|medal|tournament|athlete|fifa|ipl)/.test(t)) return "Sports";
  return "National";
};

const fallbackPayload = (now = new Date()) => {
  const base = getCurrentAffairsDashboard();
  const daily = (base.daily || []).map((d) => ({ ...d, topic: d.category || "National" }));
  const monthly = (base.monthly || []).map((m, i) => ({
    ...m,
    topic: ["Polity", "International", "Economy"][i] || "National"
  }));

  return {
    ...base,
    source: "fallback",
    topics: TOPICS,
    daily,
    monthly
  };
};

const normalizeArticles = (articles = []) => {
  return articles
    .filter((a) => a && (a.title || a.description))
    .map((a) => {
      const title = clampText(a.title, "Important update announced");
      const description = clampText(a.description, "Key development relevant for competitive exam preparation.");
      const topic = detectTopic(`${a.title || ""} ${a.description || ""}`);
      return { title, description, topic };
    });
};

const buildFromArticles = (articles = [], now = new Date()) => {
  const normalized = normalizeArticles(articles);
  if (!normalized.length) return fallbackPayload(now);

  const byTopic = TOPICS.reduce((acc, topic) => {
    acc[topic] = normalized.filter((x) => x.topic === topic);
    return acc;
  }, {});

  const pick = (topic, index, fbTitle, fbSummary) => {
    const item = byTopic[topic][index];
    if (item) return item;
    return { title: fbTitle, description: fbSummary, topic };
  };

  const daily = [
    pick("National", 0, "Major national update announced", "Focus on authority, objective, and beneficiaries."),
    pick("Polity", 0, "Policy/governance development reported", "Track bill/act/body and constitutional angle."),
    pick("Economy", 0, "Important economy update released", "Revise terms and trend direction for MCQs."),
    pick("International", 0, "Global diplomatic update released", "Focus on countries, grouping, and outcomes."),
    pick("Science & Tech", 0, "Science and technology milestone reported", "Remember mission, agency, and application."),
    pick("Sports", 0, "Sports event outcome reported", "Track winners, venue, and records.")
  ].map((d) => ({
    category: d.topic,
    topic: d.topic,
    headline: d.title,
    summary: d.description
  }));

  const monthly = TOPICS.map((topic) => {
    const highlights = byTopic[topic].slice(0, 3).map((x) => x.title);
    if (!highlights.length) {
      highlights.push(`${topic} monthly revision point 1`, `${topic} monthly revision point 2`);
    }

    return {
      bucket: `${topic} Monthly Digest`,
      topic,
      highlights: highlights.slice(0, 3)
    };
  });

  const quiz = [
    {
      id: 1,
      question: "Which topic should you revise for GDP, inflation and repo-rate questions?",
      options: ["Economy", "Sports", "Only History", "None"],
      answer: 0
    },
    {
      id: 2,
      question: "Bills, Acts and Constitution updates fall under:",
      options: ["Polity", "Movies", "Travel", "Random"],
      answer: 0
    },
    {
      id: 3,
      question: "International relations questions often include:",
      options: ["Summits and treaties", "Song lyrics", "Comics", "None"],
      answer: 0
    },
    {
      id: 4,
      question: "Best way to retain current affairs topic-wise:",
      options: ["Daily notes + topic quizzes", "Read once only", "No practice", "Skip monthly revision"],
      answer: 0
    }
  ];

  return {
    generatedAt: now.toISOString(),
    dailyLabel: makeDateLabel(now),
    monthlyLabel: monthName(now),
    topics: TOPICS,
    daily,
    monthly,
    quiz,
    source: "newsapi"
  };
};

const tryOpenAITransform = async (articles = [], now = new Date()) => {
  if (!openai || !articles.length) return null;

  const compact = articles.slice(0, 20).map((a, i) => `${i + 1}. ${a.title || ""} | ${a.description || ""}`).join("\n");

  const prompt = `Convert these headlines into exam-oriented topic-wise current affairs.
Return strict JSON with keys: daily (6 items), monthly (6 items), quiz (4 items).
Daily item keys: category, topic, headline, summary.
Monthly item keys: bucket, topic, highlights (array of max 3).
Quiz item keys: id, question, options (4), answer (index 0-3).
Topics must be from: National, International, Economy, Polity, Science & Tech, Sports.
Headlines:\n${compact}`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a UPSC/SSC exam current affairs formatter." },
        { role: "user", content: prompt }
      ]
    });

    const txt = completion.choices?.[0]?.message?.content;
    if (!txt) return null;
    const parsed = JSON.parse(txt);

    if (!Array.isArray(parsed.daily) || !Array.isArray(parsed.monthly) || !Array.isArray(parsed.quiz)) {
      return null;
    }

    return {
      generatedAt: now.toISOString(),
      dailyLabel: makeDateLabel(now),
      monthlyLabel: monthName(now),
      topics: TOPICS,
      daily: parsed.daily.slice(0, 6),
      monthly: parsed.monthly.slice(0, 6),
      quiz: parsed.quiz.slice(0, 4),
      source: "openai+newsapi"
    };
  } catch {
    return null;
  }
};

const fetchNewsArticles = async () => {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const url = new URL(NEWS_API_URL);
  url.searchParams.set("country", process.env.NEWS_COUNTRY || "in");
  url.searchParams.set("pageSize", process.env.NEWS_PAGE_SIZE || "30");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw new Error(`News API failed with ${response.status}`);

  const data = await response.json();
  return Array.isArray(data.articles) ? data.articles : [];
};

export const refreshCurrentAffairsSnapshot = async (date = new Date()) => {
  const snapshotDateKey = toDateKey(date);

  let payload;
  try {
    const articles = await fetchNewsArticles();
    payload = (await tryOpenAITransform(articles, date)) || buildFromArticles(articles, date);
  } catch (error) {
    console.warn("Current affairs news fetch fallback:", error.message);
    payload = fallbackPayload(date);
  }

  const docPayload = {
    snapshotDateKey,
    generatedAt: new Date(payload.generatedAt || date.toISOString()),
    source: payload.source || "fallback",
    dailyLabel: payload.dailyLabel,
    monthlyLabel: payload.monthlyLabel,
    topics: payload.topics || TOPICS,
    daily: payload.daily,
    monthly: payload.monthly,
    quiz: payload.quiz
  };

  if (!isDatabaseConnected()) {
    return docPayload;
  }

  try {
    const saved = await CurrentAffairsSnapshot.findOneAndUpdate(
      { snapshotDateKey },
      docPayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return saved.toObject();
  } catch (error) {
    console.warn("Current affairs DB save fallback:", error.message);
    return docPayload;
  }
};

export const getLatestCurrentAffairsSnapshot = async () => {
  if (!isDatabaseConnected()) {
    return fallbackPayload(new Date());
  }

  try {
    const latest = await CurrentAffairsSnapshot.findOne({}).sort({ generatedAt: -1 }).lean();
    if (latest) return latest;
  } catch (error) {
    console.warn("Current affairs DB read fallback:", error.message);
  }

  return fallbackPayload(new Date());
};

export const filterCurrentAffairsByTopic = (snapshot, topic = "All") => {
  if (!snapshot) return null;
  if (!topic || topic === "All") return snapshot;

  return {
    ...snapshot,
    daily: (snapshot.daily || []).filter((x) => (x.topic || x.category) === topic),
    monthly: (snapshot.monthly || []).filter((x) => x.topic === topic)
  };
};
