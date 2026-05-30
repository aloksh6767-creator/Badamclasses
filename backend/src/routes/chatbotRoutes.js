import express from "express";
import { chatWithAdminAssistant, chatWithAssistant } from "../controllers/chatbotController.js";

const router = express.Router();

router.post("/message", chatWithAssistant);
router.post("/admin-assistant", chatWithAdminAssistant);

export default router;
