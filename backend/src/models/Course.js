import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    duration: { type: Number, default: 0 }
  },
  { _id: false }
);

const pdfSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    pdfUrl: { type: String, required: true }
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    thumbnail: { type: String, default: "" },
    category: { type: String, default: "General" },
    liveClassEnabled: { type: Boolean, default: false },
    liveClassUrl: { type: String, default: "" },
    liveClassTitle: { type: String, default: "" },
    batchTime: { type: String, default: "" },
    startDate: { type: String, default: "" },
    duration: { type: String, default: "" },
    curriculum: [{ type: String }],
    videos: [videoSchema],
    pdfResources: [pdfSchema],
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

courseSchema.index({ title: "text", description: "text", category: "text" });

export default mongoose.model("Course", courseSchema);
