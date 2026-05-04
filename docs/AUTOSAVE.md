# Autosave Implementation Guide

## Overview
Autosave ensures that student exam answers and proctoring logs are saved continuously, allowing recovery from network interruptions and unexpected disconnections.

## Autosave Layers

### 1. Question Draft Autosave ✅ IMPLEMENTED
**Endpoint**: `PATCH /questions/drafts/:draftId/steps/:stepKey`
**Mechanism**: Per-step autosave with version tracking
**Storage**: QuestionDraft.autosaveVersion incremented on every step save
**Recovery**: Frontend fetches draft state, resumes from last saved step
**TTL**: Draft persists until user publishes or manually deletes

### 2. Exam Submission Answer Autosave ✅ IMPLEMENTED
**Endpoint**: `POST /submissions/:id/autosave`
**Mechanism**: Incremental answer upsert (no submission status change)
**Storage**: SubmissionAnswer records (upsert per question, allows retries)
**Recovery**: On page reload, fetch autosaved answers and resume
**Deduplication**: Unique constraint on (submissionId, questionId) prevents duplicates
**Latency**: <100ms per request (batch upsert, no transaction overhead)

### 3. Proctoring Logs Autosave ✅ IMPLEMENTED
**Endpoint**: `POST /submissions/:id/logs`
**Mechanism**: Batch integrity log creation + realtime event streaming
**Storage**: ProctoringSession (aggregates) + IntegrityLog (individual events)
**Notification**: Asynchronous notification dispatch (non-blocking)
**Event Flow**:
- Frontend sends logs every 10-30 seconds
- Backend creates integrity logs in transaction
- ProctoringSession aggregates updated incrementally
- Realtime SSE event emitted to lecturers (suspicious events only)

---

## Frontend Autosave Triggers

### Answer Autosave
```typescript
// Debounced autosave on answer change
const saveAnswer = debounce(async (questionId, answer) => {
  try {
    await api.autosaveExamAnswers(submissionId, [{ questionId, answer }]);
  } catch (err) {
    console.warn('Autosave failed:', err);
    // Continue exam, retry on next interval
  }
}, 1000); // Max 1 save per second

// Periodic autosave (every 30 seconds)
setInterval(() => {
  if (submissionId && pendingAnswers.length > 0) {
    api.autosaveExamAnswers(submissionId, pendingAnswers)
      .catch(() => {}); // Silent fail, not critical
  }
}, 30000);

// Network change detection
window.addEventListener('offline', () => {
  // Queue pending autosaves, retry when back online
  queuedAutosaves.push(...pendingAnswers);
});

window.addEventListener('online', () => {
  flushQueuedAutosaves();
});

// Page unload (Ctrl+W, close tab, navigate away)
window.addEventListener('beforeunload', (e) => {
  if (pendingAnswers.length > 0) {
    api.autosaveExamAnswers(submissionId, pendingAnswers, { timeout: 2000 });
    e.preventDefault(); // Request user confirmation
    e.returnValue = '';
  }
});
```

### Proctoring Logs Autosave
```typescript
// Send proctoring logs every 30 seconds (or when critical event detected)
const proctorInterval = setInterval(() => {
  if (integrityLogs.length > 0) {
    api.addLogs(submissionId, integrityLogs);
    integrityLogs = []; // Clear after send
  }
}, 30000);

// On critical event (e.g., tab switch), send immediately
function recordEvent(type, details) {
  integrityLogs.push({ type, details, ts: Date.now() });
  if (isCriticalEvent(type)) {
    api.addLogs(submissionId, integrityLogs);
    integrityLogs = [];
  }
}
```

---

## Recovery Flow

### On Page Reload (Student Resumes Exam)
```typescript
async function resumeExam(submissionId) {
  // Fetch last autosaved state
  const submission = await api.getSubmission(submissionId);
  const autosavedAnswers = submission.answers; // From SubmissionAnswer table
  
  // Restore to UI
  Object.entries(autosavedAnswers).forEach(([qId, answer]) => {
    updateQuestionUI(qId, answer);
  });
  
  // Resume autosave cycles
  startAutosaveInterval();
  startProctorInterval();
  
  // Reset timer (if exam duration tracking is needed)
  const elapsed = Date.now() - submission.startedAt.getTime();
  remainingTime = exam.duration * 60000 - elapsed;
}
```

---

## Server-Side Autosave Operations

### Autosave Endpoint
```typescript
@Post(':id/autosave')
@UseGuards(JwtAuthGuard)
async autosaveAnswers(
  @Param('id') submissionId: string,
  @Body() { answers }: AutosaveExamDto,
  @Request() req,
): Promise<{ success: boolean; count: number }> {
  // Validate submission & student ownership
  // Batch upsert answers (incremental save)
  // Return count of saved answers
  // NO submission status update (stays IN_PROGRESS)
}
```

### Duplicate Prevention
- **Constraint**: `@@unique([submissionId, questionId])` on SubmissionAnswer
- **Behavior**: Upsert (update if exists, create if new) prevents duplicates
- **Idempotency**: Multiple autosave calls for same answer = safe, no duplicates

### Error Handling
- **Network timeout**: Frontend queues and retries
- **Server error (5xx)**: Frontend logs and continues (non-critical)
- **Validation error (4xx)**: Frontend logs, user alerted if critical
- **Partial success**: Each answer upserted independently, partial saves accepted

---

## Monitoring & Alerts

### Autosave Metrics
- **Answer Save Rate**: Answers saved per minute (target: >95%)
- **Log Save Latency**: Time from event → log persisted (target: <5s)
- **Recovery Success Rate**: Exams resumed after page reload (target: >99%)
- **Data Loss Rate**: Autosaved answers but lost before final submit (target: 0%)

### Alerts
- **Autosave Backlog**: If more than 100 pending autosaves → advisor notified
- **Save Latency Spike**: If answer save >2s → performance investigation
- **High Failure Rate**: If >5% of autosave requests fail → alert ops

---

## Constraints & Edge Cases

### Race Conditions
1. **Concurrent answer updates**: Handled by DB constraint + upsert (last-write-wins)
2. **Submission already graded**: `startExam` idempotency prevents (checked before autosave)
3. **Answer after final submit**: Validation rejects (submission status != IN_PROGRESS)

### Limits
- **Max answers per autosave**: 500 (validated, extra ignored)
- **Max answer payload**: 1MB per question (JSON stringified)
- **Max autosave frequency**: No server-side limit (client debounces to 1/sec)
- **TTL for unsaved draft**: Removed after session expires (configurable, default 24h)

---

## Testing Checklist

- [ ] Autosave endpoint persists answers incrementally
- [ ] Upsert prevents duplicate answers on retry
- [ ] Network offline detection triggers queuing
- [ ] Page unload triggers flush to server
- [ ] Page reload recovers last autosaved state
- [ ] Answer updated by autosave shown in final submission
- [ ] Proctoring logs sent asynchronously (non-blocking)
- [ ] Additive attempt versioning (attemptNo increments)
- [ ] Idempotency key prevents duplicate submissions
- [ ] Notifications sent asynchronously (not blocking response)

