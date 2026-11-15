import crypto from "crypto";

import { isDatabaseConnected } from "../config/db.js";
import PdfMockTest from "../models/PdfMockTest.js";
import {
  deleteLocalPdfMockTest,
  listLocalPdfMockTests,
  listLocalPdfMockTestsForAdmin,
  updateLocalPdfMockTestStatus,
  upsertLocalPdfMockTests
} from "./localPersistence.js";

const MAX_QUESTIONS_PER_TOPIC = 500;
const MAX_TOTAL_QUESTIONS = 5000;

const subjectKeywords = [
  ["General Awareness", ["general awareness", "history", "geography", "polity", "economics", "current affairs", "static gk", "art & culture"]],
  ["General Science", ["general science", "biology", "physics", "chemistry", "science"]],
  ["Reasoning", ["reasoning", "coding", "blood relation", "analogy", "series", "syllogism", "calendar", "clock"]],
  ["Mathematics", ["math", "mathematics", "percentage", "profit", "ratio", "average", "algebra", "geometry", "mensuration"]],
  ["English", ["english", "grammar", "vocabulary", "synonym", "antonym"]],
  ["Computer", ["computer", "internet", "ms office", "hardware", "software"]]
];

const examKeywords = [
  ["RRB NTPC", ["rrb ntpc", "ntpc"]],
  ["RRB Group D", ["group d", "level 01"]],
  ["RRB ALP", ["rrb alp", "alp"]],
  ["RRB Technician", ["technician"]],
  ["Railway", ["railway", "rrb", "rpf"]],
  ["SSC CGL", ["ssc cgl"]],
  ["SSC CHSL", ["ssc chsl"]],
  ["SSC MTS", ["ssc mts", "mts"]],
  ["SSC GD", ["ssc gd"]],
  ["Police", ["police", "constable", "sub-inspector", "si"]],
  ["Banking", ["banking", "ibps", "sbi", "po", "clerk"]],
  ["State PSC", ["state psc", "psc"]]
];

const topicRules = [
  ["Ancient History", ["ancient", "harappan", "vedic", "maury", "gupta", "sangam"]],
  ["Medieval History", ["medieval", "sultanate", "mughal", "akbar", "khilji", "tughlaq"]],
  ["Modern History", ["modern history", "freedom", "congress", "gandhi", "revolt", "british"]],
  ["Arts & Culture", ["art", "culture", "temple", "dance", "music", "painting"]],
  ["Geography", ["geography", "river", "climate", "soil", "agriculture", "mineral"]],
  ["Polity", ["constitution", "parliament", "president", "article", "fundamental", "polity"]],
  ["Economics", ["economics", "gdp", "inflation", "bank", "budget", "tax"]],
  ["Current Affairs", ["current affairs", "scheme", "appointment", "summit", "award"]],
  ["Environment", ["environment", "ecology", "pollution", "biodiversity"]],
  ["Biology", ["biology", "cell", "plant", "animal", "disease", "blood", "hormone", "genetics"]],
  ["Physics", ["physics", "motion", "force", "light", "sound", "electricity", "work", "energy"]],
  ["Chemistry", ["chemistry", "acid", "base", "metal", "periodic", "compound", "reaction"]],
  ["Computer", ["computer", "software", "hardware", "internet", "keyboard"]],
  ["Reasoning", ["reasoning", "series", "coding", "analogy", "blood relation"]],
  ["Mathematics", ["percentage", "profit", "loss", "ratio", "average", "algebra", "geometry"]]
];

const subtopicRules = [
  ["Percentage", ["percentage", "percent", "%"]],
  ["Profit Loss", ["profit", "loss", "discount", "marked price"]],
  ["Ratio Average", ["ratio", "proportion", "average"]],
  ["Geometry", ["triangle", "circle", "angle", "square", "rectangle", "chord", "tangent"]],
  ["Mensuration", ["area", "volume", "perimeter", "surface area"]],
  ["Series", ["series", "sequence", "next number"]],
  ["Coding Decoding", ["coding", "decoding", "coded", "code"]],
  ["Analogy", ["analogy", "classification", "odd one"]],
  ["Constitution", ["constitution", "article", "parliament", "president", "fundamental"]],
  ["Cell Biology", ["cell", "nucleus", "mitochondria", "membrane"]],
  ["Physics", ["motion", "force", "light", "sound", "electricity", "energy"]],
  ["Chemistry", ["acid", "base", "metal", "compound", "reaction"]]
];

const cleanText = (value = "") =>
  String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/W hich/g, "Which")
    .replace(/w hich/g, "which")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const detectFromKeywords = (text = "", rules = [], fallback = "Mixed Practice") => {
  const lowered = text.toLowerCase();
  const match = rules.find(([, keywords]) => keywords.some((keyword) => lowered.includes(keyword)));
  return match?.[0] || fallback;
};

const detectSubject = (text = "") => detectFromKeywords(text, subjectKeywords, "Mixed Practice");
const detectExam = (text = "", filename = "") => detectFromKeywords(`${filename} ${text}`, examKeywords, "Railway");

