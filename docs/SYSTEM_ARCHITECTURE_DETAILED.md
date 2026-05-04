# Academic Trust Suite — System Architecture & Implementation (2026-04-29)

**Document**: Comprehensive technical specification of three major backend systems:
1. **Exam Snapshot Architecture** — Immutability & Auditability
2. **Event + Queue Durable System** — Critical event persistence & real-time pub/sub
3. **Rate Limiting + Load Protection** — Distributed token-bucket limiter for 2000–5000 concurrent users

---

## 1. Exam Snapshot Architecture

### 1.1 Problem Statement
- **Before**: Exam questions loaded directly from question bank at exam time. If lecturer edits a question after publish, student's submission links to the *edited* version, not the version they saw.
- **After**: Snapshot captures exam/questions at publish time; submissions reference immutable snapshots, enabling true audit trails.

### 1.2 Schema

```prisma
model ExamSnapshot {
  id         String   @id @default(uuid())
  examId     String
  exam       Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  title      String                 // snapshot of exam title
  payload    Json?                  // exam-level settings/metadata at publish time
  createdBy  String?                // user who triggered publish
  createdAt  DateTime @default(now())
  publishedAt DateTime?              // when exam was published

  questions  ExamQuestionSnapshot[]  // 1:N to exam question snapshots
  @@index([examId])
  @@map("exam_snapshots")
}

model ExamQuestionSnapshot {
  id                String   @id @default(uuid())
  examSnapshotId    String
  examSnapshot      ExamSnapshot @relation(fields: [examSnapshotId], references: [id], onDelete: Cascade)
  questionId        String      // link to original question (for history lookup)
  questionVersionId String?     // explicit version used at snapshot time
  questionSnapshotId String?    // FK to materialized question snapshot
  orderIndex        Int         // question position in exam
  points            Int?        // points at snapshot time
  payload           Json?       // denormalized question payload (for fast access)

  questionSnapshot  QuestionSnapshot? @relation(fields: [questionSnapshotId], references: [id])

  @@index([examSnapshotId])
  @@index([questionId])
  @@map("exam_question_snapshots")
}

model QuestionSnapshot {
  id               String   @id @default(uuid())
  originalQuestionId String  // original question ID (for searching/linking)
  questionVersionId String  // version ID frozen in this snapshot
  payload          Json?   // stem, options, correctAnswer, explanation (all student-visible data)
  createdAt        DateTime @default(now())

  examQuestionLinks ExamQuestionSnapshot[]

  @@index([originalQuestionId])
  @@index([questionVersionId])
  @@map("question_snapshots")
}

model ExamSubmission {
  // ... existing fields ...
  examSnapshotId String?         // NEW: reference to snapshot this submission used
  examSnapshot   ExamSnapshot? @relation(fields: [examSnapshotId], references: [id])
  // ... rest of fields ...
}

model SubmissionAnswer {
  // ... existing fields ...
  questionSnapshotId String?     // NEW: reference to snapshot of question
  questionSnapshot   QuestionSnapshot? @relation(fields: [questionSnapshotId], references: [id])
  // ... rest of fields ...
}
```

### 1.3 Data Flow

#### 1.3.1 Publish Exam Flow

```
Lecturer calls POST /exams/{examId}/publish
   ↓
ExamsService.publishExam(id)
   ↓
[Transaction Start]
   1. Fetch exam + all examQuestions with orderIndex
   2. For each question:
      a. If question.questionVersionId exists, use it; else fetch latest
      b. Create QuestionSnapshot { originalQuestionId, questionVersionId, payload: version.payload }
      c. Create ExamQuestionSnapshot { examSnapshotId, questionId, questionVersionId, questionSnapshotId, orderIndex, payload, points }
   3. Create ExamSnapshot { examId, title, payload: exam.settings, createdBy, publishedAt }
   4. Update Exam { status: 'PUBLISHED' }
[Transaction End]
   ↓
Notify students: "Exam published"
   ↓
Return publishedExam to lecturer

Example SQL (implicit via Prisma transaction):
BEGIN;
  INSERT INTO question_snapshots (id, original_question_id, question_version_id, payload)
    VALUES ('qs-1', 'q-101', 'qv-101-v5', '{"stem": "...", "options": [...]}');
  
  INSERT INTO exam_question_snapshots (id, exam_snapshot_id, question_id, question_snapshot_id, order_index, points)
    VALUES ('eqs-1', 'snap-exam-1', 'q-101', 'qs-1', 1, 5);
  
  INSERT INTO exam_snapshots (id, exam_id, title, payload, published_at)
    VALUES ('snap-exam-1', 'exam-1', 'Midterm 2026', {...}, now());
  
  UPDATE exams SET status='PUBLISHED' WHERE id='exam-1';
COMMIT;
```

