import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

const app = createApp();

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    const server = app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     ▄▄▄       ██▓ ██▀███   ██▒   █▓ ▄▄▄       █    ██  ██▓   ║
║    ▒████▄    ▓██▒▓██ ▒ ██▒▓██░   █▒▒████▄     ██  ▓██▒▓██▒   ║
║    ▒██  ▀█▄  ▒██▒▓██ ░▄█ ▒ ▓██  █▒░▒██  ▀█▄  ▓██  ▒██░▒██░   ║
║    ░██▄▄▄▄██ ░██░▒██▀▀█▄    ▒██ █░░░██▄▄▄▄██ ▓▓█  ░██░▒██░   ║
║     ▓█   ▓██▒░██░░██▓ ▒██▒   ▒▀█░   ▓█   ▓██▒▒▒█████▓ ░██████║
║     ▒▒   ▓▒█░░▓  ░ ▒▓ ░▒▓░   ░ ▐░   ▒▒   ▓▒█░░▒▓▒ ▒ ▒ ░ ▒░▓  ║
║      ▒   ▒▒ ░ ▒ ░  ░▒ ░ ▒░   ░ ░░    ▒   ▒▒ ░░░▒░ ░ ░ ░ ░ ▒  ║
║      ░   ▒    ▒ ░  ░░   ░      ░░    ░   ▒    ░░░ ░ ░   ░ ░  ║
║          ░    ░     ░           ░        ░      ░         ░  ║
║                                ░                             ║
╠═══════════════════════════════════════════════════════════════╣
║  🚀 Server running on http://localhost:${config.port}                  ║
║  📚 API: http://localhost:${config.port}/api/${config.apiVersion}                        ║
║  🌍 Environment: ${config.env.padEnd(42)}║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          await disconnectDatabase();
          console.log('All connections closed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
