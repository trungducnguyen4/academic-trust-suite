import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class SubmissionsEventsService {
  private readonly examStreams = new Map<string, Subject<MessageEvent>>();

  streamExam(examId: string): Observable<MessageEvent> {
    if (!this.examStreams.has(examId)) {
      this.examStreams.set(examId, new Subject<MessageEvent>());
    }
    return this.examStreams.get(examId)!.asObservable();
  }

  emitIntegrityEvent(examId: string, payload: {
    id: string;
    submissionId: string;
    eventType: string;
    details?: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
    student: {
      id?: string;
      fullName?: string;
      studentId?: string;
    };
  }) {
    if (!this.examStreams.has(examId)) {
      this.examStreams.set(examId, new Subject<MessageEvent>());
    }

    const stream = this.examStreams.get(examId)!;
    stream.next({
      type: 'integrity',
      data: payload,
    });
  }
}
