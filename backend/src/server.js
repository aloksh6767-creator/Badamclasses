import "dotenv/config";
import app from "./app.js";
import connectDb from "./config/db.js";
import { startCurrentAffairsScheduler, warmupCurrentAffairs } from "./utils/currentAffairsScheduler.js";
import { notifyErrorAlert } from "./utils/alertNotifier.js";
import { ensureConfiguredAdminAccount } from "./utils/adminBootstrap.js";
import { startTelegramPollingService } from "./utils/telegramPollingService.js";

const PORT = process.env.PORT || 5000;

const reportProcessError = async (title, error) => {
  try {
    await notifyErrorAlert({
      severity: "critical",
      source: "backend-process",
      title,
      message: error?.message || String(error || "Unknown process error"),
      stack: error?.stack
    });
  } catch (alertError) {
    console.error("Process alert failed:", alertError.message);
  }
};

const start = async () => {
  try {
    const dbConnected = await connectDb();

    app.listen(PORT, async () => {
      console.log(`BadamSinghClasses API running on port ${PORT}`);
      const adminAccount = await ensureConfiguredAdminAccount();
      if (adminAccount?.email) {
        console.log(`[Auth] bootstrap admin ready for ${adminAccount.email}`);
      }
      await startTelegramPollingService();
      if (dbConnected) {
        await warmupCurrentAffairs();
        startCurrentAffairsScheduler();
      } else {
        console.warn("[CurrentAffairs] scheduler skipped because MongoDB is offline.");
      }
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    await reportProcessError("Backend startup failed", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", async (reason) => {
  console.error("Unhandled promise rejection:", reason);
  await reportProcessError("Unhandled promise rejection", reason instanceof Error ? reason : new Error(String(reason)));
});

process.on("uncaughtException", async (error) => {
  console.error("Uncaught exception:", error);
  await reportProcessError("Uncaught exception", error);
  process.exit(1);
});

start();
