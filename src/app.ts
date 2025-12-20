// src/app.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";

const app: Application = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan("dev")); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check route (outside API versioning)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Restooo API is running! 🍽️",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Restooo API",
    version: "1.0.0",
    description: "Restaurant Management API with Prisma ORM",
    database: "PostgreSQL",
    orm: "Prisma",
    endpoints: {
      health: "/health",
      api: "/api/v1",
      auth: "/api/v1/auth",
      docs: "/api/v1/docs (coming soon)",
    },
  });
});

// API Routes (v1)
app.use("/api/v1", routes);

// 404 handler (must be last)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

export default app;
