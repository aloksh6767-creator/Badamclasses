import DailyAiMockJob from "../models/DailyAiMockJob.js";
import DailyAiMockTest from "../models/DailyAiMockTest.js";
import { isDatabaseConnected } from "../config/db.js";
import { canPublishValidatedTest } from "../utils/dailyAiMockService.js";
import {
  getAdminDailyAiMockTest,
  getDailyAiMockAdminDashboard as buildDailyAiMockAdminDashboard,
  listPublicDailyAiMockTests,
  runDailyAiMockJob,
  updateDailyAiMockSettings,
  upsertDailyAiMockBlueprint
} from "../utils/dailyAiMockAgent.js";

const actorFor = (user) => user?.email || user?.name || "admin";

export const getPublicDailyAiMockTests = async (req, res) => {
  const tests = await listPublicDailyAiMockTests({ family: String(req.query?.family || ""), limit: req.query?.limit });
  return res.json({ success: true, tests });
};

export const getDailyAiMockAdminDashboard = async (_req, res) => {
  if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "MongoDB is required for durable Daily AI Mock controls." });
  return res.json({ success: true, dashboard: await buildDailyAiMockAdminDashboard() });
};

export const patchDailyAiMockSettings = async (req, res) => {
  try {
    const settings = await updateDailyAiMockSettings(req.body || {}, actorFor(req.user));
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const saveDailyAiMockBlueprint = async (req, res) => {
  try {
    const blueprint = await upsertDailyAiMockBlueprint(req.body || {}, actorFor(req.user));
    return res.json({ success: true, blueprint });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const runDailyAiMockManually = async (req, res) => {
  try {
    const result = await runDailyAiMockJob({ manual: true });
    return res.status(202).json({ success: true, job: result.job, results: result.results || [], reused: Boolean(result.reused) });
  } catch (error) {
    const status = /already running/i.test(error.message) ? 409 : /disabled|required|MongoDB|blueprint|OPENAI/i.test(error.message) ? 503 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const retryDailyAiMockJob = async (req, res) => {
  if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "MongoDB is required." });
  if (!/^[a-f\d]{24}$/i.test(req.params.jobId)) return res.status(400).json({ success: false, message: "Invalid Daily AI Mock job id." });
  const job = await DailyAiMockJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, message: "Job not found." });
  if (job.status !== "failed") return res.status(409).json({ success: false, message: "Only failed jobs can be retried. Quarantined tests must be reviewed and repaired first." });
  const existingTests = await DailyAiMockTest.countDocuments({ jobId: job._id });
  if (existingTests) return res.status(409).json({ success: false, message: "This job already has persisted test records. They were preserved; review them instead of retrying the whole job." });
  const now = new Date();
  const claimedJob = await DailyAiMockJob.findOneAndUpdate(
    { _id: job._id, status: "failed", $or: [{ lockExpiresAt: null }, { lockExpiresAt: { $lte: now } }] },
    { $set: { status: "queued", testIds: [], failureReason: "", completedAt: null }, $inc: { "metrics.retries": 1, "metrics.adminRetries": 1 } },
    { new: true }
  );
  if (!claimedJob) return res.status(409).json({ success: false, message: "Job status changed or its lock is still active. Refresh and inspect job status." });
  try {
    const result = await runDailyAiMockJob({ dateKeyOverride: claimedJob.localDate, manual: true });
    return res.status(202).json({ success: true, job: result.job, results: result.results || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDailyAiMockAdminPreview = async (req, res) => {
  if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "MongoDB is required." });
  const test = await getAdminDailyAiMockTest(req.params.testId);
  if (!test) return res.status(404).json({ success: false, message: "Daily AI Mock test not found." });
  return res.json({ success: true, test });
};

export const archiveDailyAiMockTest = async (req, res) => {
  if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "MongoDB is required." });
  if (!/^[a-f\d]{24}$/i.test(req.params.testId)) return res.status(400).json({ success: false, message: "Invalid Daily AI Mock test id." });
  const test = await DailyAiMockTest.findByIdAndUpdate(req.params.testId, { $set: { status: "archived" } }, { new: true });
  if (!test) return res.status(404).json({ success: false, message: "Daily AI Mock test not found." });
  return res.json({ success: true, id: String(test._id), status: test.status });
};

export const publishReviewedDailyAiMockTest = async (req, res) => {
  if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "MongoDB is required." });
  if (!/^[a-f\d]{24}$/i.test(req.params.testId)) return res.status(400).json({ success: false, message: "Invalid Daily AI Mock test id." });
  const test = await DailyAiMockTest.findById(req.params.testId);
  if (!test) return res.status(404).json({ success: false, message: "Daily AI Mock test not found." });
  if (!canPublishValidatedTest(test)) return res.status(409).json({ success: false, message: "This test did not pass every automatic quality check and cannot be published." });
  test.status = "published";
  test.failureReason = "";
  test.qualityChecks = { ...(test.qualityChecks || {}), adminReviewed: true, reviewedBy: actorFor(req.user), reviewedAt: new Date() };
  test.publishedAt = new Date();
  await test.save();
  return res.json({ success: true, id: String(test._id), status: test.status });
};
