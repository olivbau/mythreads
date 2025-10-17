import { CLOSE_KEYWORDS, RENAME_PREFIXES } from "./config";

export type ThreadStatus = "open" | "closed";

export interface Thread {
  channel: string; // Channel ID
  ts: string; // Root message timestamp
  name: string; // Thread name (first chars of root message)
  isManuallyRenamed: boolean; // True if renamed via "name: XXX" command
  participants: Set<string>; // User IDs who posted in this thread
  lastMessage: string; // Text of the last message
  status: ThreadStatus; // 'open' or 'closed'
}

// Main store: Map with key = "channel:ts"
const threadsById = new Map<string, Thread>();

/**
 * Generates unique key for a thread
 */
export function getThreadKey(channel: string, ts: string): string {
  return `${channel}:${ts}`;
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

/**
 * Adds or updates a thread
 */
export function upsertThread(
  channel: string,
  ts: string,
  name: string,
  isManuallyRenamed: boolean,
  participants: Set<string>,
  lastMessage: string
): Thread {
  const key = getThreadKey(channel, ts);
  const status = getThreadStatus(lastMessage);

  const thread: Thread = {
    channel,
    ts,
    name,
    isManuallyRenamed,
    participants,
    lastMessage,
    status,
  };

  threadsById.set(key, thread);
  return thread;
}

/**
 * Gets a thread
 */
export function getThread(channel: string, ts: string): Thread | undefined {
  const key = getThreadKey(channel, ts);
  return threadsById.get(key);
}

/**
 * Gets all open threads for a user
 */
export function getUserOpenThreads(userId: string): Thread[] {
  const openThreads: Thread[] = [];

  for (const thread of threadsById.values()) {
    if (thread.status === "open" && thread.participants.has(userId)) {
      openThreads.push(thread);
    }
  }

  return openThreads;
}

/**
 * Gets all open threads for a user that have been manually renamed
 */
export function getUserOpenRenamedThreads(userId: string): Thread[] {
  const openRenamedThreads: Thread[] = [];

  for (const thread of threadsById.values()) {
    if (
      thread.status === "open" &&
      thread.participants.has(userId) &&
      thread.isManuallyRenamed
    ) {
      openRenamedThreads.push(thread);
    }
  }

  return openRenamedThreads;
}

/**
 * Returns total number of threads in memory
 */
export function getThreadCount(): number {
  return threadsById.size;
}

/**
 * Clears the store (useful for tests)
 */
export function clearStore(): void {
  threadsById.clear();
}
