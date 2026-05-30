import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "admin", "instructor"], default: "student" },
    avatar: { type: String, default: "" },
    phone: { type: String, default: "", trim: true },
    phoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);

