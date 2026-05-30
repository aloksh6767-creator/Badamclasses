import express from "express";
import {
  downloadCurrentAffairsPdf,
  getCurrentAffairs,
  refreshCurrentAffairsNow
} from "../controllers/currentAffairsController.js";

const router = express.Router();

router.get("/dashboard", getCurrentAffairs);
router.get("/pdf", downloadCurrentAffairsPdf);
router.post("/refresh", refreshCurrentAffairsNow);

export default router;
