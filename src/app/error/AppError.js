export default class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = "error";
    this.isOptional = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
