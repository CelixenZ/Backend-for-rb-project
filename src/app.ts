import cors, { CorsOptions } from "cors";
import express from "express";
import router from "./routes/index";
import errorMiddleware from "./middleware/error.middleware";

export function createApp() {
  const app = express();

  // Middleware
  const corsOptions: CorsOptions = {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  app.use(express.json());

  app.use("/api", router);

  // JSON parse error handler for malformed request bodies
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && "body" in err) {
      console.error("Invalid JSON payload:", err.message);
      return res.status(400).json({
        message:
          "Invalid JSON payload. Please send valid JSON with Content-Type: application/json.",
      });
    }
    next(err);
  });

  app.get("/", (req, res) => {
    res.send("ICMS Backend API is running smoothly!");
  });

  app.use(errorMiddleware);

  return app;
}
