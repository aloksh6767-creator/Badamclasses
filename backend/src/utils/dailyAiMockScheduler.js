import cron from "node-cron";
import { runDailyAiMockScheduleCheck } from "./dailyAiMockAgent.js";

let dailyTask = null;

export const startDailyAiMockScheduler = () => {
  if (process.env.DAILY_AI_MOCK_ENABLED !== "true") {
    console.info("[DailyAiMock] scheduler disabled; set DAILY_AI_MOCK_ENABLED=true after backend configuration and blueprint approval.");
    return null;
  }
  if (dailyTask) return dailyTask;
  dailyTask = cron.schedule("* * * * *", () => {
    void runDailyAiMockScheduleCheck().catch((error) => {
      console.error("[DailyAiMock] scheduled run failed:", error.message);
    });
  }, { timezone: "UTC", name: "daily-ai-mock-schedule-check" });
  console.info("[DailyAiMock] schedule checker started; next run is controlled by the admin schedule and Asia/Kolkata default.");
  return dailyTask;
};

export const stopDailyAiMockScheduler = () => {
  dailyTask?.stop();
  dailyTask = null;
};
