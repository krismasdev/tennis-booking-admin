import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../shared/schema.js";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Encode the connection URL to handle special characters
const encodedUrl = new URL(process.env.DATABASE_URL).toString();
export const pool = mysql.createPool(encodedUrl);
export const db = drizzle(pool, { schema, mode: "default" });
