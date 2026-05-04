# Question V2 Implementation Assets

This document lists implementation assets added for Question V2 rollout.

## 1) Prisma migration proposals by phase

- `prisma/migration-proposals/phase-01-expand-schema/migration.sql`
- `prisma/migration-proposals/phase-02-enforce-v2-read/migration.sql`
- `prisma/migration-proposals/phase-03-contract-cleanup/migration.sql`

Important:
- These files are proposal SQL and intentionally kept outside `prisma/migrations`.
- Validate in staging first due to existing schema drift in this repository.

## 2) NestJS DTO + controller contracts

- `backend/src/questions-v2/dto/question-draft.dto.ts`
- `backend/src/questions-v2/dto/question-v2-query.dto.ts`
- `backend/src/questions-v2/question-drafts.controller.ts`
- `backend/src/questions-v2/ai-generation-jobs.controller.ts`
- `backend/src/questions-v2/questions-v2-contracts.module.ts`

These controllers are contract-first stubs and currently throw `NotImplementedException`.

## 3) Backfill script (TypeScript, batch/cursor)

- `backend/scripts/backfill-question-v2.ts`

Example run:

```bash
cd backend
npx ts-node scripts/backfill-question-v2.ts
```

Optional environment variables:
- `BACKFILL_BATCH_SIZE=200`
- `BACKFILL_START_CURSOR=<questionId>`
- `BACKFILL_DRY_RUN=1`
