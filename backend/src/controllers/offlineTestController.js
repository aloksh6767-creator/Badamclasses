import OfflineTestRegistration from "../models/OfflineTestRegistration.js";
import { isDatabaseConnected } from "../config/db.js";
import {
  createLocalOfflineTest,
  listLocalOfflineTests,
  updateLocalOfflineTest
} from "../utils/localPersistence.js";
import { sendOfflineTestResultSms } from "../utils/smsNotifier.js";

const normalizeText = (value = "") => String(value || "").trim();
const normalizePhone = (value = "") => String(value || "").replace(/\D+/g, "").slice(-10);

const buildRollNumber = (examName = "", phone = "") => {
  const prefix = normalizeText(examName).replace(/[^A-Za-z0-9]+/g, "").toUpperCase().slice(0, 4) || "OFF";
  const suffix = normalizePhone(phone).slice(-4) || String(Date.now()).slice(-4);
  return `${prefix}-${suffix}-${String(Date.now()).slice(-4)}`;
};

const normalizeRecord = (record) => {
  if (!record) return null;
  const marksObtained = record.marksObtained ?? null;
  const totalMarks = record.totalMarks ?? null;
  const percentage =
    typeof marksObtained === "number" && typeof totalMarks === "number" && totalMarks > 0
      ? Number(((marksObtained / totalMarks) * 100).toFixed(2))
      : null;

  return {
    _id: String(record._id),
    rollNumber: record.rollNumber || "",
    studentName: record.studentName || "",
    phone: record.phone || "",
    email: record.email || "",
    examName: record.examName || "",
    batchName: record.batchName || "",
    testDate: record.testDate || "",
    center: record.center || "",
    notes: record.notes || "",
    status: record.status || "registered",
    marksObtained,
    totalMarks,
    rank: record.rank || "",
    resultNotes: record.resultNotes || "",
    percentage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
};

const sortByCreatedAtDesc = (items = []) =>
  [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

export const registerOfflineTest = async (req, res) => {
  const studentName = normalizeText(req.body?.studentName);
  const phone = normalizePhone(req.body?.phone);
  const examName = normalizeText(req.body?.examName);

  if (!studentName || phone.length < 10 || !examName) {
    return res.status(400).json({ message: "Student name, valid phone number, and exam name are required." });
  }

  const payload = {
    studentName,
    phone,
    email: normalizeText(req.body?.email),
    examName,
    batchName: normalizeText(req.body?.batchName),
    testDate: normalizeText(req.body?.testDate),
    center: normalizeText(req.body?.center),
    notes: normalizeText(req.body?.notes),
    rollNumber: buildRollNumber(examName, phone),
    status: "registered"
  };

  const record = isDatabaseConnected()
    ? await OfflineTestRegistration.create(payload)
    : createLocalOfflineTest(payload);

  res.status(201).json({
    message: "Offline test registration saved successfully.",
    registration: normalizeRecord(record)
  });
};

export const listPublishedOfflineTests = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query?.limit || 6), 1), 20);
  const records = isDatabaseConnected()
    ? await OfflineTestRegistration.find({ status: "results_published" }).sort({ updatedAt: -1 }).limit(limit)
    : sortByCreatedAtDesc(listLocalOfflineTests().filter((item) => item.status === "results_published")).slice(0, limit);

  res.json(records.map(normalizeRecord));
};

export const lookupOfflineTestResults = async (req, res) => {
  const query = normalizeText(req.query?.query);
  if (!query) {
    return res.status(400).json({ message: "Phone number or roll number is required." });
  }

  const phoneQuery = normalizePhone(query);
  const rollQuery = query.toLowerCase();

  const records = isDatabaseConnected()
    ? await OfflineTestRegistration.find({
        $or: [{ rollNumber: new RegExp(`^${rollQuery}$`, "i") }, ...(phoneQuery ? [{ phone: phoneQuery }] : [])]
      }).sort({ createdAt: -1 })
    : sortByCreatedAtDesc(
        listLocalOfflineTests().filter((item) => {
          const phone = normalizePhone(item.phone);
          const roll = normalizeText(item.rollNumber).toLowerCase();
          return roll === rollQuery || (phoneQuery && phone === phoneQuery);
        })
      );

  res.json(records.map(normalizeRecord));
};

export const listOfflineTestRegistrationsAdmin = async (req, res) => {
  const records = isDatabaseConnected()
    ? await OfflineTestRegistration.find().sort({ createdAt: -1 })
    : sortByCreatedAtDesc(listLocalOfflineTests());

  res.json(records.map(normalizeRecord));
};

export const updateOfflineTestResultAdmin = async (req, res) => {
  const patch = {
    marksObtained:
      req.body?.marksObtained === "" || req.body?.marksObtained === null || req.body?.marksObtained === undefined
        ? null
        : Number(req.body.marksObtained),
    totalMarks:
      req.body?.totalMarks === "" || req.body?.totalMarks === null || req.body?.totalMarks === undefined
        ? null
        : Number(req.body.totalMarks),
    rank: normalizeText(req.body?.rank),
    resultNotes: normalizeText(req.body?.resultNotes),
    status: req.body?.status === "registered" ? "registered" : "results_published"
  };

  if (
    (patch.marksObtained !== null && !Number.isFinite(patch.marksObtained)) ||
    (patch.totalMarks !== null && !Number.isFinite(patch.totalMarks))
  ) {
    return res.status(400).json({ message: "Marks and total marks must be valid numbers." });
  }

  const record = isDatabaseConnected()
    ? await OfflineTestRegistration.findByIdAndUpdate(req.params.id, patch, { new: true })
    : updateLocalOfflineTest(req.params.id, patch);

  if (!record) {
    return res.status(404).json({ message: "Offline test registration not found." });
  }

  let sms = { sent: false, reason: "not_requested" };
  if (patch.status === "results_published") {
    sms = await sendOfflineTestResultSms({
      phone: record.phone,
      studentName: record.studentName,
      examName: record.examName,
      rollNumber: record.rollNumber,
      marksObtained: record.marksObtained,
      totalMarks: record.totalMarks,
      rank: record.rank,
      resultNotes: record.resultNotes
    });
  }

  res.json({
    message: "Offline test result updated.",
    registration: normalizeRecord(record),
    sms
  });
};
