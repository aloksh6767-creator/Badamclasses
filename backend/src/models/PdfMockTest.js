import mongoose from "mongoose";

const PdfMockQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, default: "" },
    section: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, default: "" },
    topic: { type: String, trim: true, default: "" },
    subtopic: { type: String, trim: true, default: "" },
    chapter: { type: String, trim: true, default: "" },
    question: { type: String, required: true, trim: true },
    options: [{ type: String, trim: true }],
    answer: { type: Number, min: 0, max: 3, default: null },
    explanation: { type: String, trim: true, default: "" },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    duplicateKey: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const PdfMockTestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, default: "" },
    topic: { type: String, trim: true, default: "" },
    chapter: { type: String, trim: true, default: "" },
    subtopics: [{ type: String, trim: true }],
    language: { type: String, trim: true, default: "English" },
    mockType: { type: String, trim: true, default: "section" },
    mockGroupId: { type: String, trim: true, default: "" },
    mockGroupTitle: { type: String, trim: true, default: "" },
    sourcePdf: { type: String, trim: true, default: "" },
    generatedBy: { type: String, trim: true, default: "ai-pdf-filter" },
    createdBy: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "published", index: true },
    questions: { type: [PdfMockQuestionSchema], default: [] }
  },
  { timestamps: true }
);

PdfMockTestSchema.index({ status: 1, createdAt: -1 });
PdfMockTestSchema.index({ sourcePdf: 1, mockGroupId: 1 });

export default mongoose.models.PdfMockTest || mongoose.model("PdfMockTest", PdfMockTestSchema);
