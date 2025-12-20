import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes"; // ← Add this

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Restooo API is running! 🍽️",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});
// Auth routes
app.use("/api/v1/auth", authRoutes); // ← Add this

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
      docs: "/api/v1/docs",
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

export default app;
