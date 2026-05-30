import mongoose from "mongoose";

mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 0);

const DB_NOT_CONNECTED_MESSAGE = "Database not connected. Please configure MONGO_URI.";
const INVALID_MONGO_TOKENS = [
  "YOUR_PASSWORD",
  "<password>",
  "placeholder",
  "replace_me",
  "changeme"
];

let dbState = {
  connected: false,
  code: "DB_NOT_CONNECTED",
  message: DB_NOT_CONNECTED_MESSAGE,
  detail: "MongoDB connection has not been established yet."
};

const normalizeMongoUri = (uri = "") => String(uri || "").trim();

export const validateMongoUri = (uri = "") => {
  const normalized = normalizeMongoUri(uri);

  if (!normalized) {
    return {
      ok: false,
      code: "MONGO_URI_MISSING",
      message: DB_NOT_CONNECTED_MESSAGE,
      detail: "MONGO_URI is missing."
    };
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(normalized)) {
    return {
      ok: false,
      code: "MONGO_URI_INVALID",
      message: DB_NOT_CONNECTED_MESSAGE,
      detail: "MONGO_URI must start with mongodb:// or mongodb+srv://."
    };
  }

  const lower = normalized.toLowerCase();
  if (INVALID_MONGO_TOKENS.some((token) => lower.includes(token.toLowerCase()))) {
    return {
      ok: false,
      code: "MONGO_URI_PLACEHOLDER",
      message: DB_NOT_CONNECTED_MESSAGE,
      detail: "MONGO_URI still contains a placeholder token."
    };
  }

  if (/^mongodb\+srv:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(normalized)) {
    return {
      ok: false,
      code: "MONGO_URI_INVALID_HOST",
      message: DB_NOT_CONNECTED_MESSAGE,
      detail: "mongodb+srv:// cannot be used with localhost-style hosts."
    };
  }

  return { ok: true };
};

const setDbState = (patch) => {
  dbState = {
    ...dbState,
    ...patch
  };
};

const classifyMongoError = (error) => {
  const detail = String(error?.message || "MongoDB connection failed.");
  const lowered = detail.toLowerCase();

  if (lowered.includes("whitelist")) {
    return {
      code: "MONGO_IP_NOT_WHITELISTED",
      message: DB_NOT_CONNECTED_MESSAGE,
      detail
    };
  }

  if (lowered.includes("authentication failed") || lowered.includes("bad auth")) {
    return {
      code: "MONGO_AUTH_FAILED",
      message: DB_NOT_CONNECTED_MESSAGE,
      detail
    };
  }

  if (lowered.includes("querysrv") || lowered.includes("dns")) {
    return {
      code: "MONGO_DNS_FAILED",
      message: DB_NOT_CONNECTED_MESSAGE,
      detail
    };
  }

  if (lowered.includes("timed out") || lowered.includes("server selection timed out")) {
    return {
      code: "MONGO_TIMEOUT",
      message: DB_NOT_CONNECTED_MESSAGE,
      detail
    };
  }

  return {
    code: "MONGO_CONNECTION_FAILED",
    message: DB_NOT_CONNECTED_MESSAGE,
    detail
  };
};

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;

export const getDatabaseStatus = () => ({
  connected: isDatabaseConnected(),
  code: isDatabaseConnected() ? "DB_ONLINE" : dbState.code,
  message: isDatabaseConnected() ? "MongoDB connected." : dbState.message,
  detail: isDatabaseConnected() ? "MongoDB connection is ready." : dbState.detail
});

export const isMongoEnvConfigured = () => validateMongoUri(process.env.MONGO_URI).ok;

export const getDatabaseErrorResponse = () => ({
  success: false,
  message: DB_NOT_CONNECTED_MESSAGE,
  code: getDatabaseStatus().code,
  detail: getDatabaseStatus().detail
});

const connectDb = async () => {
  const uri = process.env.MONGO_URI;
  const validation = validateMongoUri(uri);

  if (!validation.ok) {
    setDbState({
      connected: false,
      code: validation.code,
      message: validation.message,
      detail: validation.detail
    });
    console.warn(`[MongoDB] offline: ${validation.detail}`);
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    setDbState({
      connected: true,
      code: "DB_ONLINE",
      message: "MongoDB connected.",
      detail: "MongoDB connection is ready."
    });
    console.log("[MongoDB] connected");
    return true;
  } catch (error) {
    const classified = classifyMongoError(error);
    setDbState({
      connected: false,
      code: classified.code,
      message: classified.message,
      detail: classified.detail
    });
    console.warn(`[MongoDB] offline: ${dbState.detail}`);
    return false;
  }
};

export default connectDb;
