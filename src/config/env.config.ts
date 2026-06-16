import dotenv from "dotenv";
import z from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  PORT: z.string().default("5000").transform(Number),
  MAIL_HOST: z.string().min(1, "MAIL_HOST is required"),
  MAIL_PORT: z.string().min(1, "MAIL_PORT is required").transform(Number),
  MAIL_SECURE: z.string().min(1, "MAIL_SECURE is required").transform(Boolean),
  MAIL_USER: z.string().min(1, "MAIL_USER is required"),
  MAIL_PWD: z.string().min(1, "MAIL_PWD is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Missing env variables");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
