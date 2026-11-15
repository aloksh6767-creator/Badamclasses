import crypto from "crypto";
import mongoose from "mongoose";
import StudentAiMockTest from "../models/StudentAiMockTest.js";
import StudentAiMockUsage from "../models/StudentAiMockUsage.js";
import StudentAiMockQuestionFingerprint from "../models/StudentAiMockQuestionFingerprint.js";
import DailyAiMockTest from "../models/DailyAiMockTest.js";
import DailyAiMockBlueprint from "../models/DailyAiMockBlueprint.js";
import { isDatabaseConnected } from "../config/db.js";
import { listPublishedPdfMockTests } from "./pdfMockIngestionService.js";
import {
  buildPatternGuidance,
  generateQuestionBatch,
  independentlyVerifyQuestions,
  questionFingerprint,
  questionSimilarity,
  runBoundedRetries,
  validateGeneratedQuestions
} from "./dailyAiMockService.js";

export const studentAiExamGroups = {
  SSC: {
    exams: ["SSC CGL", "SSC CHSL", "SSC MTS", "SSC GD", "SSC CPO", "SSC Stenographer", "SSC JE", "SSC Selection Post"],
    subjects: ["Quantitative Aptitude", "General Intelligence & Reasoning", "English Comprehension", "General Awareness", "Computer Knowledge"]
  },
  Railway: {
    exams: ["RRB NTPC", "RRB Group D", "RRB ALP", "RRB Technician", "RRB JE", "RPF SI", "RPF Constable"],
    subjects: ["Mathematics", "General Intelligence & Reasoning", "General Awareness", "General Science", "Professional Ability"]
  },
  Banking: {
    exams: ["IBPS PO", "IBPS Clerk", "SBI PO", "SBI Clerk", "IBPS RRB Officer", "IBPS RRB Assistant"],
    subjects: ["Quantitative Aptitude", "Reasoning Ability", "English Language", "General Awareness", "Computer Knowledge"]
  },
  Police: {
    exams: ["SSC CPO", "Delhi Police Constable", "UP Police Constable", "UP Police SI", "Bihar Police Constable", "Rajasthan Police Constable"],
    subjects: ["General Knowledge", "Reasoning", "Quantitative Aptitude", "English", "Hindi"]
  },
  "State Exams": {
    exams: ["UP Police", "UPSSSC PET", "UPPSC", "MP Police", "MPPSC", "Bihar Police", "BPSC", "Rajasthan Police", "RPSC", "Haryana CET", "State PSC"],
    subjects: ["General Studies", "General Science", "Reasoning", "Quantitative Aptitude", "Hindi", "English"]
  }
};

const MAX_QUESTIONS = 25;
const MAX_DURATION_MINUTES = 120;
const MAX_BLUEPRINT_QUESTIONS = 200;
const MAX_BLUEPRINT_DURATION_MINUTES = 240;
const MAX_ACTIVE_PER_USER = 1;
let activeStudentAiGenerations = 0;
const idFor = (value) => mongoose.isValidObjectId(value) ? value : null;
const cap = (value, max) => String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, max);
const dailyLimit = () => Math.min(10, Math.max(1, Number(process.env.STUDENT_AI_MOCK_DAILY_QUOTA) || 3));
const maxQuestions = () => Math.min(MAX_QUESTIONS, Math.max(5, Number(process.env.STUDENT_AI_MOCK_MAX_QUESTIONS) || MAX_QUESTIONS));
const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const labelText = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const comparableSubject = (value) => labelText(value).replace(/\band\b/g, "").replace(/\s+/g, "");
export const isStatementBasedQuestion = (value = "") => {
  const text = String(value || "");
  const hasTwoStatements = /(?:statement|कथन)\s*(?:i|1)\b[\s\S]{0,320}?(?:statement|कथन)\s*(?:ii|2)\b/i.test(text)
    || /(?:^|\s)(?:i|1)\s*[.):][\s\S]{0,320}?(?:^|\s)(?:ii|2)\s*[.):]/im.test(text);
  const asksToEvaluate = /(?:which|select|identify|how many|correct|incorrect|निम्नलिखित|कौन|कितने|सही|गलत)/i.test(text);
  return hasTwoStatements && asksToEvaluate;
};
const subjectAliases = {
  "quantitative aptitude": ["quantitative aptitude", "mathematics", "math", "arithmetic"],
  mathematics: ["mathematics", "math", "quantitative aptitude", "arithmetic"],
  "general intelligence reasoning": ["reasoning", "general intelligence", "logical reasoning"],
  reasoning: ["reasoning", "general intelligence", "logical reasoning"],
  "general awareness": ["general awareness", "general studies", "gk", "current affairs"],
  "general studies": ["general studies", "general awareness", "gk", "current affairs"],
  "english comprehension": ["english", "english comprehension", "grammar", "vocabulary"],
  english: ["english", "english comprehension", "grammar", "vocabulary"],
  "general science": ["general science", "science", "physics", "chemistry", "biology"]
};

