import test from "node:test";
import assert from "node:assert/strict";
import { calculateObjectiveResult, calculateRankStats } from "./testScoring.js";

const questions = [{ answer: 1 }, { answer: 0 }, { answer: 2 }, { answer: 1 }];

test("scores correct, incorrect and unanswered answers on the server", () => {
  const result = calculateObjectiveResult({ questions, answers: { 0: 1, 1: 2, 2: 2 }, marksPerQuestion: 2, negativeMarks: 0.5, timeTakenSeconds: 91 });
  assert.deepEqual(result, { score: 3.5, maxMarks: 8, correct: 2, incorrect: 1, unanswered: 1, accuracy: 66.67, timeTakenSeconds: 91 });
});

test("does not go below zero when penalties exceed correct marks", () => {
  const result = calculateObjectiveResult({ questions: [{ answer: 0 }], answers: { 0: 1 }, marksPerQuestion: 1, negativeMarks: 2 });
  assert.equal(result.score, -2);
  assert.equal(result.accuracy, 0);
});

test("handles empty tests and clamps invalid negative time", () => {
  const result = calculateObjectiveResult({ questions: [], timeTakenSeconds: -5 });
  assert.deepEqual(result, { score: 0, maxMarks: 0, correct: 0, incorrect: 0, unanswered: 0, accuracy: 0, timeTakenSeconds: 0 });
});

test("assigns equal ranks to tied scores and computes a real percentile", () => {
  const scores = [20, 15, 15, 10];
  assert.deepEqual(calculateRankStats(scores, 15), { rank: 2, percentile: 50, participantCount: 4 });
  assert.deepEqual(calculateRankStats(scores, 20), { rank: 1, percentile: 87.5, participantCount: 4 });
});

test("does not report a percentile without submitted participants", () => {
  assert.deepEqual(calculateRankStats([], 0), { rank: 1, percentile: null, participantCount: 0 });
});