#### 1.3.2 Start Exam Flow

```
Student calls POST /submissions/start
   ↓
SubmissionsService.startExam(startExamDto, studentId)
   ↓
1. Check enrollment, exam status (PUBLISHED/ONGOING)
2. Fetch latest ExamSnapshot WHERE examId = startExamDto.examId
   ORDER BY publishedAt DESC LIMIT 1
3. Create ExamSubmission {
     examId,
     studentId,
     examSnapshotId: (snapshot.id ?? null),  // Link to snapshot, not to bank
     attemptNo: (nextAttemptNo),
     status: 'IN_PROGRESS',
     startedAt: now
   }
4. Create ProctoringSession for this submission
5. Return { submissionId, examId, title, duration, examSnapshotId }
   ↓
Student browser loads exam → queries snapshot questions, not bank

Key Point: studentId never directly loads from Question/QuestionVersion; 
instead loads from examSnapshot.questions[].payload
```

#### 1.3.3 Autosave with Snapshot

```
Student calls POST /submissions/{submissionId}/autosave { answers: [...] }
   ↓
SubmissionsService.autosaveAnswers(submissionId, payload, studentId)
   ↓
1. Fetch submission (include examSnapshotId)
2. Check status = 'IN_PROGRESS'
3. Backpressure check: if queue.integrity-logs.waiting > 1000 → return { success: false }
4. [Transaction Start]
   a. Lock submission row: UPDATE examSubmission SET lastActivityAt=NOW() WHERE status='IN_PROGRESS'
   b. For each answer in payload:
      - Compare sequence: only accept if incoming.sequence > stored.sequence
      - If creating new answer:
        * Lookup questionSnapshotId from examSnapshot.questions WHERE questionId = ...
        * Create SubmissionAnswer {
            questionSnapshotId: (mapped from snapshot),
            sequence: incoming.sequence,
            serverVersion: (increment),
            ...
          }
   c. Increment submission.version
   d. Set submission.lastAutosaveAt = NOW()
[Transaction End]
   ↓
Return { success: true, count, skipped, serverVersion }
```

#### 1.3.4 Submit Exam Flow (Snapshot Preservation)

```
Student calls POST /submissions/{submissionId}/submit { logs: [...], answers: [...] }
   ↓
SubmissionsService.submitExam(submissionId, payload, studentId)
   ↓
[Transaction Start]
   1. Lock: UPDATE examSubmission 
      WHERE id = submissionId AND studentId AND status = 'IN_PROGRESS'
      SET status = 'SUBMITTING', version = version + 1
   2. If locked count === 0 → error "Already submitted"
   3. Fetch current submission (include answers, examSnapshot.questions[])
   4. For each answer in submission.answers:
      - Match answer.questionSnapshotId to examSnapshot.questions[]
      - If examSnapshot question exists, preserve the matched question payload
      - Compare answer against matched snapshot payload (not bank)
      - Grade based on snapshot content
   5. Create final grading result
   6. Set submission.finalSnapshotVersion = snapshot.publishedAt (or version number)
   7. Update submission { status: 'SUBMITTED', submittedAt: NOW(), score: ... }
[Transaction End]
   ↓
Emit critical event: 'SUBMISSION_RECEIVED' with snapshot context
   ↓
Queue integrity logs + grading for background workers
```

### 1.4 Key Design Decisions

| Concern | Decision | Rationale |
|---------|----------|-----------|
| **Data Duplication** | Snapshot stores full question payload (Json field), not just reference | Fast lookup during grading; no risk of broken links if question deleted |
| **Versioning** | QuestionSnapshot references exact QuestionVersion; ExamSnapshot versioned by publishedAt | Audit trail: can replay exact grading logic for any historical submission |
| **Cascading Deletes** | ExamSnapshot cascade-delete on exam delete; QuestionSnapshot no cascade (keep audit history) | Avoid data loss; archived exams keep their snapshots |
| **Handling Republish** | Each publish creates new ExamSnapshot; old snapshots remain untouched | New snapshot for new batch of students; old submissions still valid |
| **Handling Clone/Randomize** | Implement via exam.settings JSON; snapshot created *after* clone/setup | Cloned exam gets its own snapshot on first publish |
| **Backfill Old Exams** | Migration script: for each exam(status='PUBLISHED'), create snapshot if not exists | One-time job; preserves backward compatibility |

