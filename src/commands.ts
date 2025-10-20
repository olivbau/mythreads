import { App } from '@slack/bolt';
import { getUserOpenRenamedThreads } from './store';
import { formatTimeAgo } from './helpers';

/**
 * Sets up the /mythreads command
 */
export function setupCommands(app: App): void {
  app.command('/mythreads', async ({ command, ack, respond, client }) => {
    await ack();

    const userId = command.user_id;

    try {
      // Get all open renamed threads for the user
      const openThreads = getUserOpenRenamedThreads(userId);

      if (openThreads.length === 0) {
        await respond({
          text: "You don't have any manually renamed open threads at the moment.",
          response_type: 'ephemeral',
        });
        return;
      }

      // Generate permalinks for each thread
      const threadLinks: string[] = [];

      for (const thread of openThreads) {
        try {
          const permalinkResult = await client.chat.getPermalink({
            channel: thread.channel,
            message_ts: thread.ts,
          });

          const timeAgo = formatTimeAgo(thread.createdAt);

          if (permalinkResult.permalink) {
            threadLinks.push(`• <${permalinkResult.permalink}|${thread.name}> in <#${thread.channel}> (${timeAgo})`);
          }
        } catch (err) {
          console.error('[Command] Error fetching permalink:', err);
          const timeAgo = formatTimeAgo(thread.createdAt);
          threadLinks.push(`• ${thread.name} in <#${thread.channel}> (${timeAgo}) (link unavailable)`);
        }
      }

      // Format the response
      const message = [
        `You have *${openThreads.length} open thread(s)*:`,
        '',
        ...threadLinks,
      ].join('\n');

      await respond({
        text: message,
        response_type: 'ephemeral',
      });
    } catch (err) {
      console.error('[Command] Error processing /mythreads:', err);
      await respond({
        text: 'An error occurred while fetching your threads.',
        response_type: 'ephemeral',
      });
    }
  });
}
