import mongoose from "mongoose";

const DailyAiMockSettingsSchema = new mongoose.Schema({
  key: { type: String, default: "daily-ai-mock", unique: true },
  enabled: { type: Boolean, default: false },
  autoPublish: { type: Boolean, default: false },
  timezone: { type: String, default: "Asia/Kolkata" },
  generationTime: { type: String, default: "07:00" },
  examRotation: { type: [String], default: ["SSC", "Railway", "Banking", "Police"] },
  lastScheduledDate: { type: String, default: "" },
  updatedBy: { type: String, default: "system" }
}, { timestamps: true });

export default mongoose.models.DailyAiMockSettings || mongoose.model("DailyAiMockSettings", DailyAiMockSettingsSchema);