### 1.5 Migration Strategy (Production)

```sql
-- Phase 1: Create snapshots for all PUBLISHED exams without snapshots (no downtime)
INSERT INTO exam_snapshots (id, exam_id, title, payload, created_by, created_at, published_at)
SELECT 
  UUID(), 
  exams.id,
  exams.title,
  exams.settings,
  exams.creator_id,
  exams.updated_at,
  exams.updated_at
FROM exams
WHERE exams.status = 'PUBLISHED' 
  AND NOT EXISTS (SELECT 1 FROM exam_snapshots WHERE exam_snapshots.exam_id = exams.id);

-- Phase 2: Backfill exam_question_snapshots + question_snapshots
INSERT INTO question_snapshots (...)
SELECT ...
FROM exam_questions eq
JOIN exams e ON e.id = eq.exam_id
WHERE NOT EXISTS (SELECT 1 FROM question_snapshots ...);

-- Phase 3: Dual-write for new submissions (if rolling update)
ExamSubmission.create() → set examSnapshotId if available, else NULL
ExamSubmission.autosaveAnswers() → try to set questionSnapshotId, else NULL

-- Phase 4: Gradual migration of old submissions (async, no urgency)
UPDATE exam_submissions 
SET exam_snapshot_id = (SELECT id FROM exam_snapshots WHERE exam_id = exams.id LIMIT 1)
WHERE exam_snapshot_id IS NULL AND status IN ('SUBMITTED', 'GRADED');
```

---

## 2. Event + Queue Durable System

### 2.1 Problem Statement
- **Before**: Redis pub/sub only for realtime events (ephemeral); no guaranteed delivery; queue for background jobs only (not tracking events as a distinct stream).
- **After**: Separate critical and non-critical events; critical events persisted with idempotency and retry; realtime pub/sub for UI; background workers process durable events.

### 2.2 Event Classification

```
Critical Events (persisted to EventStore, enqueued for processing):
  - SUBMISSION_RECEIVED      (audit trail, grading trigger)
  - INTEGRITY_RISK_DETECTED  (integrity investigation, flagging)
  - EXAM_PUBLISHED           (historical record)

Non-Critical Events (realtime pub/sub only, ephemeral):
  - TAB_SWITCH               (UI proctoring UI update)
  - MOUSE_ANOMALY            (realtime monitoring)
  - STUDENT_SUBMITTED        (UI update, not audit)
  - EXAM_STARTED             (notification, can miss)
```

### 2.3 Schema

```prisma
model EventStore {
  id         String   @id @default(uuid())
  dedupId    String?  @db.VarChar(255)  // optional client-supplied idempotency key
  kind       String                    // e.g. 'SUBMISSION_RECEIVED'
  payload    Json                      // event data
  critical   Boolean  @default(false)
  status     String   @default("PENDING")  // PENDING, PROCESSING, PROCESSED, FAILED
  attempts   Int      @default(0)
  lastError  String?  @db.Text
  source     String?                   // which API instance emitted
  createdAt  DateTime @default(now())
  processedAt DateTime?

  @@index([dedupId])                  // for idempotency lookup
  @@index([kind])                     // for filtering by event type
  @@index([status])                   // for monitoring failed events
  @@map("event_store")
}
```

### 2.4 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Application Service Layer                       │
│              (SubmissionsService, ExamsService, etc.)               │
└───────────────┬──────────────────────────┬──────────────────────────┘
                │                          │
                │ .publishEvent({          │ .enqueueIntegrityLogs()
                │   kind: 'SUBMISSION...', │
                │   critical: true         │ Direct queue
                │ })                       │
                ↓                          ↓
        ┌──────────────────────────────────────────────┐
        │         QueueService.publishEvent()          │
        │  - Emit to Redis pub/sub (realtime)          │
        │  - If critical: create EventStore + enqueue  │
        └──────┬─────────────────────────┬─────────────┘
               │                         │
      Non-Critical              Critical Path
      (Ephemeral)              (Durable)
           │                         │
           ↓                         ↓
      ┌─────────────┐         ┌──────────────────────┐
      │ Redis Pub   │         │ EventStore (MySQL)   │
      │ /Sub        │         │ status=PENDING       │
      │ channels:   │         └──────┬───────────────┘
      │ - exam:X    │                │
      │ - role:Y    │                ↓
      │ - events:Z  │         ┌──────────────────────┐
      └─────┬───────┘         │ Bull Queue 'events'  │
            │                 │ (Redis backing)      │
            ↓                 └──────┬───────────────┘
      ┌──────────────┐              │
      │ WebSocket    │              ↓
      │ Connection   │       ┌───────────────────────┐
      │ (Frontend)   │       │ EventsProcessor       │
      └──────────────┘       │ - Try process event   │
                             │ - Update status       │
                             │ - On fail: retry      │
                             └───────┬───────────────┘
                                     │
                                     ↓
                              EventStore
                            status=PROCESSED
                            OR status=FAILED
                            (after max retries)
