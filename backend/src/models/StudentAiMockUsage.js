import mongoose from "mongoose";

const StudentAiMockUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  localDate: { type: String, required: true },
  generatedCount: { type: Number, default: 0, min: 0 },
  activeCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

StudentAiMockUsageSchema.index({ userId: 1, localDate: 1 }, { unique: true });

export default mongoose.models.StudentAiMockUsage || mongoose.model("StudentAiMockUsage", StudentAiMockUsageSchema);
