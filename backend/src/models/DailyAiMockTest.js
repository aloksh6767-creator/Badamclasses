import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
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
  fingerprint: { type: String, required: true },
  validationStatus: { type: String, enum: ["passed"], required: true }
}, { _id: false });

const DailyAiMockTestSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  examName: { type: String, required: true, trim: true },
  examFamily: { type: String, required: true, index: true },
  examTier: { type: String, required: true },
  testType: { type: String, enum: ["full", "sectional"], required: true },
  subject: { type: String, default: "" },
  sections: [{ name: String, questionCount: Number, marks: Number }],
  questions: [QuestionSchema],
  durationMinutes: { type: Number, required: true, min: 1, max: 240 },
  totalQuestions: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  marksPerQuestion: { type: Number, required: true },
  negativeMarks: { type: Number, required: true },
  language: { type: String, required: true },
  difficulty: { type: String, required: true },
  blueprintId: { type: mongoose.Schema.Types.ObjectId, ref: "DailyAiMockBlueprint", required: true },
  blueprintVersion: { type: Number, required: true },
  generationDate: { type: String, required: true, index: true },
  scheduledPublicationDate: { type: Date, required: true },
  status: { type: String, enum: ["queued", "generating", "validating", "quarantined", "published", "failed", "archived"], default: "queued", index: true },
  qualityChecks: { type: mongoose.Schema.Types.Mixed, default: {} },
  questionFingerprints: [{ type: String }],
  generatorVersion: { type: String, required: true },
  retryCount: { type: Number, default: 0 },
  failureReason: { type: String, default: "" },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "DailyAiMockJob", required: true },
  idempotencyKey: { type: String, required: true, unique: true },
  publishedAt: { type: Date, default: null }
}, { timestamps: true });

DailyAiMockTestSchema.index({ status: 1, scheduledPublicationDate: -1 });
DailyAiMockTestSchema.index({ examFamily: 1, generationDate: -1, testType: 1 });

export default mongoose.models.DailyAiMockTest || mongoose.model("DailyAiMockTest", DailyAiMockTestSchema);
