import mongoose from "mongoose";

const DailyAiMockJobSchema = new mongoose.Schema({
  jobKey: { type: String, required: true, unique: true },
  localDate: { type: String, required: true, index: true },
  timezone: { type: String, required: true },
  status: { type: String, enum: ["queued", "generating", "completed", "quarantined", "failed"], default: "queued", index: true },
  lockOwner: { type: String, default: "" },
  lockExpiresAt: { type: Date, default: null, index: true },
  testIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "DailyAiMockTest" }],
  metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
  failureReason: { type: String, default: "" },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.models.DailyAiMockJob || mongoose.model("DailyAiMockJob", DailyAiMockJobSchema);
