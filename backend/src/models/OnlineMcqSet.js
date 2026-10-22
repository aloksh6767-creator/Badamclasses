import mongoose from "mongoose";

const OnlineMcqQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    options: [{ type: String, required: true, trim: true }],
    answer: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const OnlineMcqSetSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    examName: { type: String, trim: true, default: "Online MCQ" },
    source: { type: String, trim: true, default: "telegram" },
    status: { type: String, enum: ["draft", "published"], default: "published", index: true },
    questions: [OnlineMcqQuestionSchema],
    durationMinutes: { type: Number, min: 1, max: 240, default: 30 },
    marksPerQuestion: { type: Number, min: 0, default: 1 },
    negativeMarks: { type: Number, min: 0, default: 0 },
    allowReview: { type: Boolean, default: true },
    createdBy: { type: String, trim: true, default: "telegram-admin" }
  },
  { timestamps: true }
);

OnlineMcqSetSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("OnlineMcqSet", OnlineMcqSetSchema);
