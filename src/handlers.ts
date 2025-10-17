import { App } from '@slack/bolt';
import { upsertThread, getThread, extractRenameCommand, generateThreadName } from './store';

/**
 * Sets up event handlers for messages
 */
export function setupMessageHandlers(app: App): void {
  // Listen to all messages (root and replies)
  app.event('message', async ({ event, client }) => {
    // Filter special messages (bot_message, message_changed, etc.)
    if (event.subtype) {
      return;
    }

    // We only want normal messages
    if (!('text' in event) || !event.user || !event.ts || !event.channel) {
      return;
    }

    const channel = event.channel as string;
    const ts = event.ts as string;
    const text = event.text as string;
    const user = event.user as string;
    const thread_ts = event.thread_ts;

    // Determine if it's a root message or a reply
    const isReply = thread_ts && thread_ts !== ts;

    if (isReply && thread_ts) {
      // It's a reply in an existing thread
      await handleThreadReply(channel, thread_ts, text, user, client);
    } else {
      // It's a root message without replies - ignore it
      // Threads are only created when there's at least one reply
      console.log(`[Handler] Root message received (ignored until reply): ${channel}:${ts}`);
    }
  });
}

/**
 * Handles a reply in an existing thread
 */
async function handleThreadReply(
  channel: string,
  threadTs: string,
  text: string,
  user: string,
  client: any
): Promise<void> {
  // Get existing thread
  let thread = getThread(channel, threadTs);

  if (!thread) {
    // Thread not in memory yet (can happen if backfill didn't get everything)
    // We'll fetch all replies to rebuild the thread
    console.log(`[Handler] Unknown thread, rebuilding: ${channel}:${threadTs}`);

    try {
      const repliesResult = await client.conversations.replies({
        channel,
        ts: threadTs,
        limit: 1000,
      });

      if (!repliesResult.messages || repliesResult.messages.length === 0) {
        console.error(`[Handler] Unable to fetch thread messages`);
        return;
      }

      // Extract participants
      const participants = new Set<string>();
      for (const msg of repliesResult.messages) {
        if (msg.user) {
          participants.add(msg.user);
        }
      }

      // First message is the root, last message is the last in the list
      const rootMsg = repliesResult.messages[0];
      const lastMsg = repliesResult.messages[repliesResult.messages.length - 1];
      const rootMessageText = rootMsg.text || '';
      const lastMessageText = lastMsg.text || '';

      // Calculate thread name: check for rename command, otherwise generate from root
      let threadName: string;
      let isManuallyRenamed = false;
      let customName: string | undefined;
      for (let i = repliesResult.messages.length - 1; i >= 0; i--) {
        const msg = repliesResult.messages[i];
        const msgText = msg.text || '';
        const extractedName = extractRenameCommand(msgText);
        if (extractedName) {
          customName = extractedName;
          isManuallyRenamed = true;
          break; // Use the most recent rename command
        }
      }
      threadName = customName || generateThreadName(rootMessageText);

      // Create the thread
      upsertThread(channel, threadTs, threadName, isManuallyRenamed, participants, lastMessageText);
      console.log(`[Handler] Thread rebuilt: ${channel}:${threadTs}`);
    } catch (err) {
      console.error(`[Handler] Error rebuilding thread:`, err);
    }
  } else {
    // Existing thread: update participants and last message
    thread.participants.add(user);

    // Calculate thread name: check for rename command, otherwise keep existing name
    const renamedName = extractRenameCommand(text);
    const threadName = renamedName || thread.name;
    const isManuallyRenamed = renamedName ? true : thread.isManuallyRenamed;

    if (renamedName) {
      console.log(`[Handler] Thread renamed to "${renamedName}": ${channel}:${threadTs}`);
    } else {
      console.log(`[Handler] Thread updated: ${channel}:${threadTs}`);
    }

    upsertThread(channel, threadTs, threadName, isManuallyRenamed, thread.participants, text);
  }
}
