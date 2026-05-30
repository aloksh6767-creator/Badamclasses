import mongoose from "mongoose";

const courseLiveOverrideSchema = new mongoose.Schema(
  {
    courseKey: { type: String, required: true, trim: true, lowercase: true, unique: true },
    liveClassEnabled: { type: Boolean, default: false },
    liveClassUrl: { type: String, default: "" },
    liveClassTitle: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export default mongoose.model("CourseLiveOverride", courseLiveOverrideSchema);