const normalizeHeading = (value = "") => {
  const heading = cleanText(value).replace(/^(?:topic|subject|chapter)\s*[:.-]\s*/i, "").replace(/^[\s:.-]+|[\s:.-]+$/g, "");
  return heading.length >= 3 && heading.length <= 90 ? heading : "";
};

const findHeadingTopic = (text = "") => {
  const patterns = [
    /([A-Za-z& ,.'-]+(?:\([A-Za-z ]+\))?)\s*\((?:Q|total\s+Q)\s*[-:]?\s*\d+\)/i,
    /(?:^|\s)(?:Topic|Chapter|Subject)\s*[:.-]\s*([A-Za-z& ,.'-]{3,90})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const heading = normalizeHeading(match?.[1] || "");
    if (heading) return heading;
  }
  return "";
};

const detectTopic = (block = "", currentTopic = "", subject = "Mixed Practice") => {
  const heading = findHeadingTopic(block);
  if (heading) return heading;
  const topic = detectFromKeywords(block, topicRules, "");
  return topic || currentTopic || subject;
};

const detectSubtopic = (block = "", topic = "", subject = "Mixed Practice") =>
  detectFromKeywords(block, subtopicRules, topic || subject);

const detectChapter = (block = "", topic = "", subtopic = "", subject = "Mixed Practice") => {
  const heading = findHeadingTopic(block);
  return heading || subtopic || topic || subject;
};

const answerToIndex = (value = "") => {
  const letter = String(value || "").trim().toUpperCase()[0];
  return "ABCD".includes(letter) ? "ABCD".indexOf(letter) : null;
};

const findOptionLabels = (block = "") => {
  const labels = [];
  const pattern = /\(([A-D])\)|\[([A-D])\]|(?:^|\s)([A-D])[\).]\s*/g;
  let match;
  while ((match = pattern.exec(block))) {
    const letter = match[1] || match[2] || match[3];
    labels.push({ letter, start: match.index, end: pattern.lastIndex });
  }

  const sequence = [];
  let nextLetter = "A";
  for (const label of labels) {
    if (label.letter === nextLetter) {
      sequence.push(label);
      if (nextLetter === "D") return sequence;
      nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
    } else if (label.letter === "A") {
      sequence.splice(0, sequence.length, label);
      nextLetter = "B";
    }
  }
  return [];
};

const stripOptionTail = (value = "") =>
  cleanText(value)
    .split(/\b(?:Correct\s+Ans|Answer|Ans)\s*:/i)[0]
    .replace(/\s*\d{2}\/\d{2}\/\d{4}.*$/i, "")
    .replace(/^[\s.:-]+|[\s.:-]+$/g, "");

const hashQuestion = (value = "") =>
  crypto.createHash("sha1").update(cleanText(value).toLowerCase()).digest("hex").slice(0, 16);

const parseQuestionBlock = ({ block, topic, subtopic, chapter, subject, sourcePrefix, index }) => {
  const answerMatch = block.match(/\b(?:Correct\s+Ans|Answer|Ans)\s*:\s*\(?([A-D])\)?/i);
  const labels = findOptionLabels(block);
  if (labels.length !== 4) return null;

  const questionStart = block.match(/Q?\d{1,5}[\).]\s*/i);
  if (!questionStart) return null;

  const question = cleanText(block.slice(questionStart.index + questionStart[0].length, labels[0].start)).replace(/^[\s.:-]+|[\s.:-]+$/g, "");
  if (question.length < 12) return null;

  const options = labels.map((label, optionIndex) => {
    const nextStart = optionIndex < 3 ? labels[optionIndex + 1].start : answerMatch?.index || block.length;
    return stripOptionTail(block.slice(label.end, nextStart));
  });
  if (options.some((option) => !option)) return null;

  const answer = answerMatch ? answerToIndex(answerMatch[1]) : null;

  return {
    id: `${sourcePrefix}-${index}`,
    section: topic || subject,
    subject,
    topic: topic || subject,
    subtopic: subtopic || topic || subject,
    chapter: chapter || subtopic || topic || subject,
    question,
    options,
    answer,
    explanation: answerMatch
      ? `Answer key from uploaded PDF: option ${answerMatch[1].toUpperCase()}.`
      : "Answer key pending expert review.",
    confidence: answerMatch ? 0.86 : 0.58,
    duplicateKey: hashQuestion(question)
  };
};

const splitQuestionBlocks = (text = "") => {
  const matches = Array.from(text.matchAll(/(?<![A-Za-z0-9])Q?\d{1,5}[\).]\s*(?=[A-Z_])/g));
  return matches.map((match, index) => {
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    return text.slice(match.index, end);
  });
};

export const listPublishedPdfMockTests = async () => {
  if (isDatabaseConnected()) {
    return PdfMockTest.find({ status: "published" }).sort({ createdAt: -1 }).lean();
  }
  return listLocalPdfMockTests().filter((test) => (test.status || "published") === "published");
};

export const listAdminPdfMockTests = async () => {
  if (isDatabaseConnected()) return PdfMockTest.find({}).sort({ createdAt: -1 }).lean();
  return listLocalPdfMockTestsForAdmin();
};

export const setPdfMockTestStatus = async (id, status) => {
  if (isDatabaseConnected()) {
    return PdfMockTest.findOneAndUpdate({ id }, { $set: { status } }, { new: true, runValidators: true }).lean();
  }
  return updateLocalPdfMockTestStatus(id, status);
};

export const removePdfMockTest = async (id) => {
  if (isDatabaseConnected()) {
    const result = await PdfMockTest.deleteOne({ id });
    return result.deletedCount > 0;
  }
  return deleteLocalPdfMockTest(id);
};

const persistPdfMockTests = async (tests, sourcePdf) => {
  if (!isDatabaseConnected()) {
    upsertLocalPdfMockTests(tests, sourcePdf);
    return;
  }

  const ids = tests.map((test) => test.id);
  await Promise.all(tests.map((test) => PdfMockTest.findOneAndUpdate(
    { id: test.id },
    { $set: test },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  )));
  if (ids.length) await PdfMockTest.deleteMany({ sourcePdf, id: { $nin: ids } });
};

export const ingestPdfMockBuffer = async ({ buffer, filename = "uploaded.pdf", examName = "", subjectName = "", status = "published", createdBy = "" }) => {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  let parsed;
  try {
    parsed = await parser.getText();
  } finally {
    await parser.destroy().catch(() => {});
  }
  const text = cleanText(parsed.text || "");
  if (!text || text.length < 100) {
    const error = new Error("PDF text could not be extracted. Scanned/OCR PDFs need OCR before mock generation.");
    error.statusCode = 422;
    throw error;
  }

  const exam = examName || detectExam(text.slice(0, 5000), filename);
  const subject = subjectName || detectSubject(`${filename} ${text.slice(0, 8000)}`);
  const groupId = `${slugify(exam)}-${slugify(subject)}-${Date.now()}`;
  const sourcePrefixBase = slugify(filename.replace(/\.pdf$/i, ""));
  const seen = new Set();
  const questionsByTopic = new Map();
  let currentTopic = subject;
  let totalQuestions = 0;

  for (const block of splitQuestionBlocks(text)) {
    currentTopic = detectTopic(block, currentTopic, subject);
    const topic = currentTopic || subject;
    const subtopic = detectSubtopic(block, topic, subject);
    const chapter = detectChapter(block, topic, subtopic, subject);
    const sourcePrefix = `${sourcePrefixBase}-${slugify(topic)}`.slice(0, 70).replace(/-+$/g, "");
    const parsedQuestion = parseQuestionBlock({
      block,
      topic,
      subtopic,
      chapter,
      subject,
      sourcePrefix,
      index: (questionsByTopic.get(topic)?.length || 0) + 1
    });
    if (!parsedQuestion || seen.has(parsedQuestion.duplicateKey)) continue;
    seen.add(parsedQuestion.duplicateKey);

    const topicQuestions = questionsByTopic.get(topic) || [];
    if (topicQuestions.length < MAX_QUESTIONS_PER_TOPIC && totalQuestions < MAX_TOTAL_QUESTIONS) {
      topicQuestions.push(parsedQuestion);
      questionsByTopic.set(topic, topicQuestions);
      totalQuestions += 1;
    }
  }

  const tests = Array.from(questionsByTopic.entries())
    .filter(([, questions]) => questions.length)
    .map(([topic, questions]) => ({
      id: `${groupId}-${slugify(topic)}`.slice(0, 100).replace(/-+$/g, ""),
      title: `${topic} Section Mock`,
      category: exam,
      subject,
      topic,
      chapter: questions[0]?.chapter || topic,
      subtopics: Array.from(new Set(questions.map((question) => question.subtopic).filter(Boolean))).slice(0, 25),
      language: /[\u0900-\u097F]/.test(text) ? "Hindi + English" : "English",
      mockType: "section",
      mockGroupId: groupId,
      mockGroupTitle: `${exam} Full Mock - ${subject}`,
      sourcePdf: filename,
      generatedBy: "ai-pdf-filter",
      status: status === "draft" ? "draft" : "published",
      createdBy: String(createdBy || "").trim(),
      questions: questions.map(({ duplicateKey, ...question }) => question)
    }));

  if (!tests.length) {
    const error = new Error("No valid MCQs were detected. PDF should contain Q1/A/B/C/D and answer key markers.");
    error.statusCode = 422;
    throw error;
  }

  await persistPdfMockTests(tests, filename);

  return {
    groupId,
    groupTitle: `${exam} Full Mock - ${subject}`,
    sourcePdf: filename,
    tests,
    summary: {
      exam,
      subject,
      topics: tests.length,
      questions: tests.reduce((sum, test) => sum + test.questions.length, 0),
      pages: parsed.total || 0,
      duplicatesRemoved: seen.size - tests.reduce((sum, test) => sum + test.questions.length, 0)
    }
  };
};