const patternKind = (question) => {
  const value = labelText(question);
  if (/\b(?:arrange|chronolog|sequence|order of|ascending|descending)\b/.test(value)) return "ordering and chronology";
  if (/\b(?:statement i|which statements|consider the following|correct statement|incorrect statement)\b/.test(value)) return "statement evaluation and elimination";
  if (/\b(?:series|next term|missing number|sequence)\b/.test(value)) return "series and pattern completion";
  if (/\b(?:ratio|percentage|percent|profit|loss|average|speed|distance|time|interest)\b/.test(value)) return "multi-step numerical application";
  if (/\b(?:code|decode|coded|analogy|syllogism|relation|direction)\b/.test(value)) return "reasoning and rule application";
  if (/\b(?:which of the following|who among|where is|when was|which article)\b/.test(value)) return "fact-based concept checks";
  return "concept application";
};

export const analyzeUploadedPyqPatterns = ({ tests = [], examFamily, examName, subject, topic }) => {
  const examKey = labelText(examName);
  const familyKey = labelText(examFamily);
  const subjectKey = labelText(subject);
  const aliases = subjectAliases[subjectKey] || [subjectKey];
  const sources = (Array.isArray(tests) ? tests : []).map((test) => {
    const sourceText = labelText([test.title, test.category, test.sourcePdf, test.subject, test.topic].join(" "));
    const examMatches = examKey && examKey !== "state psc"
      ? sourceText.includes(examKey) || (examKey.includes("police") && sourceText.includes("constable"))
      : familyKey === "railway" ? /\b(?:railway|rrb|ntpc|group d|alp|technician)\b/.test(sourceText)
        : familyKey === "ssc" ? /\bssc\b/.test(sourceText)
          : /\b(?:psc|state|police|constable|up|mp|bihar|rajasthan)\b/.test(sourceText);
    if (!examMatches) return null;
    const questions = (Array.isArray(test.questions) ? test.questions : []).filter((question) => {
      const questionSubject = labelText([question.subject, question.section, test.subject, test.category].join(" "));
      return aliases.some((alias) => questionSubject.includes(labelText(alias)));
    });
    if (!questions.length) return null;
    const topicKey = labelText(topic);
    const topicMatches = questions.filter((question) => labelText([question.topic, question.chapter, question.subtopic, test.topic, test.chapter].join(" ")).includes(topicKey));
    return { test, questions, selected: topicMatches.length ? topicMatches : questions, topicMatched: topicMatches.length > 0 };
  }).filter(Boolean);

  const exactTopicSources = sources.filter((source) => source.topicMatched);
  const selectedSources = exactTopicSources.length ? exactTopicSources : sources;
  const selected = selectedSources.flatMap((source) => source.selected).filter((question) => String(question.question || "").trim().length >= 12);
  const kinds = new Map();
  const topics = new Map();
  for (const question of selected) {
    const kind = patternKind(question.question);
    kinds.set(kind, (kinds.get(kind) || 0) + 1);
    const topicName = String(question.topic || question.chapter || question.subtopic || subject).trim();
    if (topicName) topics.set(topicName, (topics.get(topicName) || 0) + 1);
  }
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => `${name} (${count})`);
  const stateName = ({ "up police": "Uttar Pradesh", "mp police": "Madhya Pradesh", "bihar police": "Bihar" })[examKey] || "";
  const stateScope = stateName ? `State context: ${stateName}.` : familyKey === "state exams" ? `Preserve the selected state/exam context (${examName}); do not substitute another state.` : "";
  const guidance = selected.length
    ? `Analyzed ${selected.length} uploaded PYQ questions across ${selectedSources.length} published PDF set(s) for ${examName}, ${subject}${topic ? `, ${topic}` : ""}. Frequent source topics: ${top(topics).join(", ") || "topic tags unavailable"}. Observed formats: ${top(kinds).join(", ") || "mixed"}. ${stateScope} Write new questions that test the same skills with different facts, values, entities and reasoning paths; never reuse source wording, options, or answer combinations. Uploaded references are pattern evidence only, not official generated questions.`.slice(0, 1000)
    : `${stateScope} No matching published uploaded PYQ set was available for ${examName}/${subject}${topic ? `/${topic}` : ""}; create original topic-based practice without claiming PYQ verification.`.slice(0, 1000);
  const referenceQuestions = selected.map((question) => String(question.question || "").trim()).filter(Boolean);
  return {
    guidance,
    sourceQuestionCount: selected.length,
    sourceSetCount: selectedSources.length,
    referenceFingerprints: new Set(referenceQuestions.map(questionFingerprint)),
    similarityReferences: referenceQuestions.slice(0, 500)
  };
};

