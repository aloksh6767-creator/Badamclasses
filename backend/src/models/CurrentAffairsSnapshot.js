import mongoose from "mongoose";

const DailyItemSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    topic: { type: String },
    headline: { type: String, required: true },
    summary: { type: String, required: true }
  },
  { _id: false }
);

const MonthlyItemSchema = new mongoose.Schema(
  {
    bucket: { type: String, required: true },
    topic: { type: String },
    highlights: [{ type: String, required: true }]
  },
  { _id: false }
);

const QuizItemSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    answer: { type: Number, required: true }
  },
  { _id: false }
);

const CurrentAffairsSnapshotSchema = new mongoose.Schema(
  {
    snapshotDateKey: { type: String, required: true, unique: true, index: true },
    generatedAt: { type: Date, default: Date.now, index: true },
    source: { type: String, default: "fallback" },
    topics: [{ type: String }],
    dailyLabel: { type: String, required: true },
    monthlyLabel: { type: String, required: true },
    daily: [DailyItemSchema],
    monthly: [MonthlyItemSchema],
    quiz: [QuizItemSchema]
  },
  { timestamps: true }
);

const CurrentAffairsSnapshot = mongoose.model("CurrentAffairsSnapshot", CurrentAffairsSnapshotSchema);

export default CurrentAffairsSnapshot;
