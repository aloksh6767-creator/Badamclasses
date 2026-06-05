import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === "application/pdf";
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: "badamsinghclasses",
      resource_type: isPdf ? "raw" : isVideo ? "video" : "image",
      format: isPdf ? "pdf" : undefined
    };
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error("Only PDF, image, and video uploads are allowed");
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  }
});

export const uploadMedia = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File required" });
  }

  res.json({
    url: req.file.path,
    publicId: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype
  });
};
