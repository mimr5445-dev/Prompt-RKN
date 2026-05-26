import dotenv from "dotenv";
dotenv.config();

export const environmentConfig = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_DEFAULT_MODEL: process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash",
  NODE_ENV: process.env.NODE_ENV || "development",
};