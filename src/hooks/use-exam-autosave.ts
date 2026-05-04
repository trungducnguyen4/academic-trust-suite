import { useEffect, useRef, useCallback, useState } from 'react';

export interface AutosaveAnswer {
  questionId: string;
  sequence: number;
  answer: any;
  timeTaken?: number;
}

export type AutosaveSyncStatus = 'saving' | 'saved' | 'offline' | 'syncing' | 'error';

export interface UseExamAutosaveOptions {
  submissionId: string;
  autosaveInterval?: number;
  debounceDelay?: number;
  initialSubmissionVersion?: number;
  onAutosaveStart?: () => void;
  onAutosaveSuccess?: (count: number) => void;
  onAutosaveError?: (error: Error) => void;
}

const QUEUE_PREFIX = 'exam-autosave:';
const BATCH_SIZE = 20;

function getQueueStorageKey(submissionId: string) {
  return `${QUEUE_PREFIX}${submissionId}`;
}

function safeParseQueue(raw: string | null): AutosaveAnswer[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        questionId: String(item?.questionId || '').trim(),
        sequence: Number(item?.sequence || 0),
        answer: item?.answer,
        timeTaken: typeof item?.timeTaken === 'number' ? item.timeTaken : undefined,
      }))
      .filter((item) => item.questionId && Number.isInteger(item.sequence) && item.sequence > 0);
  } catch {
    return [];
  }
}

function persistQueue(submissionId: string, queue: Map<string, AutosaveAnswer>) {
  if (typeof window === 'undefined') return;
  const items = Array.from(queue.values()).sort((a, b) => a.questionId.localeCompare(b.questionId));
  window.localStorage.setItem(getQueueStorageKey(submissionId), JSON.stringify(items));
}

function loadQueue(submissionId: string) {
  if (typeof window === 'undefined') return new Map<string, AutosaveAnswer>();
  const queue = new Map<string, AutosaveAnswer>();
  const items = safeParseQueue(window.localStorage.getItem(getQueueStorageKey(submissionId)));
  for (const item of items) {
    queue.set(item.questionId, item);
  }
  return queue;
}

function batchize(values: AutosaveAnswer[], size: number) {
  const batches: AutosaveAnswer[][] = [];
  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }
  return batches;
}

/**
 * Autosave hook that keeps the newest answer per question and uses monotonically
 * increasing sequence numbers to prevent stale payloads from overwriting newer data.
 */
