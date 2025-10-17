import dotenv from "dotenv";

dotenv.config();

// Configurable constants
export const CLOSE_KEYWORDS = ["close", ":lock:"]; // Keywords to close a thread (case insensitive)
export const RENAME_PREFIXES = ["name:", ":thread:", "rename:"]; // Prefixes to rename a thread (e.g., "name: New Thread Name")
export const BACKFILL_DAYS = parseInt(process.env.BACKFILL_DAYS || "1", 10); // Number of days to backfill at startup

// Slack environment variables
export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
export const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";
export const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN || "";

// Validation
if (!SLACK_BOT_TOKEN || !SLACK_SIGNING_SECRET || !SLACK_APP_TOKEN) {
  throw new Error(
    "Missing required environment variables. Check your .env file."
  );
}
