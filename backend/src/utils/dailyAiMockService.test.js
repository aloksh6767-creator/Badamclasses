import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeQuestionText,
  buildPatternGuidance,
  canPublishValidatedTest,
  questionFingerprint,
  questionSimilarity,
  runBoundedRetries,
  validateBlueprintPattern,
  validateGeneratedQuestions
} from "./dailyAiMockService.js";
import { cleanPublicTestQuestion, toPublicTestSummary } from "../controllers/testRankController.js";
import { calculateObjectiveResult } from "./testScoring.js";
import DailyAiMockJob from "../models/DailyAiMockJob.js";
import DailyAiMockTest from "../models/DailyAiMockTest.js";
import DailyAiMockSettings from "../models/DailyAiMockSettings.js";
import StudentAiMockTest from "../models/StudentAiMockTest.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { defaultDailyAiMockSettings, isBlueprintEffectiveForDailySet } from "./dailyAiMockAgent.js";
import { isStatementBasedQuestion, normalizeStudentAiMockRequest, studentAiExamGroups } from "./studentAiMockService.js";

const section = {
  name: "Quantitative Aptitude",
  subject: "Math",
  questionCount: 1,
  marks: 2,
  topics: ["Arithmetic", "Multiplication"],
  topicDistribution: [{ topic: "Multiplication", percentage: 100 }],
  difficultyDistribution: { easy: 30, medium: 50, hard: 20 }
};

const validQuestion = {
  question: "What is 3 * 4?",
  options: ["10", "12", "14", "16"],
  answer: 1,
  explanation: "Multiply 3 by 4 to get 12.",
  subject: "Math",
  section: "Quantitative Aptitude",
  topic: "Multiplication",
  difficulty: "easy",
  language: "English",
  sourceReference: "https://ssc.gov.in/"
};

test("question normalization and fingerprint ignore punctuation and spacing", () => {
  assert.equal(normalizeQuestionText("  What is 3 * 4? "), "what is 3 4");
  assert.equal(questionFingerprint("Same question!"), questionFingerprint("same   question"));
  assert.ok(questionSimilarity("What is 20 percent of 80?", "Find 20% of 80" ) > 0.35);
});

test("blueprint validator checks count, marks, references and distribution", () => {
  const pattern = {
    tier: "Tier I", sections: [section], totalQuestions: 1, totalMarks: 2, durationMinutes: 1, sectionTimingRules: "Single section timer",
    marksPerCorrect: 2, negativeMarks: 0.5, supportedLanguages: ["English"],
    effectiveFrom: "2026-01-01", sourceReferences: ["https://ssc.gov.in/"]
  };
  assert.deepEqual(validateBlueprintPattern(pattern), []);
  assert.ok(validateBlueprintPattern({ ...pattern, pyqPatternGuidance: "x".repeat(1001) }).some((error) => error.includes("pyqPatternGuidance")));
  assert.ok(validateBlueprintPattern({ ...pattern, totalQuestions: 2 }).some((error) => error.includes("question counts")));
  assert.ok(validateBlueprintPattern({ ...pattern, sourceReferences: ["http://example.com"] }).some((error) => error.includes("HTTPS")));
  assert.ok(validateBlueprintPattern({ ...pattern, sections: [{ ...section, topics: ["Replace with approved syllabus topics"] }] }).some((error) => error.includes("placeholders")));
  assert.ok(validateBlueprintPattern({ ...pattern, sections: [{ ...section, topicDistribution: [{ topic: "Not configured", percentage: 100 }] }] }).some((error) => error.includes("configured topics")));
  assert.ok(validateBlueprintPattern({ ...pattern, sections: [null] }).some((error) => error.includes("valid sections")));
});

test("PYQ pattern guidance stays stage-specific and prohibits copying questions", () => {
  const guidance = buildPatternGuidance({ exam: "RRB NTPC", tier: "CBT-1", section, pyqPatternGuidance: "Prioritize common ratio and speed question formats." });
  assert.equal(guidance.exam, "RRB NTPC");
  assert.equal(guidance.stage, "CBT-1");
  assert.match(guidance.instructions, /Never reproduce or claim an original PYQ/);
  assert.equal(guidance.patternNotes, "Prioritize common ratio and speed question formats.");
});

