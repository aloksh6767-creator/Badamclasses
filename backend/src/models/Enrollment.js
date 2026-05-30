import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
    courseRouteId: { type: String, required: true, trim: true },
    courseTitle: { type: String, default: "", trim: true },
    courseSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, default: false },
    certificateUrl: { type: String, default: "" },
    paymentId: { type: String, default: "" },
    orderId: { type: String, default: "" },
    paymentProvider: { type: String, default: "razorpay" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" }
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, courseRouteId: 1 }, { unique: true });

export default mongoose.model("Enrollment", enrollmentSchema);
