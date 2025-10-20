import { getThreadStatus } from "./helpers";

export type ThreadStatus = "open" | "closed";

export interface Thread {
  channel: string; // Channel ID
  ts: string; // Root message timestamp
  name: string; // Thread name (first chars of root message)
  isManuallyRenamed: boolean; // True if renamed via "name: XXX" command
  participants: Set<string>; // User IDs who posted in this thread
  lastMessage: string; // Text of the last message
  status: ThreadStatus; // 'open' or 'closed'
  createdAt: number; // Timestamp when thread was created (in seconds)
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
 * Adds or updates a thread
 */
export function upsertThread(
  channel: string,
  ts: string,
  name: string,
  isManuallyRenamed: boolean,
  participants: Set<string>,
  lastMessage: string,
  createdAt: number
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
    createdAt,
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
