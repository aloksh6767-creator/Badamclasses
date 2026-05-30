import cron from "node-cron";
import { createAutomationBackup, getFeatureFlags } from "./automationStorage.js";

let backupTask = null;

export const startAutomationScheduler = () => {
  if (backupTask) {
    return backupTask;
  }

  backupTask = cron.schedule("0 2 * * *", () => {
    const flags = getFeatureFlags();
    if (!flags.backupsEnabled) {
      return;
    }

    try {
      createAutomationBackup("daily", "system");
    } catch (error) {
      console.error("[automation] daily backup failed:", error.message);
    }
  });

  return backupTask;
};
