import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { globalErrorHandler } from "./app/middlewares/gloabalErrorHandler.js";
import { MainRoute } from "./app/routes/index.js";

const app = express();

app.use(express.json());

const corsOptions = {
  origin: 'http://localhost:3000', 
  credentials: true,
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));


// app.use(cors());
app.use(cookieParser());

app.use("/api/v1", MainRoute);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "School Management Backend API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use(globalErrorHandler);

export default app;
