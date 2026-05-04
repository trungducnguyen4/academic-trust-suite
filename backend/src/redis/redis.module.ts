import { Module, Global } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';

@Global()
@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      },
    }),
  ],
  exports: [RedisModule],
})
export class SharedRedisModule {}