```

### 2.5 Implementation Details

#### 2.5.1 QueueService.publishEvent()

```typescript
async publishEvent(opts: {
  kind: string;           // e.g. 'SUBMISSION_RECEIVED'
  payload: any;
  critical?: boolean;
  dedupId?: string;       // client-supplied idempotency key
  channel?: string;       // override realtime channel
  source?: string;        // e.g. 'api-instance-1'
}): Promise<void> {
  const { kind, payload, critical = false, dedupId, channel, source } = opts;

  const event = {
    kind,
    payload,
    timestamp: new Date().toISOString(),
    source: source || process.env.HOSTNAME || 'api-instance',
  };

  // Step 1: Realtime publish (non-blocking fire-and-forget)
  try {
    const targetChannel = channel || `events:${kind}`;
    await this.events.emitEvent(targetChannel, event);
    // Published to Redis pub/sub for WebSocket consumers
  } catch (err) {
    this.logger.error('Realtime publish failed: ' + String(err));
    // Non-fatal; continue with durable path
  }

  if (!critical) return; // Done for non-critical

  // Step 2: Durable path for critical events
  // 2a. Persist event record
  const record = await this.prisma.eventStore.create({
    data: {
      dedupId: dedupId || null,      // for idempotency
      kind,
      payload,
      critical: true,
      source: source || process.env.HOSTNAME,
      status: 'PENDING',
      attempts: 0,
    },
  });

  // 2b. Enqueue for processing
  await this.eventsQueue.add({ eventId: record.id, event }, {
    attempts: 5,                       // Retry up to 5 times
    backoff: { type: 'exponential', delay: 2000 },  // 2s, 4s, 8s, 16s, 32s
    removeOnComplete: true,            // Clean job after success
    removeOnFail: false,               // Keep failed jobs for inspection
  });
}
```

#### 2.5.2 EventsProcessor

```typescript
@Processor('events')
export class EventsProcessor {
  @Process()
  async processEvent(job: Job<any>): Promise<void> {
    const { eventId, event } = job.data;

    try {
      // Mark as processing
      if (eventId) {
        await this.prisma.eventStore.update({
          where: { id: eventId },
          data: {
            status: 'PROCESSING',
            attempts: { increment: 1 }
          }
        });
      }

      // TODO: Route to concrete handler based on event.kind
      // Example:
      // switch (event.kind) {
      //   case 'SUBMISSION_RECEIVED':
      //     await this.handleSubmissionReceived(event.payload);
      //     break;
      //   case 'INTEGRITY_RISK_DETECTED':
      //     await this.handleIntegrityRisk(event.payload);
      //     break;
      // }

      // Mark as processed
      if (eventId) {
        await this.prisma.eventStore.update({
          where: { id: eventId },
          data: {
            status: 'PROCESSED',
            processedAt: new Date()
          }
        });
      }

      this.logger.log(`Processed durable event ${event?.kind}`);
    } catch (err) {
      // Retry will be handled by Bull; record error
      if (eventId) {
        const record = await this.prisma.eventStore.findUnique({ where: { id: eventId } });
        const attempts = (record?.attempts || 0) + 1;
        const maxAttempts = 5;
        if (attempts >= maxAttempts) {
          // Dead-letter
          await this.prisma.eventStore.update({
            where: { id: eventId },
            data: {
              status: 'FAILED',
              lastError: String((err as Error)?.message || err)
            }
          });
        } else {
          await this.prisma.eventStore.update({
            where: { id: eventId },
            data: {
              lastError: String((err as Error)?.message || err)
            }
          });
        }
      }
      throw err; // Bull retries
    }
  }
}
```

#### 2.5.3 Realtime Pub/Sub Channels

```typescript
// DistributedEventsService (Redis pub/sub)

Channels published to:
  events:{kind}              // Generic event channel (e.g. events:SUBMISSION_RECEIVED)
  exam:{examId}:events       // Exam-specific real-time (proctoring)
  role:{role}:notifications  // Role-based (ADMIN, LECTURER)
  
