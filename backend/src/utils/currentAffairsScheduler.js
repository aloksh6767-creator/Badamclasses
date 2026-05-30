import cron from "node-cron";
import { isDatabaseConnected } from "../config/db.js";
import { refreshCurrentAffairsSnapshot } from "../utils/currentAffairsService.js";

const CRON_EXPR = process.env.CURRENT_AFFAIRS_CRON || "0 7 * * *";
const TZ = process.env.CURRENT_AFFAIRS_TZ || "Asia/Kolkata";

export const startCurrentAffairsScheduler = () => {
  cron.schedule(
    CRON_EXPR,
    async () => {
      if (!isDatabaseConnected()) {
        console.warn("[CurrentAffairs] cron refresh skipped because MongoDB is offline.");
        return;
      }
      try {
        await refreshCurrentAffairsSnapshot(new Date());
        console.log(`[CurrentAffairs] refreshed via cron (${CRON_EXPR})`);
      } catch (error) {
        console.error("[CurrentAffairs] cron refresh error:", error.message);
      }
    },
    { timezone: TZ }
  );

  console.log(`[CurrentAffairs] scheduler started: ${CRON_EXPR} (${TZ})`);
};

export const warmupCurrentAffairs = async () => {
  if (!isDatabaseConnected()) {
    console.warn("[CurrentAffairs] warmup skipped because MongoDB is offline.");
    return;
  }
  try {
    await refreshCurrentAffairsSnapshot(new Date());
    console.log("[CurrentAffairs] warmup refresh complete");
  } catch (error) {
    console.warn("[CurrentAffairs] warmup failed:", error.message);
  }
};
