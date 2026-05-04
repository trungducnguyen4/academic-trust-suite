import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedRedisModule } from '../redis/redis.module';

@Module({
  imports: [
    SharedRedisModule,
    PrismaModule,
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
