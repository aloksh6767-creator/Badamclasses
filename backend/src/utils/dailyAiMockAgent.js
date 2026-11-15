import crypto from "crypto";
import { isDatabaseConnected } from "../config/db.js";
import DailyAiMockBlueprint from "../models/DailyAiMockBlueprint.js";
import DailyAiMockJob from "../models/DailyAiMockJob.js";
import DailyAiMockQuestionFingerprint from "../models/DailyAiMockQuestionFingerprint.js";
import DailyAiMockSettings from "../models/DailyAiMockSettings.js";
import DailyAiMockTest from "../models/DailyAiMockTest.js";
import {
  generateQuestionBatch,
  independentlyVerifyQuestions,
  questionSimilarity,
  runBoundedRetries,
  validateBlueprintPattern,
  validateGeneratedQuestions
} from "./dailyAiMockService.js";

const SETTINGS_KEY = "daily-ai-mock";
const AGENT_VERSION = "daily-ai-mock-v1";

export const isBlueprintEffectiveForDailySet = (blueprint, dateKey) => {
  const endOfDate = new Date(`${dateKey}T23:59:59.999Z`);
  const effective = (pattern) => pattern && Number.isFinite(new Date(pattern.effectiveFrom).getTime()) && new Date(pattern.effectiveFrom) <= endOfDate;
  return Boolean(effective(blueprint?.fullTest)
    && (blueprint?.sectionalTests || []).filter(effective).length >= 2);
};

export const defaultDailyAiMockSettings = () => ({
  enabled: false,
  autoPublish: false,
  timezone: "Asia/Kolkata",
  generationTime: "07:00",
  examRotation: ["SSC", "Railway", "Banking", "Police"],
  lastScheduledDate: ""
});

export const getDailyAiMockSettings = async () => {
  if (!isDatabaseConnected()) return defaultDailyAiMockSettings();
  const record = await DailyAiMockSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY, ...defaultDailyAiMockSettings() } },
    { new: true, upsert: true }
  ).lean();
  return record;
};

export const updateDailyAiMockSettings = async (patch, actor = "admin") => {
  const allowed = ["enabled", "autoPublish", "timezone", "generationTime", "examRotation"];
  const update = Object.fromEntries(Object.entries(patch || {}).filter(([key]) => allowed.includes(key)));
  if (update.timezone) {
    try { new Intl.DateTimeFormat("en", { timeZone: update.timezone }).format(new Date()); }
    catch { throw new Error("timezone is not a valid IANA time zone."); }
  }
  if (update.generationTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(update.generationTime)) throw new Error("generationTime must use HH:MM format.");
  if (update.examRotation && (!Array.isArray(update.examRotation) || !update.examRotation.length || update.examRotation.length > 12 || update.examRotation.some((item) => !["SSC", "Railway", "Banking", "Police"].includes(item)))) throw new Error("examRotation contains an unsupported exam family.");
  if (update.sectionalSubjects && (!Array.isArray(update.sectionalSubjects) || update.sectionalSubjects.length > 20)) throw new Error("sectionalSubjects must be a list of at most 20 subjects.");
  if (update.enabled) {
    if (!isDatabaseConnected()) throw new Error("MongoDB is required before enabling daily generation.");
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required before enabling daily generation.");
    const currentSettings = await getDailyAiMockSettings();
    const timezone = update.timezone || currentSettings.timezone || "Asia/Kolkata";
    const dateKey = getLocalDate(new Date(), timezone);
    const rotation = update.examRotation || currentSettings.examRotation || defaultDailyAiMockSettings().examRotation;
    for (const family of rotation) {
      const approved = await DailyAiMockBlueprint.find({ examFamily: family, reviewStatus: "approved" }).lean();
      if (!approved.some((blueprint) => isBlueprintEffectiveForDailySet(blueprint, dateKey))) {
        throw new Error(`Cannot enable generation: an approved, effective ${family} blueprint with one full and two sectional patterns is required.`);
      }
    }
  }
  return DailyAiMockSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { ...update, updatedBy: String(actor).slice(0, 100) }, $setOnInsert: { key: SETTINGS_KEY } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
};

