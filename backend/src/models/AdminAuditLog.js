import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema({
  actorId: { type: String, required: true, index: true },
  actorEmail: { type: String, default: "" },
  action: { type: String, required: true, trim: true },
  entityType: { type: String, required: true, trim: true },
  entityId: { type: String, default: "" },
  summary: { type: String, required: true, trim: true, maxlength: 500 }
}, { timestamps: { createdAt: true, updatedAt: false } });

adminAuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AdminAuditLog || mongoose.model("AdminAuditLog", adminAuditLogSchema);
