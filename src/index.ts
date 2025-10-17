import { App, LogLevel } from '@slack/bolt';
import { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN } from './config';
import { runBackfill } from './backfill';
import { setupMessageHandlers } from './handlers';
import { setupCommands } from './commands';
import { getThreadCount } from './store';

// Initialize Bolt app in Socket Mode
const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: SLACK_APP_TOKEN,
  logLevel: LogLevel.INFO,
});

// Setup handlers and commands
setupMessageHandlers(app);
setupCommands(app);

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Bolt app started in Socket Mode!');

    // Run backfill at startup
    await runBackfill(app);
    console.log(`📊 Store initialized with ${getThreadCount()} threads.`);

    console.log('✅ Bot ready to receive events!');
  } catch (error) {
    console.error('Error starting app:', error);
    process.exit(1);
  }
})();