export const upsertDailyAiMockBlueprint = async (payload, actor = "admin") => {
  const key = String(payload?.key || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 80);
  const family = String(payload?.examFamily || "").trim();
  const examination = String(payload?.examination || "").trim();
  const version = Number(payload?.version);
  if (!key || !["SSC", "Railway", "Banking", "Police"].includes(family) || !examination || !Number.isInteger(version) || version < 1) throw new Error("Blueprint key, supported exam family, examination and positive version are required.");
  const reviewStatus = payload.reviewStatus === "approved" ? "approved" : "review_required";
  const candidate = {
    key, examFamily: family, examination, version, reviewStatus,
    reviewNotes: String(payload.reviewNotes || "").slice(0, 1000),
    pyqPatternGuidance: String(payload.pyqPatternGuidance || "").trim().slice(0, 1000),
    fullTest: payload.fullTest || null,
    sectionalTests: Array.isArray(payload.sectionalTests) ? payload.sectionalTests : []
  };
  const existingVersion = await DailyAiMockBlueprint.findOne({ key, version }).select("_id").lean();
  if (existingVersion) throw new Error("Blueprint versions are immutable. Increase version to save a reviewed change.");
  if (reviewStatus === "approved") {
    if (/sample|replace|placeholder/i.test(key) || /replace with|placeholder|required:/i.test(examination)) throw new Error("Replace the sample blueprint key and exam name before approval.");
    const errors = [candidate.fullTest, ...(candidate.sectionalTests || [])].flatMap((pattern, index) => pattern ? validateBlueprintPattern(pattern).map((message) => `Pattern ${index + 1}: ${message}`) : ["A full and two sectional patterns are required before approval."]);
    if (!candidate.fullTest || !Array.isArray(candidate.sectionalTests) || candidate.sectionalTests.length < 2) errors.push("Approval requires one full pattern and at least two sectional patterns.");
    if (errors.length) throw new Error(`Blueprint cannot be approved: ${errors.join(" ")}`);
  }
  const record = await DailyAiMockBlueprint.findOneAndUpdate(
    { key, version },
    { $set: { ...candidate, reviewedBy: reviewStatus === "approved" ? String(actor).slice(0, 100) : "", reviewedAt: reviewStatus === "approved" ? new Date() : null } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  return record;
};

const getLocalDate = (date, timezone) => new Intl.DateTimeFormat("en-CA", {
  timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit"
}).format(date);

const localHourMinute = (date, timezone) => new Intl.DateTimeFormat("en-GB", {
  timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
}).format(date);

const getDayIndex = (localDate) => {
  const [year, month, day] = localDate.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
};

const selectBlueprint = async (family, dateKey) => {
  const blueprints = await DailyAiMockBlueprint.find({ examFamily: family, reviewStatus: "approved" }).sort({ examination: 1, version: -1 }).lean();
  const latestEffectiveByExam = new Map();
  for (const blueprint of blueprints) {
    if (!latestEffectiveByExam.has(blueprint.examination) && isBlueprintEffectiveForDailySet(blueprint, dateKey)) {
      latestEffectiveByExam.set(blueprint.examination, blueprint);
    }
  }
  const eligible = [...latestEffectiveByExam.values()];
  if (!eligible.length) throw new Error(`No approved ${family} exam blueprint effective on ${dateKey} is available.`);
  const index = getDayIndex(dateKey) % eligible.length;
  return eligible[index];
};

const selectPatterns = (blueprint, dateKey) => {
  const full = blueprint.fullTest;
  const endOfLocalDate = new Date(`${dateKey}T23:59:59.999Z`);
  const sections = (Array.isArray(blueprint.sectionalTests) ? blueprint.sectionalTests : [])
    .filter((pattern) => new Date(pattern.effectiveFrom) <= endOfLocalDate);
  if (!full || sections.length < 2) throw new Error(`Blueprint ${blueprint.key} must define one full and at least two sectional test patterns.`);
  const offset = getDayIndex(dateKey) % sections.length;
  return [
    { type: "full", pattern: full },
    { type: "sectional", pattern: sections[offset] },
    { type: "sectional", pattern: sections[(offset + 1) % sections.length] }
  ];
};

const generatePattern = async ({ blueprint, pattern, type, job }) => {
  const sections = pattern.sections.map((section) => ({ ...(section.toObject?.() || section) }));
  const languages = pattern.supportedLanguages || [];
  const questions = [];
  const errors = [];
  const batchConfig = Number(process.env.DAILY_AI_MOCK_BATCH_SIZE);
  const retryConfig = Number(process.env.DAILY_AI_MOCK_MAX_RETRIES);
  const batchSize = Math.max(1, Math.min(10, Number.isFinite(batchConfig) && batchConfig > 0 ? batchConfig : 5));
  const maxRetries = Math.max(0, Math.min(3, Number.isFinite(retryConfig) ? retryConfig : 2));
  for (const section of sections) {
    const topics = Array.isArray(section.topics) ? section.topics : [];
    for (let offset = 0; offset < Number(section.questionCount); offset += batchSize) {
      const count = Math.min(batchSize, Number(section.questionCount) - offset);
      const result = await runBoundedRetries(async () => {
        const batch = await generateQuestionBatch({
          exam: blueprint.examination,
          tier: pattern.tier,
          section,
          languages,
          topics,
          difficultyDistribution: section.difficultyDistribution,
          topicDistribution: section.topicDistribution,
          sourceReferences: pattern.sourceReferences || [],
          pyqPatternGuidance: pattern.pyqPatternGuidance || blueprint.pyqPatternGuidance || "",
          count,
          existingQuestions: questions.map((item) => item.question)
        });
        const validation = validateGeneratedQuestions({ questions: batch, sections: [{ ...section, questionCount: count }], languages, sourceReferences: pattern.sourceReferences || [], expectedCount: count });
        if (!validation.valid) throw new Error(validation.errors.join("; "));
        const verification = await independentlyVerifyQuestions({ exam: blueprint.examination, questions: validation.questions });
        return { questions: validation.questions, verification };
      }, maxRetries);
      if (result.error) {
        errors.push(`${section.name}, questions ${offset + 1}-${offset + count}: ${result.error.message}`);
        continue;
      }
      questions.push(...result.value.questions);
      job.metrics = { ...(job.metrics || {}), retries: Number(job.metrics?.retries || 0) + result.attempts - 1 };
      job.lockExpiresAt = new Date(Date.now() + 20 * 60_000);
      await job.save();
    }
  }
  const validation = validateGeneratedQuestions({ questions, sections, languages, sourceReferences: pattern.sourceReferences || [], expectedCount: Number(pattern.totalQuestions) });
  errors.push(...validation.errors);
  if (errors.length) throw new Error(errors.join("; "));
  for (let index = 0; index < validation.questions.length; index += 1) {
    for (let priorIndex = 0; priorIndex < index; priorIndex += 1) {
      if (questionSimilarity(validation.questions[index].question, validation.questions[priorIndex].question) >= 0.88) {
        throw new Error(`Questions ${priorIndex + 1} and ${index + 1} are near duplicates within this test.`);
      }
    }
  }
  const recent = await DailyAiMockTest.find({ status: { $in: ["published", "quarantined"] }, createdAt: { $gte: new Date(Date.now() - 45 * 86_400_000) } }).select("questions.question").lean();
  const recentQuestions = recent.flatMap((test) => (test.questions || []).map((question) => question.question));
  for (const question of validation.questions) {
    if (recentQuestions.some((prior) => questionSimilarity(question.question, prior) >= 0.88)) throw new Error(`Question is a near duplicate of a recent generated question: ${question.question.slice(0, 80)}`);
  }
  return { questions: validation.questions, sections, type };
};

const quarantineTest = async ({ blueprint, pattern, type, dateKey, job, reason, questions = [] }) => DailyAiMockTest.create({
  title: `${blueprint.examination} ${type === "full" ? "Full Mock" : `${pattern?.tier || "Sectional"} Mock`} · ${dateKey}`,
  examName: blueprint.examination,
  examFamily: blueprint.examFamily,
  examTier: pattern?.tier || "review required",
  testType: type,
  subject: pattern?.sections?.map((section) => section.subject).join(", ") || "",
  sections: pattern?.sections?.map((section) => ({ name: section.name, questionCount: section.questionCount, marks: section.marks })) || [],
  questions,
  durationMinutes: Number(pattern?.durationMinutes || 1),
  totalQuestions: Number(pattern?.totalQuestions || questions.length),
  totalMarks: Number(pattern?.totalMarks || 1),
  marksPerQuestion: Number(pattern?.marksPerCorrect || 1),
  negativeMarks: Number(pattern?.negativeMarks || 0),
  language: (pattern?.supportedLanguages || []).join(" / "),
  difficulty: "Mixed",
  blueprintId: blueprint._id,
  blueprintVersion: blueprint.version,
  generationDate: dateKey,
  scheduledPublicationDate: new Date(`${dateKey}T00:00:00.000Z`),
  status: "quarantined",
  qualityChecks: { passed: false, errors: [reason] },
  questionFingerprints: questions.map((question) => question.fingerprint).filter(Boolean),
  generatorVersion: `${AGENT_VERSION}:${process.env.DAILY_AI_MOCK_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini"}`,
  retryCount: Number(job.metrics?.retries || 0),
  failureReason: reason,
  jobId: job._id,
  idempotencyKey: `${job.jobKey}:${type}:${pattern?.tier || "unknown"}:${crypto.randomUUID()}`
});

const createValidatedTest = async ({ blueprint, pattern, type, dateKey, job, autoPublish }) => {
  let generated;
  try {
    generated = await generatePattern({ blueprint, pattern, type, job });
  } catch (error) {
    const quarantined = await quarantineTest({ blueprint, pattern, type, dateKey, job, reason: error.message });
    return { test: quarantined, published: false, errors: [error.message] };
  }

  const idempotencyKey = `${job.jobKey}:${type}:${pattern.tier}:${pattern.sections.map((section) => section.name).join("-")}`;
  const test = await DailyAiMockTest.create({
    title: `${blueprint.examination} ${type === "full" ? "Full Mock" : `${pattern.tier} Sectional Mock`} · ${dateKey}`,
    examName: blueprint.examination,
    examFamily: blueprint.examFamily,
    examTier: pattern.tier,
    testType: type,
    subject: type === "sectional" ? pattern.sections.map((section) => section.subject).join(", ") : "",
    sections: generated.sections.map((section) => ({ name: section.name, questionCount: section.questionCount, marks: section.marks })),
    questions: generated.questions,
    durationMinutes: pattern.durationMinutes,
    totalQuestions: pattern.totalQuestions,
    totalMarks: pattern.totalMarks,
    marksPerQuestion: pattern.marksPerCorrect,
    negativeMarks: pattern.negativeMarks,
    language: pattern.supportedLanguages.join(" / "),
    difficulty: "Mixed",
    blueprintId: blueprint._id,
    blueprintVersion: blueprint.version,
    generationDate: dateKey,
    scheduledPublicationDate: new Date(`${dateKey}T00:00:00.000Z`),
    status: "validating",
    qualityChecks: { passed: true, secondAiCallAnswerCheck: true, verifierModel: process.env.DAILY_AI_MOCK_VERIFIER_MODEL || process.env.DAILY_AI_MOCK_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini", blueprintCompliance: true, duplicateCheck: true, sourceDomainAllowlistMatched: true, officialSourceContentFetched: false, publishedAutomatically: autoPublish, humanReviewed: false },
    questionFingerprints: generated.questions.map((question) => question.fingerprint),
    generatorVersion: `${AGENT_VERSION}:${process.env.DAILY_AI_MOCK_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini"}`,
    retryCount: Number(job.metrics?.retries || 0),
    failureReason: autoPublish ? "" : "Automatic publication is disabled; this test needs admin review.",
    jobId: job._id,
    idempotencyKey,
    publishedAt: autoPublish ? new Date() : null
  });

  try {
    await DailyAiMockQuestionFingerprint.insertMany(generated.questions.map((question) => ({ fingerprint: question.fingerprint, testId: test._id, generationDate: dateKey })), { ordered: true });
  } catch (error) {
    await DailyAiMockTest.updateOne({ _id: test._id }, { $set: { status: "quarantined", failureReason: "A concurrent job claimed one or more duplicate question fingerprints.", "qualityChecks.passed": false } });
    await DailyAiMockQuestionFingerprint.deleteMany({ testId: test._id });
    return { test: { ...test.toObject(), status: "quarantined" }, published: false, errors: ["A concurrent job claimed duplicate question fingerprints."] };
  }
  const finalTest = await DailyAiMockTest.findByIdAndUpdate(test._id, {
    $set: {
      status: autoPublish ? "published" : "quarantined",
      publishedAt: autoPublish ? new Date() : null,
      failureReason: autoPublish ? "" : "Automatic publication is disabled; this test needs admin review."
    }
  }, { new: true });
  return { test: finalTest, published: autoPublish, errors: autoPublish ? [] : ["Admin review required before publication."] };
};

const validateRuntimeConfiguration = async (settings) => {
  if (!settings.enabled) throw new Error("Daily AI Mock automation is paused in admin settings.");
  if (process.env.DAILY_AI_MOCK_ENABLED !== "true") throw new Error("DAILY_AI_MOCK_ENABLED=true is required on the persistent backend before the scheduler can run.");
  if (!isDatabaseConnected()) throw new Error("MongoDB is required; daily tests cannot use local file persistence.");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
};

export const runDailyAiMockJob = async ({ date, dateKeyOverride = "", manual = false } = {}) => {
  if (!isDatabaseConnected()) throw new Error("MongoDB is required for idempotent Daily AI Mock jobs.");
  const settings = await getDailyAiMockSettings();
  await validateRuntimeConfiguration(settings);
  const now = date || new Date();
  const dateKey = dateKeyOverride || getLocalDate(now, settings.timezone || "Asia/Kolkata");
  const jobKey = `daily-ai-mock:${dateKey}`;
  let job;
  try {
    job = await DailyAiMockJob.findOneAndUpdate(
      { jobKey },
      { $setOnInsert: { jobKey, localDate: dateKey, timezone: settings.timezone || "Asia/Kolkata", status: "queued" } },
      { new: true, upsert: true }
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    job = await DailyAiMockJob.findOne({ jobKey });
    if (!job) throw error;
  }
  if (job.status === "completed") return { job, reused: true };
  const runLockOwner = `${process.env.HOSTNAME || "backend"}:${process.pid}:${crypto.randomUUID()}`;
  const acquired = await DailyAiMockJob.findOneAndUpdate(
    { _id: job._id, status: { $ne: "completed" }, $or: [{ lockExpiresAt: null }, { lockExpiresAt: { $lt: new Date() } }] },
    { $set: { lockOwner: runLockOwner, lockExpiresAt: new Date(Date.now() + 20 * 60_000), status: "generating", startedAt: new Date(), failureReason: "" } },
    { new: true }
  );
  if (!acquired) throw new Error("A generation job for this date is already running.");
  job = acquired;
  try {
    const rotation = settings.examRotation?.length ? settings.examRotation : defaultDailyAiMockSettings().examRotation;
    const family = rotation[getDayIndex(dateKey) % rotation.length];
    const blueprint = await selectBlueprint(family, dateKey);
    const patterns = selectPatterns(blueprint, dateKey);
    const existing = await DailyAiMockTest.countDocuments({ generationDate: dateKey });
    if (existing > 0) {
      await DailyAiMockTest.updateMany({ generationDate: dateKey, status: { $in: ["queued", "generating", "validating"] } }, { $set: { status: "quarantined", failureReason: "Generation was interrupted before a final status was recorded.", "qualityChecks.passed": false } });
      const previous = await DailyAiMockTest.find({ generationDate: dateKey }).select("_id status").lean();
      job.status = previous.length === 3 && previous.every((item) => item.status === "published") ? "completed" : "quarantined";
      job.testIds = previous.map((item) => item._id);
      job.failureReason = "Existing daily records prevent a duplicate run; inspect prior job before retrying.";
      job.completedAt = new Date();
      job.lockExpiresAt = null;
      await job.save();
      return { job, reused: true };
    }
    const results = [];
    const autoPublish = settings.autoPublish === true;
    for (const [index, item] of patterns.entries()) {
      const result = await createValidatedTest({ blueprint, pattern: item.pattern, type: item.type, dateKey, job, autoPublish });
      results.push(result);
      job.metrics = { ...(job.metrics || {}), generated: results.length, published: results.filter((row) => row.published).length, quarantined: results.filter((row) => !row.published).length, lastTestIndex: index };
      await job.save();
    }
    job.testIds = results.map((row) => row.test._id);
    job.status = results.length === 3 && results.every((row) => row.published) ? "completed" : "quarantined";
    job.failureReason = results.flatMap((row) => row.errors).join(" | ").slice(0, 1500);
    job.completedAt = new Date();
    job.lockExpiresAt = null;
    await job.save();
    if (!manual) await DailyAiMockSettings.updateOne({ key: SETTINGS_KEY }, { $set: { lastScheduledDate: dateKey } });
    return { job, results };
  } catch (error) {
    job.status = "failed";
    job.failureReason = String(error.message || "Daily generation failed.").slice(0, 1500);
    job.completedAt = new Date();
    job.lockExpiresAt = null;
    await job.save();
    throw error;
  }
};

export const runDailyAiMockScheduleCheck = async (now = new Date()) => {
  if (!isDatabaseConnected() || process.env.DAILY_AI_MOCK_ENABLED !== "true") return { skipped: true, reason: "scheduler disabled or MongoDB unavailable" };
  const settings = await getDailyAiMockSettings();
  if (!settings.enabled) return { skipped: true, reason: "admin setting disabled" };
  const timezone = settings.timezone || "Asia/Kolkata";
  const localDate = getLocalDate(now, timezone);
  if (localHourMinute(now, timezone) < settings.generationTime) return { skipped: true, reason: "scheduled time has not arrived" };
  if (settings.lastScheduledDate === localDate) return { skipped: true, reason: "today already processed" };
  const previous = await DailyAiMockJob.findOne({ jobKey: `daily-ai-mock:${localDate}`, status: { $in: ["completed", "quarantined", "failed"] } });
  if (previous) {
    await DailyAiMockSettings.updateOne({ key: SETTINGS_KEY }, { $set: { lastScheduledDate: localDate } });
    return { skipped: true, reason: "job already has a final result" };
  }
  return runDailyAiMockJob({ date: now });
};

export const listPublicDailyAiMockTests = async ({ family, limit = 30 } = {}) => {
  if (!isDatabaseConnected()) return [];
  const query = { status: "published", scheduledPublicationDate: { $lte: new Date() } };
  if (family && ["SSC", "Railway", "Banking", "Police"].includes(family)) query.examFamily = family;
  const parsedLimit = Number(limit);
  const safeLimit = Math.min(50, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 30));
  const tests = await DailyAiMockTest.find(query).sort({ generationDate: -1, createdAt: -1 }).limit(safeLimit).lean();
  return tests.map(({ _id, title, examName, examFamily, examTier, testType, subject, sections, questions, durationMinutes, totalQuestions, totalMarks, marksPerQuestion, negativeMarks, language, difficulty, generationDate, blueprintVersion, createdAt }) => ({
    id: String(_id), _id: String(_id), title, examName, examFamily, examTier, testType,
    testRankType: testType === "full" ? "Full-Length Tests" : "Sectional Tests",
    subject, sections, questionCount: totalQuestions, questions: totalQuestions,
    durationMinutes, duration: `${durationMinutes} min`, totalMarks, marks: totalMarks,
    marksPerQuestion, negativeMarks, language, difficulty, generationDate, blueprintVersion,
    status: "published", accessType: "Free", source: "Daily AI Mock", createdAt,
    href: `/test/${String(_id)}`
  }));
};

export const getDailyAiMockAdminDashboard = async () => {
  const settings = await getDailyAiMockSettings();
  const [blueprints, jobs, counts, tests] = await Promise.all([
    isDatabaseConnected() ? DailyAiMockBlueprint.find({}).sort({ examFamily: 1, examination: 1, version: -1 }).lean() : [],
    isDatabaseConnected() ? DailyAiMockJob.find({}).sort({ createdAt: -1 }).limit(20).lean() : [],
    isDatabaseConnected() ? DailyAiMockTest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]) : [],
    isDatabaseConnected() ? DailyAiMockTest.find({}).sort({ createdAt: -1 }).limit(20).select("title examName examFamily testType status qualityChecks failureReason generationDate blueprintVersion createdAt").lean() : []
  ]);
  const today = getLocalDate(new Date(), settings.timezone || "Asia/Kolkata");
  return {
    settings,
    schedulerRuntimeEnabled: process.env.DAILY_AI_MOCK_ENABLED === "true",
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
    databaseConnected: isDatabaseConnected(),
    nextScheduledRun: settings.enabled && process.env.DAILY_AI_MOCK_ENABLED === "true" ? `${today} ${settings.generationTime} ${settings.timezone}` : null,
    blueprints: blueprints.map((item) => ({ ...item, id: String(item._id), _id: String(item._id) })),
    jobs,
    tests: tests.map((item) => ({ ...item, id: String(item._id), _id: String(item._id) })),
    counts: Object.fromEntries(counts.map((item) => [item._id, item.count]))
  };
};

export const getAdminDailyAiMockTest = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return DailyAiMockTest.findById(id).lean();
};
