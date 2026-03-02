import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// Import from parent project's node_modules where Prisma client is generated
const { PrismaClient } = require('../../../node_modules/@prisma/client');

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