Example:
  await this.events.emitEvent('exam:exam-123:events', {
    kind: 'TAB_SWITCH',
    studentId: 'student-456',
    timestamp: now
  });

Frontend subscribes:
  const examEvents$ = submissionsEventsService.subscribeToExamEvents(examId);
  examEvents$.subscribe(event => {
    // Update proctoring UI in real-time
    if (event.kind === 'TAB_SWITCH') {
      updateTabSwitchCounter(event.studentId);
    }
  });
```

### 2.6 Idempotency Strategy

```typescript
// When emitting critical event, optionally provide dedupId
await queueService.publishEvent({
  kind: 'SUBMISSION_RECEIVED',
  payload: { submissionId: '...' },
  critical: true,
  dedupId: `submission:${submissionId}`, // idempotency key
});

// Processor checks for duplicate before processing
const existing = await prisma.eventStore.findFirst({
  where: { dedupId, kind, status: 'PROCESSED' }
});
if (existing) return; // Already processed, skip

// On success, status='PROCESSED', so retry of same dedupId is skipped
```

### 2.7 Monitoring & Dead-Letter Queue

```typescript
// Admin endpoint to inspect failures
GET /admin/events?status=FAILED&kind=SUBMISSION_RECEIVED

Response:
{
  items: [
    {
      id: 'evt-123',
      kind: 'SUBMISSION_RECEIVED',
      status: 'FAILED',
      attempts: 5,
      lastError: 'Timeout connecting to grading service',
      createdAt: '2026-04-29T...',
      processedAt: null,
      payload: { ... }
    }
  ],
  count: 3,
  page: 1
}

// Re-enqueue failed event
POST /admin/events/{eventId}/retry

// Behind the scenes:
// 1. Update status back to PENDING
// 2. Re-add to Bull queue with fresh retry budget
// 3. Processor will attempt again
```

---

## 3. Rate Limiting + Load Protection

### 3.1 Problem Statement
- **Scale**: 2000–5000 concurrent users during peak exam periods.
- **Goals**:
  - Prevent submission spike from overwhelming database.
  - Protect realtime integrity monitoring from autosave floods.
  - Allow graceful degradation when overloaded.

### 3.2 Rate Limiting Policies (Token Bucket)

Each policy has **three dimensions**: per-user, per-IP, per-exam. An endpoint is rate-limited if it matches any policy. If *any* dimension is exceeded, request is rejected with HTTP 429.

```typescript
const POLICIES: Record<string, {
  perUser?: { capacity: number; refillPerSecond: number };
  perIp?: { capacity: number; refillPerSecond: number };
  perExam?: { capacity: number; refillPerSecond: number };
}> = {
  start: {
    // A single user can start an exam once every 30 seconds
    perUser: { capacity: 1, refillPerSecond: 1/30 },
    
    // All users from single IP can start exams at most 10 in 6 seconds
    perIp: { capacity: 10, refillPerSecond: 10/60 },
    
    // Entire exam can handle 200 concurrent start requests per second
    perExam: { capacity: 200, refillPerSecond: 200 },
  },

  autosave: {
    // User can autosave up to 10 times immediately, then 0.5/sec (1 every 2 seconds sustained)
    perUser: { capacity: 10, refillPerSecond: 0.5 },
    
    // IP can autosave 50 requests immediately, then 1/sec
    perIp: { capacity: 50, refillPerSecond: 1 },
    
    // Exam can handle 1000 autosave requests immediately, then 1000/sec sustained
    perExam: { capacity: 1000, refillPerSecond: 1000 },
  },

  submit: {
    // User can submit once every 60 seconds
    perUser: { capacity: 1, refillPerSecond: 1/60 },
    
    // IP can submit 20 requests per minute
    perIp: { capacity: 20, refillPerSecond: 20/60 },
    
    // Exam can handle 200 submissions/second
    perExam: { capacity: 200, refillPerSecond: 200 },
  },

  integrity: {
    // User can send 200 integrity logs immediately, then 10/second
    perUser: { capacity: 200, refillPerSecond: 10 },
    
    // IP can send 2000 logs immediately, then 100/second
    perIp: { capacity: 2000, refillPerSecond: 100 },
    
    // Exam can handle 5000 logs immediately, then 500/second
    perExam: { capacity: 5000, refillPerSecond: 500 },
  },
};
```

### 3.3 Token Bucket Algorithm (Redis Lua Script)

```lua
-- Distributed Token Bucket via Redis
-- Returns: { allowed(1|0), remainingTokens, retryAfterMs }

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- Fetch current tokens and last refill time
local row = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(row[1]) or capacity
local ts = tonumber(row[2]) or now

