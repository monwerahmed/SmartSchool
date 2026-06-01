import AppError from "../error/AppError.js";

export const globalErrorHandler = (err,req,res,next)=>{
  let statusCode = 500;
  let message = "Something went wrong!!"

  if(err instanceof AppError){
    statusCode = err.statusCode
    message = err.message;
  }else if(err instanceof Error){
    statusCode=500
    message = err.message;
  }
  res.status(statusCode).json({
    success:false,
    message,
    err,
    stack:process.env.NODE_ENV === "development" ? err.stack : null
  })
}