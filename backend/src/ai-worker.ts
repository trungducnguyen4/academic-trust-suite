import { NestFactory } from '@nestjs/core';
import { AiWorkerModule } from './ai-worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AiWorkerModule, {
    logger: ['log', 'warn', 'error'],
  });

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('AI worker started and waiting for queued jobs.');
}

bootstrap().catch((error) => {
  console.error('Failed to start AI worker:', error);
  process.exit(1);
});
