import { App } from '@slack/bolt';
import { BACKFILL_DAYS } from './config';
import { upsertThread, extractRenameCommand, generateThreadName } from './store';

/**
 * Runs backfill: fetches recent thread history
 */
export async function runBackfill(app: App): Promise<void> {
  console.log(`[Backfill] Starting backfill (${BACKFILL_DAYS} days)...`);

  const now = Math.floor(Date.now() / 1000);
  const oldest = now - BACKFILL_DAYS * 24 * 60 * 60; // Timestamp in seconds

  try {
    // 1. List all channels where the bot is present
    const channelsResult = await app.client.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 1000,
    });

    if (!channelsResult.channels) {
      console.log('[Backfill] No channels found.');
      return;
    }

    // Filter channels where the bot is a member
    const memberChannels = channelsResult.channels.filter((ch) => ch.is_member);
    console.log(`[Backfill] ${memberChannels.length} channels found.`);

    // 2. For each channel, fetch history
    for (const channel of memberChannels) {
      if (!channel.id) continue;

      console.log(`[Backfill] Scanning channel: ${channel.name} (${channel.id})`);

      try {
        const historyResult = await app.client.conversations.history({
          channel: channel.id,
          oldest: oldest.toString(),
          limit: 1000,
        });

        if (!historyResult.messages) continue;

        // 3. Identify threads (messages with reply_count > 0)
        const threadRoots = historyResult.messages.filter(
          (msg) => msg.reply_count && msg.reply_count > 0
        );

        console.log(`[Backfill]   -> ${threadRoots.length} threads found`);

        // 4. For each thread, fetch replies
        for (const root of threadRoots) {
          if (!root.ts) continue;

          try {
            const repliesResult = await app.client.conversations.replies({
              channel: channel.id,
              ts: root.ts,
              limit: 1000,
            });

            if (!repliesResult.messages || repliesResult.messages.length === 0) {
              continue;
            }

            // Extract participants (all users who posted)
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

            // Upsert in store
            upsertThread(channel.id, root.ts, threadName, isManuallyRenamed, participants, lastMessageText);
          } catch (err) {
            console.error(`[Backfill] Error fetching replies:`, err);
          }
        }
      } catch (err) {
        console.error(`[Backfill] Error fetching history:`, err);
      }
    }

    console.log('[Backfill] Backfill complete.');
  } catch (err) {
    console.error('[Backfill] General error:', err);
  }
}
