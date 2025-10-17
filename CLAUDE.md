# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyThreads is a Slack bot that helps track and manage open threads. It uses Socket Mode for real-time events, stores all data in-memory (no database), and automatically backfills recent history on startup.

**Key Feature**: The `/mythreads` command only shows threads that have been manually renamed by users using a rename command (e.g., `name: Custom Name`), not all threads a user has participated in.

## Coding Style

Always write code in English (including comments, variables, logs, and error messages), even when we communicate in other languages.

## Workflow

For significant changes, always present a plan and wait for confirmation before implementing.

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (auto-reload with nodemon)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production mode (after building)
npm start
```

## Environment Setup

Required environment variables in `.env`:

- `SLACK_BOT_TOKEN` - xoxb-... (from OAuth & Permissions)
- `SLACK_SIGNING_SECRET` - From Basic Information > App Credentials
- `SLACK_APP_TOKEN` - xapp-... (from Socket Mode)

Copy `.env.example` to `.env` and fill in the values.

## Architecture

### Initialization Flow (src/index.ts)

1. App starts in Socket Mode using @slack/bolt
2. Sets up message handlers and slash command handlers
3. Runs backfill to rebuild in-memory state from recent history
4. Starts receiving real-time events

### Core Data Model (src/store.ts)

The main data structure is `Thread`:

```typescript
interface Thread {
  channel: string; // Channel ID
  ts: string; // Root message timestamp
  name: string; // Thread display name
  isManuallyRenamed: boolean; // TRUE only if renamed via "name: XXX"
  participants: Set<string>; // User IDs who posted
  lastMessage: string; // Text of last message
  status: ThreadStatus; // 'open' | 'closed'
}
```

Threads are stored in-memory as: `Map<"channel:ts", Thread>`

**Critical**: `isManuallyRenamed` tracks whether a user explicitly renamed a thread with `name: Custom Name`. This flag determines whether the thread appears in `/mythreads` results.

### Thread Lifecycle

1. **Creation**: A thread only exists when there's at least one reply (not just a root message)
2. **Naming**:
   - Default: First 30 chars of root message
   - Custom: Any reply with a rename prefix (see `RENAME_PREFIXES` in config.ts) followed by new name (case-insensitive)
   - The most recent rename command wins
3. **Status**: Determined by last message
   - `open`: Default or when last message is anything other than close keywords
   - `closed`: When last message exactly matches one of the `CLOSE_KEYWORDS` (case-insensitive)
4. **Filtering**: `/mythreads` only returns threads where `isManuallyRenamed === true`

### Backfill Process (src/backfill.ts)

On startup, rebuilds in-memory state:

1. Lists all channels where bot is a member
2. Fetches message history for last N days (`BACKFILL_DAYS` in config.ts)
3. Identifies threads (messages with `reply_count > 0`)
4. For each thread, fetches all replies to:
   - Extract participants
   - Find rename commands (scans backwards for most recent)
   - Determine status from last message
   - Set `isManuallyRenamed` flag if any rename command found

**Important**: Backfill scans backwards through messages to find the most recent rename command, ensuring threads with multiple renames use the latest one.

### Real-time Handlers (src/handlers.ts)

Listens to `message` events and handles two scenarios:

1. **New reply in unknown thread**: Fetches all replies to rebuild thread state (similar to backfill logic)
2. **Reply in known thread**: Updates participants, checks for rename command, updates last message

When a new rename command is detected, sets `isManuallyRenamed = true` for that thread.

### Slash Command (src/commands.ts)

`/mythreads` implementation:

- Calls `getUserOpenRenamedThreads()` which filters for:
  - `status === 'open'`
  - `participants.has(userId)`
  - **`isManuallyRenamed === true`** (critical filter)
- Generates permalinks for each thread
- Returns ephemeral message (visible only to requesting user)

## Configuration (src/config.ts)

Adjustable constants:

- `CLOSE_KEYWORDS`: Default ["close", ":lock:"] - keywords to mark thread as closed
- `RENAME_PREFIXES`: Default ["name:", ":thread:", "rename:"] - prefixes for rename commands
- `BACKFILL_DAYS`: Default 1 - days of history to scan on startup

## Key Implementation Details

1. **No persistence**: All data is in-memory. Restart requires backfill to rebuild state.

2. **Thread detection**: A message becomes a "thread" only when it has at least one reply. Root messages without replies are ignored.

3. **Rename command parsing**: The `extractRenameCommand()` function looks for messages starting with any of the `RENAME_PREFIXES` (case-insensitive) and extracts everything after as the new name.

4. **Status determination**: The `getThreadStatus()` function checks if `lastMessage` exactly matches one of the `CLOSE_KEYWORDS` (case-insensitive, trimmed).

5. **Manual rename tracking**: The `isManuallyRenamed` flag is the gate for `/mythreads` visibility. It's set to true only when a rename command is found, either during backfill or real-time handling.

6. **Thread key**: Threads are uniquely identified by `"channel:ts"` where `ts` is the root message timestamp.

## Testing Workflow

To test manually:

1. Invite bot to a channel: `/invite @MyThreads`
2. Start a thread by replying to any message
3. In the thread, post: `name: Test Thread`
4. Run `/mythreads` - should see "Test Thread"
5. Post `close` in the thread (or any keyword from `CLOSE_KEYWORDS`)
6. Run `/mythreads` - thread should disappear

## Common Modifications

**Change close keywords**: Edit `CLOSE_KEYWORDS` in src/config.ts (add/remove keywords)
**Change rename prefixes**: Edit `RENAME_PREFIXES` in src/config.ts (add/remove prefixes)
**Adjust backfill window**: Edit `BACKFILL_DAYS` in src/config.ts
**Modify /mythreads filtering**: Edit `getUserOpenRenamedThreads()` in src/store.ts
