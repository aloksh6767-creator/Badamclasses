import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === "application/pdf";
    return {
      folder: "badamsinghclasses",
      resource_type: isPdf ? "raw" : "video",
      format: isPdf ? "pdf" : undefined
    };
  }
});

export const upload = multer({ storage });

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