-- Calculate elapsed time and refill
local delta = math.max(0, now - ts)
local refill = (delta / 1000.0) * rate
tokens = math.min(capacity, tokens + refill)

-- Check if we have enough tokens
local allowed = 0
if tokens >= requested then
  allowed = 1
  tokens = tokens - requested
end

-- Persist state and set expiry
redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
local ttl = math.ceil(math.max(1000, (capacity / math.max(1, rate)) * 1000 * 2))
redis.call('PEXPIRE', key, ttl)

-- Calculate retry-after for client
local remaining = math.floor(tokens)
local retryAfter = 0
if allowed == 0 then
  retryAfter = math.ceil(((requested - tokens) / rate) * 1000)
  if retryAfter < 0 then retryAfter = 0 end
end

return { allowed, remaining, retryAfter }
```

**Execution Example (200 users all submitting concurrently)**:
```
POST /submissions/{id}/submit
  → RateLimitGuard checks policy 'submit'
  → Check per-user: key='rl:user:{userId}:submit'
     capacity=1, refill=1/60 (every 60s)
     If user never submitted before: allowed=1
     If user submitted <60s ago: allowed=0 → 429 Too Many Requests
  
  → Check per-IP: key='rl:ip:{ip}:submit'
     capacity=20, refill=20/60 (20 per minute)
     If <20 submissions from this IP in last minute: allowed=1
     If >20: allowed=0 → 429
  
  → Check per-exam: key='rl:exam:{examId}:submit'
     capacity=200, refill=200 (per second)
     If submissions < 200/sec: allowed=1
     If > 200/sec: some requests get 429

Result: Even if 2000 users try to submit simultaneously:
  - Only ~20 per IP pass the per-IP check (one per second for ~60 seconds per IP)
  - Only ~1 per user passes (enforced per-user cap)
  - Exam can handle up to 200/second globally
  - Excess requests return 429 with Retry-After header
```

### 3.4 RateLimitGuard Implementation

```typescript
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector, private limiter: RateLimiterService) {}

  private ipFromRequest(req: any): string {
    const xf = req.headers?.['x-forwarded-for'];
    if (xf && typeof xf === 'string') return xf.split(',')[0].trim();
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyName = this.reflector.get<string>(RATE_LIMIT_KEY, context.getHandler());
    if (!policyName) return true; // No policy, allow

    const policy = POLICIES[policyName];
    if (!policy) return true;

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id || 'anon';
    const ip = this.ipFromRequest(req);
    const examId = req.params?.examId || req.params?.id || req.body?.examId || null;

    // Check per-user
    if (policy.perUser) {
      const key = `rl:user:${userId}:${policyName}`;
      const { allowed } = await this.limiter.consume(key, policy.perUser.capacity, policy.perUser.refillPerSecond, 1);
      if (!allowed) {
        throw new TooManyRequestsException(`Rate limit: ${policyName} per-user exceeded`);
      }
    }

    // Check per-IP
    if (policy.perIp) {
      const key = `rl:ip:${ip}:${policyName}`;
      const { allowed } = await this.limiter.consume(key, policy.perIp.capacity, policy.perIp.refillPerSecond, 1);
      if (!allowed) {
        throw new TooManyRequestsException(`Rate limit: ${policyName} per-ip exceeded`);
      }
    }

    // Check per-exam
    if (policy.perExam && examId) {
      const key = `rl:exam:${examId}:${policyName}`;
      const { allowed } = await this.limiter.consume(key, policy.perExam.capacity, policy.perExam.refillPerSecond, 1);
      if (!allowed) {
        throw new TooManyRequestsException(`Rate limit: ${policyName} per-exam exceeded`);
      }
    }

    return true;
  }
}
```

### 3.5 Decorator & Usage

```typescript
// File: src/common/rate-limit.decorator.ts
export const RateLimit = (policyName: string) => SetMetadata(RATE_LIMIT_KEY, policyName);

// Usage in controller:
@Post('start')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit('start')
startExam(@Body() startExamDto: StartExamDto, @Request() req) {
  return this.submissionsService.startExam(startExamDto, req.user.id, { ... });
}

@Post(':id/submit')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit('submit')
submitExam(@Param('id') id: string, @Body() submitExamDto: SubmitExamDto, @Request() req) {
  return this.submissionsService.submitExam(id, submitExamDto, req.user.id, { ... });
}

