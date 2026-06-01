import { pinoLogger } from "./pinno.logger.js";

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    pinoLogger.error(err);
    next(err);
  });
};

export default catchAsync;