export const useExamAutosave = (apiClient: any, options: UseExamAutosaveOptions) => {
  const {
    submissionId,
    autosaveInterval = 30000,
    debounceDelay = 1000,
    initialSubmissionVersion = 0,
    onAutosaveStart,
    onAutosaveSuccess,
    onAutosaveError,
  } = options;

  const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const pendingAnswers = useRef<Map<string, AutosaveAnswer>>(new Map());
  const queuedAnswers = useRef<Map<string, AutosaveAnswer>>(loadQueue(submissionId));
  const sequenceByQuestionId = useRef<Map<string, number>>(new Map());
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef = useRef(initialOnline);
  const submissionVersionRef = useRef<number>(initialSubmissionVersion);
  const [syncStatus, setSyncStatus] = useState<AutosaveSyncStatus>(
    queuedAnswers.current.size > 0 ? (initialOnline ? 'syncing' : 'offline') : 'saved',
  );
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const sequenceMap = new Map<string, number>();
    for (const answer of queuedAnswers.current.values()) {
      const current = sequenceMap.get(answer.questionId) || 0;
      if (answer.sequence > current) {
        sequenceMap.set(answer.questionId, answer.sequence);
      }
    }
    sequenceByQuestionId.current = sequenceMap;
  }, [submissionId]);

  const setStatus = useCallback((status: AutosaveSyncStatus) => {
    setSyncStatus(status);
  }, []);

  const mergeIntoQueue = useCallback((answers: AutosaveAnswer[]) => {
    for (const answer of answers) {
      const current = queuedAnswers.current.get(answer.questionId);
      if (!current || answer.sequence > current.sequence) {
        queuedAnswers.current.set(answer.questionId, answer);
      }

      const currentSequence = sequenceByQuestionId.current.get(answer.questionId) || 0;
      if (answer.sequence > currentSequence) {
        sequenceByQuestionId.current.set(answer.questionId, answer.sequence);
      }
    }
    persistQueue(submissionId, queuedAnswers.current);
  }, [submissionId]);

  const flushBatch = useCallback(async (answers: AutosaveAnswer[]) => {
    if (answers.length === 0) return { success: true, count: 0, skipped: 0, serverVersion: submissionVersionRef.current };

    onAutosaveStart?.();
    setStatus(isOnlineRef.current ? 'saving' : 'offline');

    const response = await apiClient.autosaveExamAnswers(submissionId, {
      clientBatchId: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      baseSubmissionVersion: submissionVersionRef.current,
      answers,
    });

    if (typeof response?.serverVersion === 'number') {
      submissionVersionRef.current = response.serverVersion;
    }

    onAutosaveSuccess?.(Number(response?.count || 0));
    setLastError(null);
    setStatus('saved');
    return response;
  }, [apiClient, onAutosaveStart, onAutosaveSuccess, setStatus, submissionId]);

  const flushAutosave = useCallback(async () => {
    const answers = Array.from(pendingAnswers.current.values());
    if (answers.length === 0) return;

    try {
      const ordered = [...answers].sort((a, b) => a.questionId.localeCompare(b.questionId));
      await flushBatch(ordered);
      pendingAnswers.current.clear();
    } catch (error) {
      const err = error as Error;
      setLastError(err.message || 'Autosave failed');
      onAutosaveError?.(err);
      if (!isOnlineRef.current) {
        mergeIntoQueue(Array.from(pendingAnswers.current.values()));
        pendingAnswers.current.clear();
        setStatus('offline');
      } else {
        setStatus('error');
      }
    }
  }, [flushBatch, mergeIntoQueue, onAutosaveError, setStatus]);

  const flushQueuedAnswers = useCallback(async () => {
    if (queuedAnswers.current.size === 0) return;

    setStatus('syncing');
    const snapshots = Array.from(queuedAnswers.current.values()).sort((a, b) => {
      if (a.questionId === b.questionId) return b.sequence - a.sequence;
      return a.questionId.localeCompare(b.questionId);
    });

    for (const batch of batchize(snapshots, BATCH_SIZE)) {
      try {
        const response = await flushBatch(batch);
        if (typeof response?.serverVersion === 'number') {
          submissionVersionRef.current = response.serverVersion;
        }

        for (const item of batch) {
          const current = queuedAnswers.current.get(item.questionId);
          if (current && current.sequence <= item.sequence) {
            queuedAnswers.current.delete(item.questionId);
          }
        }
        persistQueue(submissionId, queuedAnswers.current);
      } catch (error) {
        const err = error as Error;
        setLastError(err.message || 'Failed to sync queued autosave');
        onAutosaveError?.(err);
        if (!isOnlineRef.current) {
          setStatus('offline');
        } else {
          setStatus('error');
        }
        persistQueue(submissionId, queuedAnswers.current);
        return;
      }
    }

    if (pendingAnswers.current.size > 0) {
      await flushAutosave();
      return;
    }

    setStatus('saved');
  }, [flushAutosave, flushBatch, onAutosaveError, setStatus, submissionId]);

  const recordAnswerChange = useCallback(
    (questionId: string, answer: any, timeTaken?: number) => {
      const currentSequence = sequenceByQuestionId.current.get(questionId) || 0;
      const nextSequence = currentSequence + 1;
      sequenceByQuestionId.current.set(questionId, nextSequence);

      pendingAnswers.current.set(questionId, {
        questionId,
        sequence: nextSequence,
        answer,
        timeTaken,
      });

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      setStatus(isOnlineRef.current ? 'saving' : 'offline');
      debounceTimeoutRef.current = setTimeout(() => {
        flushAutosave();
      }, debounceDelay);
    },
    [debounceDelay, flushAutosave, setStatus],
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (pendingAnswers.current.size > 0 && isOnlineRef.current) {
        flushAutosave();
      } else if (queuedAnswers.current.size > 0 && isOnlineRef.current) {
        flushQueuedAnswers();
      }
    }, autosaveInterval);

    return () => clearInterval(intervalId);
  }, [autosaveInterval, flushAutosave, flushQueuedAnswers]);

  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      setStatus('syncing');
      void flushQueuedAnswers();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setStatus('offline');
      mergeIntoQueue(Array.from(pendingAnswers.current.values()));
      pendingAnswers.current.clear();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueuedAnswers, mergeIntoQueue, setStatus]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const pending = Array.from(pendingAnswers.current.values());
      const queued = Array.from(queuedAnswers.current.values());
      const allAnswers = [...queued, ...pending];
      if (allAnswers.length === 0) return;

      const deduped = new Map<string, AutosaveAnswer>();
      for (const answer of allAnswers) {
        const current = deduped.get(answer.questionId);
        if (!current || answer.sequence > current.sequence) {
          deduped.set(answer.questionId, answer);
        }
      }

      const payload = {
        clientBatchId: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        baseSubmissionVersion: submissionVersionRef.current,
        answers: Array.from(deduped.values()),
      };

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`/api/submissions/${submissionId}/autosave`, blob);
      persistQueue(submissionId, deduped);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submissionId]);

  return {
    recordAnswerChange,
    flushAutosave,
    flushQueuedAnswers,
    getPendingCount: () => pendingAnswers.current.size,
    getQueuedCount: () => queuedAnswers.current.size,
    status: syncStatus,
    isOnline: isOnlineRef.current,
    lastError,
  };
};