@Post(':id/autosave')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit('autosave')
autosaveAnswers(@Param('id') id: string, @Body() autosaveExamDto: AutosaveExamDto, @Request() req) {
  return this.submissionsService.autosaveAnswers(id, autosaveExamDto, req.user.id);
}

@Post(':id/logs')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit('integrity')
addLogs(@Param('id') id: string, @Body() addLogsDto: AddLogsDto, @Request() req) {
  return this.submissionsService.addLogs(id, addLogsDto.logs, req.user.id);
}
```

### 3.6 Backpressure: Queue Overload Protection

```typescript
// File: SubmissionsService.autosaveAnswers()

async autosaveAnswers(submissionId: string, payload: AutosaveExamDto, studentId: string) {
  // ... validation ...

  // BACKPRESSURE CHECK: If integrity-logs queue backlog is high, decline autosave
  const overloaded = await this.queueService.isQueueOverloaded(
    'integrity-logs',
    Number(process.env.QUEUE_WAITING_THRESHOLD_AUTOSAVE || '1000')
  );
  if (overloaded) {
    // Queue has >1000 waiting jobs; prioritize submit over autosave
    this.logger.warn(`Autosave rejected: queue overloaded. waiting=${waiting}`);
    return {
      success: false,
      count: 0,
      skipped: answers.length,
      serverVersion: submission.version || 0
    };
  }

  // Continue with normal autosave logic...
  // [Transaction with DB writes]
  return { success: true, count, skipped, serverVersion };
}
```

**Client behavior on backpressure**:
```javascript
// Frontend - autosave hook
const response = await api.autosave(submissionId, answers);
if (!response.success) {
  // Queue is overloaded, backoff and retry later
  console.log('Autosave declined (server overloaded), will retry in 5 seconds');
  setTimeout(() => this.flushQueue(), 5000);
} else {
  // Success
  setLastAutosaveTime(Date.now());
}
```

### 3.7 Graceful Degradation Priority

```
High Priority (Always processed):
  1. submit      — Final exam submission (must not be dropped)
  2. start       — Exam session initiation (required for student entry)

Medium Priority (Rate-limited but not dropped):
  3. autosave    — Periodic saves (backpressure may defer, not drop)
  4. integrity   — Proctoring logs (queued, can batch/compress)

Implementation:
  - Rate limit ALL endpoints (but at different thresholds)
  - Autosave returns { success: false } when queue overloaded (client retries)
  - submit/start return 429 (client must wait, hard limit)
  - integrity logs batched and compressed before queueing (reduce queue pressure)
```

### 3.8 Fail-Open Strategy

```typescript
// In RateLimiterService.consume()
async consume(key: string, capacity: number, refillPerSecond: number, tokens = 1) {
  try {
    const res = await this.redis.eval(this.tokenBucketScript, 1, key, capacity, refillPerSecond, Date.now(), tokens);
    return { allowed: res[0] === 1, remaining: res[1], retryAfter: res[2] };
  } catch (err) {
    // Redis failure → allow request (fail-open)
    // Rationale: availability > accuracy. If Redis is down, we prefer to 
    // let students submit rather than block them with 429 errors.
    this.logger.error('RateLimiter eval failed: ' + String(err));
    return { allowed: true, remaining: 0, retryAfter: 0 };
  }
}
```

---

## 4. Monitoring & KPIs

### 4.1 Queue Metrics

```
KPI: Queue Lag (per queue)
  Metric: avg(queue.waiting) + avg(queue.active)
  Threshold: 
    - integrity-logs: WARN > 500, CRIT > 1000
    - notifications: WARN > 100, CRIT > 500
    - grading: WARN > 200, CRIT > 500
  Sample Query (Prometheus):
    rate(bull_queue_waiting[5m]) by (queue_name)

KPI: Event Loss
  Metric: EventStore records with status='FAILED'
  Threshold: WARN if count > 10 in 1h
  Query: 
    SELECT COUNT(*) FROM event_store WHERE status='FAILED' AND created_at > NOW() - INTERVAL 1 HOUR;

KPI: Event Processing Latency
  Metric: processedAt - createdAt (for EventStore records)
  Threshold: P95 < 5s
  Query:
    SELECT 
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at)))
    FROM event_store
    WHERE status='PROCESSED' AND processed_at > NOW() - INTERVAL 1 HOUR;
