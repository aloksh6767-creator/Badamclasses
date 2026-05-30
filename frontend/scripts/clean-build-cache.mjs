import fs from "fs";
import { getResolvedNextDistDir } from "./next-dist-dir.mjs";

const buildDir = getResolvedNextDistDir();

try {
  fs.rmSync(buildDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  console.log(`[prebuild] cleaned ${buildDir}`);
} catch (error) {
  console.warn(`[prebuild] could not fully clean ${buildDir}: ${error.message}`);
}
