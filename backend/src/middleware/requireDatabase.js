import { getDatabaseErrorResponse, isDatabaseConnected } from "../config/db.js";

const requireDatabase = (req, res, next) => {
  if (isDatabaseConnected()) {
    return next();
  }

  return res.status(503).json(getDatabaseErrorResponse());
};

export default requireDatabase;
