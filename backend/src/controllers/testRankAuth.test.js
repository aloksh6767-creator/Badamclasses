import test from "node:test";
import assert from "node:assert/strict";
import testRankRoutes from "../routes/testRankRoutes.js";
import automationRoutes from "../routes/automationRoutes.js";
import { pdfMockSummary } from "./automationController.js";
import { finalizeAttempt, toPublicTestSummary } from "./testRankController.js";
import { optionalProtect, protect, requireStudentSession } from "../middleware/authMiddleware.js";

test("public online test details contain metadata but no question prompts or options", () => {
  const summary = toPublicTestSummary({
    _id: "test-1",
    title: "SSC mock",
    questions: [{ question: "Secret question text", options: ["A", "B"], answer: 1 }]
  });
  assert.equal(summary.questionCount, 1);
  assert.equal(Object.hasOwn(summary, "questions"), false);
  assert.equal(JSON.stringify(summary).includes("Secret question text"), false);
});

test("public PDF mock summaries omit questions and answer keys", () => {
  const summary = pdfMockSummary({
    id: "pdf-1",
    title: "Practice PDF",
    questions: [{ question: "Private prompt", options: ["A", "B"], answer: 1, subject: "Math", chapter: "Arithmetic" }]
  });
  assert.equal(summary.questionCount, 1);
  assert.equal(summary.chapterCounts[0].chapter, "Arithmetic");
  assert.equal(Object.hasOwn(summary, "questions"), false);
  assert.equal(JSON.stringify(summary).includes("Private prompt"), false);
});

test("guest attempt creation is limited to its own AI mock, while shared history remains protected", () => {
  const startRoute = testRankRoutes.stack.find((layer) => layer.route?.path === "/tests/:testId/attempts" && layer.route.methods.post)?.route;
  assert.ok(startRoute, "POST /tests/:testId/attempts is registered");
  assert.equal(startRoute.stack[0].handle, optionalProtect);
  assert.equal(startRoute.stack[1].handle, requireStudentSession);
  assert.equal(startRoute.stack[2].handle.name, "requireOwnedAiMockForGuest");

  const historyRoute = testRankRoutes.stack.find((layer) => layer.route?.path === "/attempts" && layer.route.methods.get)?.route;
  assert.ok(historyRoute, "GET /attempts is registered");
  assert.equal(historyRoute.stack[0].handle, protect, "shared attempt history stays authenticated");

  for (const [method, path] of [["get", "/attempts/:attemptId"], ["put", "/attempts/:attemptId/answers"], ["post", "/attempts/:attemptId/submit"]]) {
    const route = testRankRoutes.stack.find((layer) => layer.route?.path === path && layer.route.methods[method])?.route;
    assert.ok(route, `${method.toUpperCase()} ${path} is registered`);
    assert.equal(route.stack[0].handle, optionalProtect);
    assert.equal(route.stack[1].handle, requireStudentSession);
    assert.equal(route.stack[2].handle.name, "requireOwnedAiAttemptForGuest", "guest access is followed by an owner-scoped check");
  }
});

test("PDF question payload endpoint is protected while public listing uses sanitized metadata", () => {
  const studentRoute = automationRoutes.stack.find((layer) => layer.route?.path === "/student-pdf-mocks")?.route;
  assert.ok(studentRoute);
  assert.equal(studentRoute.stack[0].handle, protect);
  const publicRoute = automationRoutes.stack.find((layer) => layer.route?.path === "/public-pdf-mocks")?.route;
  assert.ok(publicRoute);
  assert.equal(publicRoute.stack.some((layer) => layer.handle === protect), false);
});

test("protected test APIs return 401 without a bearer token", async () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  let nextCalled = false;
  await protect({ headers: {} }, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("repeating finalization does not duplicate or replace a submitted result", async () => {
  const attempt = {
    _id: "attempt-1",
    status: "in_progress",
    questions: [{ options: ["A", "B"], answer: 1 }],
    answers: { 0: 1 },
    startedAt: new Date("2026-10-24T00:00:00Z"),
    deadlineAt: new Date("2026-10-24T01:00:00Z"),
    durationSeconds: 3600,
    marksPerQuestion: 1,
    negativeMarks: 0.25,
    saveCount: 0,
    async save() { this.saveCount += 1; return this; }
  };
  const submittedAt = new Date("2026-10-24T00:10:00Z");
  const first = await finalizeAttempt(attempt, submittedAt);
  const second = await finalizeAttempt(attempt, new Date("2026-10-24T00:11:00Z"));
  assert.equal(attempt.saveCount, 1);
  assert.equal(first.result.score, 1);
  assert.equal(second.submittedAt.getTime(), submittedAt.getTime());
});