const reserveQuota = async (userId, date) => {
  try {
    await StudentAiMockUsage.findOneAndUpdate({ userId, localDate: date }, { $setOnInsert: { userId, localDate: date, generatedCount: 0, activeCount: 0 } }, { upsert: true, new: true });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
  const quota = await StudentAiMockUsage.findOneAndUpdate({
    userId, localDate: date,
    $expr: { $and: [{ $lt: ["$generatedCount", dailyLimit()] }, { $lt: ["$activeCount", MAX_ACTIVE_PER_USER] }] }
  }, { $inc: { activeCount: 1 } }, { new: true });
  if (!quota) {
    const current = await StudentAiMockUsage.findOne({ userId, localDate: date }).lean();
    const error = new Error(current?.activeCount >= MAX_ACTIVE_PER_USER ? "A mock is already being generated. Wait for it to finish." : "Daily AI mock quota reached. Try again tomorrow.");
    error.statusCode = 429;
    throw error;
  }
  return quota;
};

const releaseQuota = async (userId, date, consumed) => StudentAiMockUsage.updateOne(
  { userId, localDate: date, activeCount: { $gt: 0 } },
  { $inc: { activeCount: -1, ...(consumed ? { generatedCount: 1 } : {}) } }
);

export const normalizeStudentAiMockRequest = (body = {}) => {
  const examFamily = cap(body.examFamily, 30);
  const examName = cap(body.examName, 60);
  const subject = cap(body.subject, 80);
  const topic = cap(body.topic, 120);
  const language = cap(body.language, 20);
  const difficulty = cap(body.difficulty, 20).toLowerCase();
  const testType = cap(body.testType, 20).toLowerCase();
  const questionStyle = cap(body.questionStyle, 20).toLowerCase() || "mixed";
  const group = studentAiExamGroups[examFamily];
  if (!group || !group.exams.includes(examName)) throw Object.assign(new Error("Choose an exam from the supported list."), { statusCode: 400 });
  if (testType !== "full" && !group.subjects.includes(subject)) throw Object.assign(new Error("Choose a subject available for this exam family."), { statusCode: 400 });
  if (testType === "topic" && (!topic || topic.length < 2)) throw Object.assign(new Error("Enter a topic or chapter for the mock."), { statusCode: 400 });
  if (!["Hindi", "English"].includes(language)) throw Object.assign(new Error("Choose Hindi or English."), { statusCode: 400 });
  if (!["easy", "medium", "hard", "mixed"].includes(difficulty)) throw Object.assign(new Error("Choose a supported difficulty."), { statusCode: 400 });
  if (!["full", "sectional", "topic"].includes(testType)) throw Object.assign(new Error("Choose a supported mock format."), { statusCode: 400 });
  if (!["mixed", "statement"].includes(questionStyle)) throw Object.assign(new Error("Choose a supported question style."), { statusCode: 400 });
  const questionCount = Number(body.questionCount);
  const durationMinutes = Number(body.durationMinutes);
  const maxForMode = testType === "topic" ? maxQuestions() : MAX_BLUEPRINT_QUESTIONS;
  if (!Number.isInteger(questionCount) || questionCount < 5 || questionCount > maxForMode) throw Object.assign(new Error(`Question count must be between 5 and ${maxForMode}.`), { statusCode: 400 });
  const maxDurationForMode = testType === "topic" ? MAX_DURATION_MINUTES : MAX_BLUEPRINT_DURATION_MINUTES;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > maxDurationForMode) throw Object.assign(new Error(`Duration must be between 5 and ${maxDurationForMode} minutes.`), { statusCode: 400 });
  return { examFamily, examName, subject, topic, language, difficulty, testType, questionStyle, questionCount, durationMinutes };
};