```

### 4.2 Rate Limiting Metrics

```
KPI: 429 Rate Limit Errors
  Metric: count(HTTP 429 responses)
  By Dimension: endpoint, policy, dimension (per-user/per-ip/per-exam)
  Threshold: WARN if > 5% of traffic to an endpoint
  Sample Query (Nginx/Prometheus):
    rate(http_requests_total{status="429"}[5m]) by (endpoint, policy)

KPI: Token Bucket Fullness
  Metric: avg(remaining_tokens) per key
  Threshold: If consistently near 0, may indicate legitimate users being throttled
  Monitoring: Sampled Redis HGETALL on rl:* keys

KPI: Redis Availability
  Metric: rate(redis_commands_failed[1m])
  Threshold: CRIT if > 0.1% failure rate
  Action: Trigger page/alert (fail-open may allow requests without limits)
```

### 4.3 Exam Snapshot Metrics

```
KPI: Snapshot Creation Time
  Metric: publishExam latency (duration of snapshot transaction)
  Threshold: P99 < 2s
  Query:
    SELECT 
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY transaction_duration_ms)
    FROM exams_publish_log
    WHERE created_at > NOW() - INTERVAL 1 HOUR;

KPI: Submissions Using Snapshot
  Metric: % of submissions with examSnapshotId IS NOT NULL
  Target: 100% (for new submissions)
  Query:
    SELECT 
      COUNT(CASE WHEN exam_snapshot_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)
    FROM exam_submissions
    WHERE created_at > NOW() - INTERVAL 1 HOUR;
```

### 4.4 Database Load

```
KPI: Write Latency (Submissions)
  Metric: INSERT/UPDATE latency on exam_submissions, submission_answers
  Threshold: P95 < 100ms
  Sample:
    slow_query_log for queries > 100ms

KPI: Snapshot Payload Size
  Metric: avg(JSON_LENGTH(payload)) for exam_snapshots
  Threshold: WARN if > 1MB (may indicate inefficient serialization)
  Query:
    SELECT 
      AVG(JSON_LENGTH(payload)) avg_payload_bytes,
      MAX(JSON_LENGTH(payload)) max_payload_bytes
    FROM exam_snapshots
    WHERE created_at > NOW() - INTERVAL 1 HOUR;
```

### 4.5 Monitoring Dashboard (Prometheus + Grafana)

```yaml
# Prometheus scrape config
scrape_configs:
  - job_name: 'academic-trust-api'
    static_configs:
      - targets: ['localhost:3001']

# Example dashboard panels:
1. "Queue Lag" (line chart)
   Query: queue_waiting{queue=~"integrity-logs|notifications|grading|events"}

2. "Rate Limit 429 Errors" (heatmap)
   Query: rate(http_requests_total{status="429"}[5m])

3. "Snapshot Submissions %" (gauge)
   Query: (submissions_with_snapshot / submissions_total) * 100

4. "Event Processing Latency" (percentile plot)
   Query: event_processing_latency_ms

5. "Redis Commands/sec" (line chart)
   Query: rate(redis_commands_executed_total[1m])
```

---

## 5. Summary Table

| Component | Technology | Key Metric | Threshold |
|-----------|-----------|-----------|-----------|
| **Exam Snapshots** | MySQL + Prisma | Snapshot creation latency | P99 < 2s |
| **Event Store** | MySQL + Bull queue | Event processing latency | P95 < 5s |
| **Rate Limiting** | Redis token-bucket (Lua) | 429 error rate | < 5% of requests |
| **Autosave Backpressure** | Queue lag check | Queue waiting jobs | Decline if > 1000 |
| **Pub/Sub (Realtime)** | Redis channels | Channel lag | < 100ms |
| **Database** | MySQL | Write latency (submissions) | P95 < 100ms |

---

## 6. Deployment Checklist

- [ ] Prisma migration: `npx prisma migrate deploy` (exam snapshot + event store tables)
- [ ] Redis Lua script: Loaded into Redis during RateLimiterService init
- [ ] Bull queue: Register 'events' queue in QueueModule
- [ ] EventsProcessor: Start processing durable events
- [ ] RateLimitGuard: Applied to submission endpoints
- [ ] Monitoring: Scrape metrics, populate dashboard
- [ ] Load test: Simulate 2000–5000 concurrent users
- [ ] Backfill: Create snapshots for existing published exams (async migration job)
- [ ] Documentation: Share this spec with ops & QA teams

---

**Last Updated**: 2026-04-29  
**Document Owner**: Backend Architecture Team  
**Review Cycle**: Quarterly (next review: 2026-07-29)
