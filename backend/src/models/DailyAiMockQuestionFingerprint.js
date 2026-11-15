import mongoose from "mongoose";

const DailyAiMockQuestionFingerprintSchema = new mongoose.Schema({
  fingerprint: { type: String, required: true, unique: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "DailyAiMockTest", required: true },
  generationDate: { type: String, required: true, index: true }
}, { timestamps: true });

export default mongoose.models.DailyAiMockQuestionFingerprint || mongoose.model("DailyAiMockQuestionFingerprint", DailyAiMockQuestionFingerprintSchema);
