import mongoose from "mongoose";

const offlineTestRegistrationSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true, unique: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: "" },
    examName: { type: String, required: true, trim: true },
    batchName: { type: String, trim: true, default: "" },
    testDate: { type: String, trim: true, default: "" },
    center: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["registered", "results_published"],
      default: "registered"
    },
    marksObtained: { type: Number, default: null },
    totalMarks: { type: Number, default: null },
    rank: { type: String, trim: true, default: "" },
    resultNotes: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

offlineTestRegistrationSchema.index({ phone: 1, examName: 1, createdAt: -1 });

export default mongoose.model("OfflineTestRegistration", offlineTestRegistrationSchema);
