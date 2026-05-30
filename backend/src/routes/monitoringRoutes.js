import { Router } from "express";
import { reportFrontendError } from "../controllers/monitoringController.js";

const router = Router();

router.post("/frontend-error", reportFrontendError);

export default router;