const distributionFor = (count, difficulty) => {
  if (difficulty === "easy") return { easy: 100, medium: 0, hard: 0 };
  if (difficulty === "medium") return { easy: 0, medium: 100, hard: 0 };
  if (difficulty === "hard") return { easy: 0, medium: 0, hard: 100 };
  const counts = { easy: Math.floor(count * 0.3), medium: Math.floor(count * 0.5), hard: 0 };
  counts.hard = count - counts.easy - counts.medium;
  return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value / count * 100]));
};

const serializeMine = (mock) => ({
  id: String(mock._id), title: mock.title, examName: mock.examName, examFamily: mock.examFamily,
  examTier: mock.examTier, testType: mock.testType, subject: mock.subject, topic: mock.topic,
  questionStyle: mock.questionStyle || "mixed",
  questionCount: mock.totalQuestions, durationMinutes: mock.durationMinutes, totalMarks: mock.totalMarks,
  language: mock.language, difficulty: mock.difficulty, mode: mock.mode, status: mock.status,
  generationError: mock.generationError, createdAt: mock.createdAt,
  href: mock.status === "ready" ? `/test/${String(mock._id)}` : ""
});

export const getStudentAiMockOptions = async (userId) => {
  const limits = { minQuestions: 5, maxQuestions: maxQuestions(), minDurationMinutes: 5, maxDurationMinutes: MAX_DURATION_MINUTES };
  if (!isDatabaseConnected()) return { groups: studentAiExamGroups, limits, approvedPatterns: [], dailyLimit: dailyLimit(), generatedToday: null, remainingToday: null, aiAvailable: Boolean(process.env.OPENAI_API_KEY), databaseAvailable: false };
  const usage = await StudentAiMockUsage.findOne({ userId, localDate: localDate() }).lean();
  const generatedToday = Number(usage?.generatedCount || 0);
  const today = new Date();
  const blueprints = await DailyAiMockBlueprint.find({ reviewStatus: "approved" }).select("examFamily examination version fullTest sectionalTests").lean();
  const serializePattern = (pattern) => pattern && pattern.effectiveFrom && new Date(pattern.effectiveFrom) <= today ? {
    tier: pattern.tier, totalQuestions: pattern.totalQuestions, totalMarks: pattern.totalMarks,
    durationMinutes: pattern.durationMinutes, marksPerCorrect: pattern.marksPerCorrect,
    negativeMarks: pattern.negativeMarks, supportedLanguages: pattern.supportedLanguages,
    sections: (pattern.sections || []).map(({ name, subject, questionCount, marks }) => ({ name, subject, questionCount, marks }))
  } : null;
  const approvedPatterns = blueprints.map(({ examFamily, examination, version, fullTest, sectionalTests }) => ({
    examFamily, examName: examination, version,
    fullTest: serializePattern(fullTest),
    sectionalTests: (sectionalTests || []).map(serializePattern).filter(Boolean)
  })).filter((blueprint) => blueprint.fullTest || blueprint.sectionalTests.length);
  return { groups: studentAiExamGroups, limits, approvedPatterns, dailyLimit: dailyLimit(), generatedToday, remainingToday: Math.max(0, dailyLimit() - generatedToday), aiAvailable: Boolean(process.env.OPENAI_API_KEY), databaseAvailable: true };
};

export const listStudentAiMocks = async (ownerId) => {
  if (!isDatabaseConnected()) throw Object.assign(new Error("AI mock history requires the database service."), { statusCode: 503 });
  const tests = await StudentAiMockTest.find({ ownerId }).sort({ createdAt: -1 }).limit(50).lean();
  return tests.map(serializeMine);
};

