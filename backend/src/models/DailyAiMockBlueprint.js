import mongoose from "mongoose";

const BlueprintSectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  questionCount: { type: Number, required: true, min: 1, max: 100 },
  marks: { type: Number, required: true, min: 0 },
  topics: [{ type: String, trim: true }],
  topicDistribution: [{ topic: { type: String, required: true, trim: true }, percentage: { type: Number, required: true, min: 0, max: 100 } }],
  difficultyDistribution: {
    easy: { type: Number, default: 30 },
    medium: { type: Number, default: 50 },
    hard: { type: Number, default: 20 }
  }
}, { _id: false });

const TestPatternSchema = new mongoose.Schema({
  tier: { type: String, required: true, trim: true },
  sections: { type: [BlueprintSectionSchema], required: true },
  totalQuestions: { type: Number, required: true, min: 1, max: 200 },
  totalMarks: { type: Number, required: true, min: 1 },
  durationMinutes: { type: Number, required: true, min: 1, max: 240 },
  sectionTimingRules: { type: String, default: "" },
  pyqPatternGuidance: { type: String, default: "", trim: true, maxlength: 1000 },
  marksPerCorrect: { type: Number, required: true, min: 0 },
  negativeMarks: { type: Number, required: true, min: 0 },
  supportedLanguages: [{ type: String, required: true }],
  effectiveFrom: { type: Date, required: true },
  sourceReferences: [{ type: String, required: true }]
}, { _id: false });

const DailyAiMockBlueprintSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  examFamily: { type: String, required: true, trim: true, index: true },
  examination: { type: String, required: true, trim: true },
  version: { type: Number, required: true, min: 1 },
  reviewStatus: { type: String, enum: ["review_required", "approved", "rejected"], default: "review_required", index: true },
  reviewNotes: { type: String, default: "" },
  pyqPatternGuidance: { type: String, default: "", trim: true, maxlength: 1000 },
  reviewedBy: { type: String, default: "" },
  reviewedAt: { type: Date, default: null },
  fullTest: { type: TestPatternSchema, default: null },
  sectionalTests: { type: [TestPatternSchema], default: [] }
}, { timestamps: true });

DailyAiMockBlueprintSchema.index({ key: 1, version: 1 }, { unique: true });

export default mongoose.models.DailyAiMockBlueprint || mongoose.model("DailyAiMockBlueprint", DailyAiMockBlueprintSchema);