test("student AI mock request accepts only configured exams, subjects, languages, modes and limits", () => {
  const request = normalizeStudentAiMockRequest({ examFamily: "Railway", examName: "RRB NTPC", subject: "Mathematics", topic: "Ratio", language: "Hindi", difficulty: "mixed", testType: "topic", questionCount: 10, durationMinutes: 15 });
  assert.equal(request.examName, "RRB NTPC");
  assert.equal(request.questionStyle, "mixed");
  assert.equal(Object.hasOwn(studentAiExamGroups.Railway, "exams"), true);
  const statementMock = normalizeStudentAiMockRequest({ examFamily: "Banking", examName: "IBPS PO", subject: "Reasoning Ability", topic: "Syllogism", language: "English", difficulty: "mixed", testType: "topic", questionStyle: "statement", questionCount: 10, durationMinutes: 15 });
  assert.equal(statementMock.questionStyle, "statement");
  assert.equal(isStatementBasedQuestion("Consider the following statements: Statement I: 2 is even. Statement II: 3 is odd. Which statements are correct?"), true);
  assert.equal(isStatementBasedQuestion("What is 2 + 2?"), false);
  const fullMock = normalizeStudentAiMockRequest({ examFamily: "SSC", examName: "SSC CGL", subject: "", topic: "", language: "Hindi", difficulty: "mixed", testType: "full", questionCount: 100, durationMinutes: 180 });
  assert.equal(fullMock.questionCount, 100);
  assert.equal(fullMock.durationMinutes, 180);
  assert.equal(studentAiExamGroups.Police.exams.includes("UP Police SI"), true);
  assert.throws(() => normalizeStudentAiMockRequest({ examFamily: "SSC", examName: "SSC CGL", subject: "Quantitative Aptitude", topic: "Ratio", language: "Hindi", difficulty: "easy", testType: "topic", questionStyle: "not-supported", questionCount: 10, durationMinutes: 15 }), /question style/);
  assert.throws(() => normalizeStudentAiMockRequest({ examFamily: "SSC", examName: "Fake exam", subject: "Quantitative Aptitude", topic: "Ratio", language: "Hindi", difficulty: "easy", testType: "topic", questionCount: 10, durationMinutes: 15 }), /supported list/);
  assert.throws(() => normalizeStudentAiMockRequest({ examFamily: "SSC", examName: "SSC CGL", subject: "Quantitative Aptitude", topic: "Ratio", language: "French", difficulty: "easy", testType: "topic", questionCount: 10, durationMinutes: 15 }), /Hindi or English/);
  assert.throws(() => normalizeStudentAiMockRequest({ examFamily: "SSC", examName: "SSC CGL", subject: "Quantitative Aptitude", topic: "Ratio", language: "Hindi", difficulty: "easy", testType: "topic", questionCount: 100, durationMinutes: 15 }), /between 5 and/);
});

