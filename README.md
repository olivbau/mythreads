# MyThreads - Slack Thread Manager Bot

A Slack bot that helps you track and manage open threads. Only displays threads that you've manually renamed, keeping your focus on what matters.

## Features

- **Thread Tracking**: Automatically tracks all threads in channels where the bot is invited
- **Manual Naming**: Rename threads with `name: Your Custom Name` to give them meaningful titles (see `RENAME_PREFIXES` for all options)
- **Smart Filtering**: `/mythreads` only shows threads you've manually renamed and are open
- **Status Management**: Close threads by posting `close` as the last message (see `CLOSE_KEYWORDS` for all options)
- **In-Memory Storage**: Fast, lightweight, no database required
- **Backfill**: Scans recent history on startup to rebuild thread state

## Installation

```bash
npm install
```

## Slack App Configuration

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Give it a name (e.g., "MyThreads") and select your workspace

### 2. Configure Permissions (OAuth & Permissions)

Add these **Bot Token Scopes**:
- `channels:history` - Read public channel history
- `groups:history` - Read private channel history
- `channels:read` - List channels
- `groups:read` - List private channels
- `chat:write` - Send messages
- `commands` - Use slash commands

### 3. Enable Socket Mode

1. Go to "Socket Mode" in the left menu
2. Enable Socket Mode
3. Generate an **App-Level Token** with the `connections:write` scope
4. Copy the token (starts with `xapp-...`)

### 4. Create the Slash Command

1. Go to "Slash Commands"
2. Click "Create New Command"
3. Command: `/mythreads`
4. Description: "List my manually renamed open threads"
5. (No Request URL needed in Socket Mode)

### 5. Enable Event Subscriptions

1. Go to "Event Subscriptions"
2. Enable "Enable Events"
3. Under "Subscribe to bot events", add:
   - `message.channels` - Messages in public channels
   - `message.groups` - Messages in private channels

### 6. Install the App

1. Go to "Install App"
2. Click "Install to Workspace"
3. Authorize the permissions
4. Copy the **Bot User OAuth Token** (starts with `xoxb-...`)

### 7. Get the Signing Secret

1. Go to "Basic Information"
2. Under "App Credentials", copy the **Signing Secret**

## Project Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in the variables in `.env`:
```
SLACK_BOT_TOKEN=xoxb-... (from step 6)
SLACK_SIGNING_SECRET=... (from step 7)
SLACK_APP_TOKEN=xapp-... (from step 3)

# Optional configuration
BACKFILL_DAYS=1  # Number of days to scan on startup
```

## Running the Bot

### Development Mode
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Usage

### 1. Invite the Bot
Invite the bot to your channels:
```
/invite @MyThreads
```

### 2. Rename Threads
Give threads meaningful names by posting a rename command:
```
name: Project Planning
```

The thread will be renamed and marked as manually tracked. You can configure additional rename prefixes in `RENAME_PREFIXES`.

### 3. List Your Threads
Use the `/mythreads` command to see all your open, manually renamed threads:
```
/mythreads
```

This will show an ephemeral message (only visible to you) with:
- Thread name (clickable link)
- Channel where the thread is located

**Note**: Only threads you've manually renamed will appear.

### 4. Close Threads
Mark a thread as closed by posting a close keyword:
```
close
```

Closed threads won't appear in `/mythreads` anymore. You can configure additional close keywords in `CLOSE_KEYWORDS`.

## Configuration

### Environment Variables (.env)

- `BACKFILL_DAYS` (default: `1`)
  - Number of days of history to scan on startup
  - Can be configured in `.env` file

### Code Configuration (src/config.ts)

- `CLOSE_KEYWORDS` (default: `["close", ":lock:"]`)
  - Array of keywords to mark a thread as closed (case insensitive)

- `RENAME_PREFIXES` (default: `["name:", ":thread:", "rename:"]`)
  - Array of prefixes to rename a thread (e.g., "name: New Name", ":thread: New Name")

## How It Works

### Thread Tracking
- The bot listens to all messages in channels where it's invited
- A "thread" is a message with at least one reply
- Single messages without replies are not tracked

### Thread Naming
- By default, thread names are the first 30 characters of the root message
- Use a rename prefix (e.g., `name:`) followed by a custom name in any reply to rename the thread
- Only manually renamed threads appear in `/mythreads`
- The `isManuallyRenamed` flag tracks this

### Thread Status
- **Open**: Default state, or when last message is not one of the close keywords
- **Closed**: When the exact last message is one of the close keywords (case insensitive)

### Backfill
On startup, the bot:
1. Lists all channels where it's a member
2. Fetches thread history for the last N days (`BACKFILL_DAYS`)
3. Rebuilds thread state including names and status
4. Continues tracking in real-time via message events

### In-Memory Storage
- All data stored in RAM using `Map` and `Set`
- Fast and lightweight
- No persistence between restarts (relies on backfill)

## Architecture

```
src/
  ├── index.ts      # Entry point, Bolt app initialization
  ├── config.ts     # Configuration constants and env vars
  ├── store.ts      # In-memory store (Map/Set), data types
  ├── backfill.ts   # History scan on startup
  ├── handlers.ts   # Real-time message event handlers
  └── commands.ts   # /mythreads slash command
```

## Example Workflow

1. Start a discussion in a thread
2. Rename it: `name: Q4 Planning`
3. Have a conversation...
4. Use `/mythreads` to see all your active discussions
5. When done, post `close` to mark it complete
6. Thread disappears from `/mythreads`

## Limitations

- No persistence: data is lost on restart (backfill rebuilds from history)
- No message edit/delete tracking
- Single workspace only
- Requires Socket Mode (not suitable for large-scale deployment)
