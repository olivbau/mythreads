import { CLOSE_KEYWORDS, RENAME_PREFIXES } from "./config";
import type { ThreadStatus } from "./store";

/**
 * Formats time elapsed since thread creation
 * @param createdAt Timestamp in seconds
 * @returns Formatted string like "4h ago" or "3d ago"
 */
export function formatTimeAgo(createdAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - createdAt;

  const hours = Math.floor(elapsed / 3600);
  const days = Math.floor(elapsed / 86400);

  if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}

/**
 * Determines thread status based on last message
 */
export function getThreadStatus(lastMessage: string): ThreadStatus {
  const normalized = lastMessage.trim().toLowerCase();

  for (const keyword of CLOSE_KEYWORDS) {
    if (normalized === keyword.toLowerCase()) {
      return "closed";
    }
  }

  return "open";
}

/**
 * Generates a thread name from root message text
 */
export function generateThreadName(text: string): string {
  const maxLength = 30;
  const cleaned = text.trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.substring(0, maxLength) + "...";
}

/**
 * Checks if a message is a rename command (e.g., "name: New Name", ":thread: New Name", "rename: New Name")
 * Returns the new name if found, null otherwise
 */
export function extractRenameCommand(text: string): string | null {
  const trimmed = text.trim();
  const lowerText = trimmed.toLowerCase();

  for (const prefix of RENAME_PREFIXES) {
    if (lowerText.startsWith(prefix.toLowerCase())) {
      const newName = trimmed.substring(prefix.length).trim();
      return newName || null;
    }
  }

  return null;
}
