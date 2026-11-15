import mongoose from "mongoose";

const StudentAiMockQuestionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  question: { type: String, required: true, trim: true },
  options: [{ type: String, required: true, trim: true }],
  answer: { type: Number, required: true, min: 0, max: 3 },
  explanation: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  topic: { type: String, required: true, trim: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  language: { type: String, required: true },
  sourceReference: { type: String, default: "" },
  fingerprint: { type: String, required: true }
}, { _id: false });

const StudentAiMockTestSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  requestId: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  examName: { type: String, required: true, trim: true },
  examFamily: { type: String, required: true },
  examTier: { type: String, default: "Custom practice" },
  testType: { type: String, enum: ["full", "sectional", "topic"], required: true },
  questionStyle: { type: String, enum: ["mixed", "statement"], default: "mixed" },
  sections: [{ name: { type: String, required: true }, subject: { type: String, required: true }, questionCount: { type: Number, required: true }, marks: { type: Number, required: true } }],
  blueprintVersion: { type: Number, default: null },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  mode: { type: String, enum: ["timed"], default: "timed" },
  questions: { type: [StudentAiMockQuestionSchema], default: [] },
  durationMinutes: { type: Number, required: true, min: 1, max: 240 },
  totalQuestions: { type: Number, required: true, min: 1, max: 200 },
  totalMarks: { type: Number, required: true },
  marksPerQuestion: { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0 },
  language: { type: String, required: true },
  difficulty: { type: String, required: true },
  status: { type: String, enum: ["generating", "ready", "failed"], default: "generating", index: true },
  qualityChecks: { type: mongoose.Schema.Types.Mixed, default: {} },
  generationError: { type: String, default: "" },
  generatorVersion: { type: String, default: "" },
  questionFingerprints: [{ type: String }]
}, { timestamps: true });

StudentAiMockTestSchema.index({ ownerId: 1, requestId: 1 }, { unique: true });
StudentAiMockTestSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.models.StudentAiMockTest || mongoose.model("StudentAiMockTest", StudentAiMockTestSchema);