test("custom AI practice can validate without inventing source citations", () => {
  const customQuestion = { ...validQuestion, sourceReference: "" };
  const result = validateGeneratedQuestions({ questions: [customQuestion], sections: [section], languages: ["English"], sourceReferences: [], expectedCount: 1, requireSourceReference: false });
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("generated MCQ passes strict fields and deterministic calculation check", () => {
  const result = validateGeneratedQuestions({ questions: [validQuestion], sections: [section], languages: ["English"], sourceReferences: ["https://ssc.gov.in/"], expectedCount: 1 });
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.equal(result.questions[0].answer, 1);
  const wrongAnswer = validateGeneratedQuestions({ questions: [{ ...validQuestion, answer: 0 }], sections: [section], languages: ["English"], sourceReferences: ["https://ssc.gov.in/"], expectedCount: 1 });
  assert.equal(wrongAnswer.valid, false);
  assert.ok(wrongAnswer.errors.some((error) => error.includes("calculation does not match")));
  const unapprovedCitation = validateGeneratedQuestions({ questions: [{ ...validQuestion, sourceReference: "https://example.org/source" }], sections: [section], languages: ["English"], sourceReferences: ["https://ssc.gov.in/"], expectedCount: 1 });
  assert.ok(unapprovedCitation.errors.some((error) => error.includes("approved source domains")));
  const wrongSubject = validateGeneratedQuestions({ questions: [{ ...validQuestion, subject: "History" }], sections: [section], languages: ["English"], sourceReferences: ["https://ssc.gov.in/"], expectedCount: 1 });
  assert.ok(wrongSubject.errors.some((error) => error.includes("configured section subject")));
  const wrongTopic = validateGeneratedQuestions({ questions: [{ ...validQuestion, topic: "Geometry" }], sections: [section], languages: ["English"], sourceReferences: ["https://ssc.gov.in/"], expectedCount: 1 });
  assert.ok(wrongTopic.errors.some((error) => error.includes("configured syllabus topic")));
});

test("quality gate rejects malformed options, missing citations and duplicate items", () => {
  const invalid = validateGeneratedQuestions({
    questions: [{ ...validQuestion, options: ["12", "12", "14", "16"], sourceReference: "" }, { ...validQuestion }],
    sections: [{ ...section, questionCount: 2 }], languages: ["English"], sourceReferences: ["https://ssc.gov.in/"], expectedCount: 2
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.includes("four distinct")));
  assert.ok(invalid.errors.some((error) => error.includes("HTTPS source")));
  assert.ok(invalid.errors.some((error) => error.includes("Duplicate question")));
});

test("retry loop stops after configured bounded attempts", async () => {
  let calls = 0;
  const failed = await runBoundedRetries(async () => { calls += 1; throw new Error("invalid batch"); }, 2);
  assert.equal(calls, 3);
  assert.equal(failed.attempts, 3);
  assert.match(failed.error.message, /invalid batch/);
  const success = await runBoundedRetries(async (attempt) => { if (attempt < 1) throw new Error("try again"); return "valid"; }, 2);
  assert.equal(success.value, "valid");
  assert.equal(success.attempts, 2);
});

test("public test question payload omits the correct answer and explanation", () => {
  assert.deepEqual(cleanPublicTestQuestion({ question: "Q?", options: ["A", "B"], answer: 1, explanation: "Because" }), { question: "Q?", options: ["A", "B"] });
});

test("student AI mock details are owner-only and expose no answer key before an attempt", () => {
  assert.equal(StudentAiMockTest.schema.path("ownerId").isRequired, true);
  const detail = toPublicTestSummary({ _id: "mock-id", ownerId: "student-id", title: "Custom mock", examName: "SSC CGL", questions: [{ question: "Q?", options: ["A", "B"], answer: 0, explanation: "Because" }] });
  assert.equal(detail.isAiGenerated, true);
  assert.match(detail.practiceLabel, /not an official-pattern test/);
  assert.equal(detail.questionCount, 1);
  assert.equal(Object.hasOwn(detail, "questions"), false);
});

test("publication requires a complete passing quality gate", () => {
  const testRecord = { status: "quarantined", qualityChecks: { passed: true }, totalQuestions: 1, questions: [{ validationStatus: "passed" }] };
  assert.equal(canPublishValidatedTest(testRecord), true);
  assert.equal(canPublishValidatedTest({ ...testRecord, questions: [] }), false);
  assert.equal(canPublishValidatedTest({ ...testRecord, qualityChecks: { passed: false } }), false);
  assert.equal(canPublishValidatedTest({ ...testRecord, status: "failed" }), false);
});

test("Mongo schemas declare unique daily idempotency keys", () => {
  const jobKeyIndex = DailyAiMockJob.schema.indexes().find(([keys]) => keys.jobKey === 1);
  const testKeyIndex = DailyAiMockTest.schema.indexes().find(([keys]) => keys.idempotencyKey === 1);
  assert.equal(jobKeyIndex?.[1]?.unique, true);
  assert.equal(testKeyIndex?.[1]?.unique, true);
});

test("daily settings default disabled and require effective full plus two sectional patterns", () => {
  assert.equal(defaultDailyAiMockSettings().enabled, false);
  assert.equal(defaultDailyAiMockSettings().autoPublish, false);
  const pattern = { effectiveFrom: "2026-01-01" };
  assert.equal(isBlueprintEffectiveForDailySet({ fullTest: pattern, sectionalTests: [pattern, pattern] }, "2026-10-23"), true);
  assert.equal(isBlueprintEffectiveForDailySet({ fullTest: pattern, sectionalTests: [pattern] }, "2026-10-23"), false);
  assert.equal(isBlueprintEffectiveForDailySet({ fullTest: { effectiveFrom: "2027-01-01" }, sectionalTests: [pattern, pattern] }, "2026-10-23"), false);
  assert.equal(DailyAiMockSettings.schema.path("autoPublish").defaultValue, false);
});

test("admin middleware rejects anonymous and student requests", async () => {
  const response = { code: 200, message: "", status(code) { this.code = code; return this; }, json(body) { this.message = body.message; return this; } };
  let nextCalled = false;
  await protect({ headers: {} }, response, () => { nextCalled = true; });
  assert.equal(response.code, 401);
  assert.equal(nextCalled, false);
  const adminResponse = { ...response, code: 200, status(responseCode) { this.code = responseCode; return this; }, json(body) { this.message = body.message; } };
  adminOnly({ user: { role: "student" } }, adminResponse, () => { nextCalled = true; });
  assert.equal(adminResponse.code, 403);
  assert.equal(nextCalled, false);
});

test("existing objective scoring applies negative marks and leaves skipped answers unanswered", () => {
  const result = calculateObjectiveResult({ questions: [
    { options: ["a", "b"], answer: 0 }, { options: ["a", "b"], answer: 1 }, { options: ["a", "b"], answer: 1 }
  ], answers: { 0: 0, 1: 0 }, marksPerQuestion: 2, negativeMarks: 0.5, timeTakenSeconds: 50 });
  assert.equal(result.correct, 1);
  assert.equal(result.incorrect, 1);
  assert.equal(result.unanswered, 1);
  assert.equal(result.score, 1.5);
});
