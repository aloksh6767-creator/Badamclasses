import mongoose from "mongoose";

const StudentAiMockQuestionFingerprintSchema = new mongoose.Schema({
  fingerprint: { type: String, required: true, unique: true },
  mockId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentAiMockTest", required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 365 }
});

export default mongoose.models.StudentAiMockQuestionFingerprint || mongoose.model("StudentAiMockQuestionFingerprint", StudentAiMockQuestionFingerprintSchema);
