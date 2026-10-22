import mongoose from "mongoose";

const AttemptQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }],
  answer: { type: Number, required: true },
  explanation: { type: String, default: "" }
}, { _id: false });

const TestAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  testId: { type: String, required: true, index: true },
  testTitle: { type: String, required: true },
  examName: { type: String, default: "" },
  questions: [AttemptQuestionSchema],
  answers: { type: Map, of: Number, default: {} },
  status: { type: String, enum: ["in_progress", "submitted"], default: "in_progress", index: true },
  startedAt: { type: Date, required: true },
  deadlineAt: { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  durationSeconds: { type: Number, required: true },
  marksPerQuestion: { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0 },
  allowReview: { type: Boolean, default: true },
  result: {
    score: Number,
    maxMarks: Number,
    correct: Number,
    incorrect: Number,
    unanswered: Number,
    accuracy: Number,
    timeTakenSeconds: Number
  }
}, { timestamps: true });

TestAttemptSchema.index({ userId: 1, createdAt: -1 });
TestAttemptSchema.index({ testId: 1, status: 1, "result.score": -1, "result.timeTakenSeconds": 1 });

export default mongoose.models.TestAttempt || mongoose.model("TestAttempt", TestAttemptSchema);
