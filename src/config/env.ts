// src/config/env.ts
import { z } from "zod";

// Define schema for required env vars
const envSchema = z.object({
  JWT_SECRET: z.string().min(1, { message: "JWT_SECRET is required in .env" }),
  JWT_EXPIRE: z.string().optional().default("7d"), // Optional with default
  // Add other env vars here as needed (e.g., DATABASE_URL: z.string().url())
});

// Parse and validate env (throws if invalid)
const env = envSchema.parse(process.env);

export default env;