const generateStudentAiMockInternal = async ({ ownerId: rawOwnerId, body, requestId: rawRequestId }) => {
  if (!isDatabaseConnected()) throw Object.assign(new Error("AI mock generation is temporarily unavailable because the database is offline."), { statusCode: 503 });
  if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error("AI mock generation is not configured on the server yet."), { statusCode: 503 });
  const ownerId = idFor(rawOwnerId);
  if (!ownerId) throw Object.assign(new Error("Your account could not be verified for mock generation."), { statusCode: 401 });
  const requestId = cap(rawRequestId, 100);
  if (!/^[\w-]{12,100}$/.test(requestId)) throw Object.assign(new Error("A valid generation request ID is required."), { statusCode: 400 });
  const input = normalizeStudentAiMockRequest(body);
  const existing = await StudentAiMockTest.findOne({ ownerId, requestId });
  if (existing) {
    if (existing.status === "ready") return { mock: serializeMine(existing), reused: true };
    if (existing.status === "generating") throw Object.assign(new Error("This mock is still generating. Refresh My AI Mocks in a moment."), { statusCode: 202 });
    throw Object.assign(new Error(existing.generationError || "This request failed earlier. Submit again to start a fresh attempt."), { statusCode: 409 });
  }

  const approvedBlueprint = await DailyAiMockBlueprint.findOne({ examFamily: input.examFamily, examination: input.examName, reviewStatus: "approved" }).sort({ version: -1 }).lean();
  const isEffective = (pattern) => pattern?.effectiveFrom && new Date(pattern.effectiveFrom) <= new Date();
  const blueprintPattern = input.testType === "full"
    ? (isEffective(approvedBlueprint?.fullTest) ? approvedBlueprint.fullTest : null)
    : input.testType === "sectional"
      ? (approvedBlueprint?.sectionalTests || []).find((pattern) => isEffective(pattern) && pattern.sections?.some((item) => comparableSubject(item.subject) === comparableSubject(input.subject))) || null
      : null;
  if (input.testType !== "topic" && !blueprintPattern) {
    throw Object.assign(new Error(`No approved, effective ${input.testType} blueprint is configured for ${input.examName}. Use Topic-wise practice or ask an admin to approve the current official pattern first.`), { statusCode: 409 });
  }
  if (blueprintPattern && !(blueprintPattern.supportedLanguages || []).includes(input.language)) {
    throw Object.assign(new Error(`${input.language} is not enabled in the approved ${input.examName} blueprint.`), { statusCode: 400 });
  }
  const configuredSections = blueprintPattern
    ? blueprintPattern.sections.map((item) => ({
      name: item.name, subject: item.subject, questionCount: Number(item.questionCount), marks: Number(item.marks),
      topics: item.topics || [], topicDistribution: item.topicDistribution || [],
      difficultyDistribution: item.difficultyDistribution || { easy: 30, medium: 50, hard: 20 }
    }))
    : [{
      name: `${input.subject} · ${input.topic}`, subject: input.subject, questionCount: input.questionCount, marks: input.questionCount,
      topics: [input.topic], topicDistribution: [{ topic: input.topic, percentage: 100 }],
      difficultyDistribution: distributionFor(input.questionCount, input.difficulty)
    }];
  const effectiveQuestionCount = blueprintPattern ? Number(blueprintPattern.totalQuestions) : input.questionCount;
  const effectiveDurationMinutes = blueprintPattern ? Number(blueprintPattern.durationMinutes) : input.durationMinutes;
  const effectiveTotalMarks = blueprintPattern ? Number(blueprintPattern.totalMarks) : input.questionCount;
  const effectiveMarksPerQuestion = blueprintPattern ? Number(blueprintPattern.marksPerCorrect) : 1;
  const effectiveNegativeMarks = blueprintPattern ? Number(blueprintPattern.negativeMarks) : 0;
  const effectiveSubject = blueprintPattern ? [...new Set(configuredSections.map((item) => item.subject))].join(", ") : input.subject;

  const date = localDate();
  await reserveQuota(ownerId, date);
  let mock;
  try {
    mock = await StudentAiMockTest.create({
      ownerId, requestId,
      title: `${input.examName} · ${input.testType === "topic" ? "Topic Practice" : input.testType === "sectional" ? "Sectional Mock" : "Full Mock"}${input.testType === "topic" ? ` · ${input.topic}` : ""}`.slice(0, 140),
      examName: input.examName, examFamily: input.examFamily, examTier: blueprintPattern?.tier || "Custom topic practice · not an official-pattern test",
      testType: input.testType, questionStyle: input.questionStyle, subject: effectiveSubject, topic: input.topic,
      sections: configuredSections.map(({ name, subject, questionCount, marks }) => ({ name, subject, questionCount, marks })),
      blueprintVersion: blueprintPattern ? approvedBlueprint.version : null,
      durationMinutes: effectiveDurationMinutes, totalQuestions: effectiveQuestionCount,
      totalMarks: effectiveTotalMarks, marksPerQuestion: effectiveMarksPerQuestion, negativeMarks: effectiveNegativeMarks,
      language: input.language, difficulty: input.difficulty, status: "generating", mode: "timed"
    });
  } catch (error) {
    await releaseQuota(ownerId, date, false);
    if (error?.code === 11000) {
      const duplicate = await StudentAiMockTest.findOne({ ownerId, requestId });
      if (duplicate?.status === "ready") return { mock: serializeMine(duplicate), reused: true };
      throw Object.assign(new Error("This mock request is already being processed."), { statusCode: 202 });
    }
    throw error;
  }

  const currentPattern = [approvedBlueprint?.fullTest, ...(approvedBlueprint?.sectionalTests || [])]
    .filter((pattern) => pattern && new Date(pattern.effectiveFrom) <= new Date())
    .find((pattern) => (pattern.sections || []).some((item) => String(item?.subject || "").trim().toLowerCase() === input.subject.trim().toLowerCase()));
  const uploadedPyqAnalysis = analyzeUploadedPyqPatterns({
    tests: await listPublishedPdfMockTests(), examFamily: input.examFamily, examName: input.examName,
    subject: input.subject, topic: input.topic
  });
  const styleGuidance = input.questionStyle === "statement"
    ? "Question style requested: statement-based. Build each question around two or more clearly numbered statements, then ask which statement(s) are correct/incorrect or which combination is valid. Make options represent distinct statement combinations, ensure exactly one defensible answer, and explain each statement separately. Keep the chosen exam's approved pattern and subject scope."
    : "Question style requested: mixed, following the selected exam's effective approved blueprint where one is available.";
  const pyqPatternGuidance = [styleGuidance, currentPattern?.pyqPatternGuidance || approvedBlueprint?.pyqPatternGuidance || "", uploadedPyqAnalysis.guidance]
    .filter(Boolean).join(" ").slice(0, 1000);
  const sourceReferences = Array.isArray(blueprintPattern?.sourceReferences) ? blueprintPattern.sourceReferences : [];
  let quotaConsumed = false;
  try {
    const configuredRetries = Number(process.env.STUDENT_AI_MOCK_RETRIES);
    const maxRetries = Math.min(2, Math.max(0, Number.isFinite(configuredRetries) && process.env.STUDENT_AI_MOCK_RETRIES !== undefined ? configuredRetries : 1));
    const generatedQuestions = [];
    for (const section of configuredSections) {
      for (let offset = 0; offset < section.questionCount; offset += 25) {
        const batchCount = Math.min(25, section.questionCount - offset);
        const batchSection = { ...section, questionCount: batchCount };
        const batchResult = await runBoundedRetries(async () => {
          const rawQuestions = await generateQuestionBatch({
            exam: input.examName,
            tier: blueprintPattern?.tier || "Custom topic practice",
            section: batchSection,
            languages: [input.language],
            topics: section.topics,
            topicDistribution: section.topicDistribution,
            difficultyDistribution: section.difficultyDistribution,
            sourceReferences,
            pyqPatternGuidance,
            count: batchCount,
            existingQuestions: generatedQuestions.map((question) => question.question),
            requireSourceReference: Boolean(blueprintPattern)
          });
          const validation = validateGeneratedQuestions({
            questions: rawQuestions, sections: [batchSection], languages: [input.language],
            sourceReferences, expectedCount: batchCount, requireSourceReference: Boolean(blueprintPattern)
          });
          if (!validation.valid) throw new Error(validation.errors.join("; "));
          if (input.questionStyle === "statement" && validation.questions.some((question) => !isStatementBasedQuestion(question.question))) {
            throw new Error("The generated batch did not follow the requested statement-wise format. Retrying validation.");
          }
          return validation.questions;
        }, maxRetries);
        if (batchResult.error) throw batchResult.error;
        generatedQuestions.push(...batchResult.value);
      }
    }
    const wholeTestValidation = validateGeneratedQuestions({
      questions: generatedQuestions, sections: configuredSections, languages: [input.language],
      sourceReferences, expectedCount: effectiveQuestionCount, requireSourceReference: Boolean(blueprintPattern)
    });
    if (!wholeTestValidation.valid) throw new Error(wholeTestValidation.errors.join("; "));
    const verifiedQuestions = [];
    for (let offset = 0; offset < wholeTestValidation.questions.length; offset += 15) {
      const batch = wholeTestValidation.questions.slice(offset, offset + 15);
      await independentlyVerifyQuestions({ exam: input.examName, questions: batch });
      verifiedQuestions.push(...batch);
    }
      const [recent, recentScheduled] = await Promise.all([
        StudentAiMockTest.find({ status: "ready", createdAt: { $gte: new Date(Date.now() - 90 * 86_400_000) } }).select("questions.question").limit(150).lean(),
        DailyAiMockTest.find({ status: { $in: ["published", "quarantined"] }, createdAt: { $gte: new Date(Date.now() - 90 * 86_400_000) } }).select("questions.question").limit(50).lean()
      ]);
      const priorQuestions = [...recent, ...recentScheduled].flatMap((item) => item.questions.map((question) => question.question));
      const duplicate = wholeTestValidation.questions.find((question) => priorQuestions.some((prior) => questionSimilarity(question.question, prior) >= 0.88));
      if (duplicate) throw new Error("A generated question was too similar to a recent mock. Please retry with another topic.");
      const generatedFingerprints = wholeTestValidation.fingerprints;
      const reusedPyq = wholeTestValidation.questions.some((question, index) =>
        uploadedPyqAnalysis.referenceFingerprints.has(generatedFingerprints[index])
        || uploadedPyqAnalysis.similarityReferences.some((prior) => questionSimilarity(question.question, prior) >= 0.88)
      );
      if (reusedPyq) throw new Error("A generated question was too similar to an uploaded PYQ. The mock was rejected; retry with another topic.");
      const existingFingerprints = await StudentAiMockQuestionFingerprint.find({ fingerprint: { $in: generatedFingerprints } }).select("fingerprint").lean();
      if (existingFingerprints.length) throw new Error("A duplicate question was detected. Please retry with another topic.");

    await StudentAiMockQuestionFingerprint.insertMany(wholeTestValidation.fingerprints.map((fingerprint) => ({ fingerprint, mockId: mock._id, ownerId })), { ordered: true });
    mock.questions = verifiedQuestions;
    mock.questionFingerprints = wholeTestValidation.fingerprints;
    mock.status = "ready";
    mock.generatorVersion = `${process.env.OPENAI_MODEL || "gpt-4o-mini"}:student-ai-mock-v1`;
    mock.qualityChecks = {
      questionSchema: true, answerKeyIndependentlyVerified: true, duplicateCheck: true, savedOnlyAfterValidation: true,
      uploadedPyqPatternAnalysis: true, pyqReferenceQuestionCount: uploadedPyqAnalysis.sourceQuestionCount,
      pyqReferenceSetCount: uploadedPyqAnalysis.sourceSetCount, originalVsPyqSimilarityCheck: true,
      approvedBlueprintUsed: Boolean(blueprintPattern), approvedBlueprintVersion: blueprintPattern ? approvedBlueprint.version : null,
      requestedQuestionStyle: input.questionStyle
    };
    mock.generationError = "";
    await mock.save();
    quotaConsumed = true;
    try { await releaseQuota(ownerId, date, true); }
    catch (quotaError) { console.error("Student AI mock quota finalization failed:", quotaError.message); }
    return { mock: serializeMine(mock), reused: false };
  } catch (error) {
    await StudentAiMockQuestionFingerprint.deleteMany({ mockId: mock._id });
    mock.status = "failed";
    mock.generationError = String(error.message || "Question generation failed.").slice(0, 500);
    mock.qualityChecks = { failed: true, rejectionReason: mock.generationError };
    await mock.save();
    throw Object.assign(new Error(mock.generationError), { statusCode: error.statusCode || 502 });
  } finally {
    if (!quotaConsumed) await releaseQuota(ownerId, date, false);
  }
};

export const generateStudentAiMock = async (request) => {
  const maxConcurrent = Math.min(8, Math.max(1, Number(process.env.STUDENT_AI_MOCK_MAX_CONCURRENT) || 3));
  if (activeStudentAiGenerations >= maxConcurrent) throw Object.assign(new Error("AI mock generation is busy right now. Please retry shortly."), { statusCode: 429 });
  activeStudentAiGenerations += 1;
  try { return await generateStudentAiMockInternal(request); }
  finally { activeStudentAiGenerations -= 1; }
};
