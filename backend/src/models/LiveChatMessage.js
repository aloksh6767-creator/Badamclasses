import mongoose from "mongoose";

const liveChatMessageSchema = new mongoose.Schema(
  {
    batchId: { type: String, required: true, trim: true, index: true },
    batchTitle: { type: String, default: "", trim: true },
    mode: { type: String, enum: ["Group Chat", "Private Chat"], default: "Private Chat" },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    senderName: { type: String, default: "Student", trim: true },
    senderEmail: { type: String, default: "", trim: true, lowercase: true },
    senderRole: { type: String, enum: ["student", "admin", "instructor"], default: "student" }
  },
  { timestamps: true }
);

liveChatMessageSchema.index({ batchId: 1, createdAt: -1 });

export default mongoose.model("LiveChatMessage", liveChatMessageSchema);
