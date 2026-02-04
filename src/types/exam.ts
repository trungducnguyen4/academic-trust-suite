export type ExamStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

export interface Exam {
  id: string;
  title: string;
  course: string;
  duration: number; // in minutes
  totalQuestions: number;
  status: ExamStatus;
  scheduledAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  maxScore: number;
  percentile?: number;
  passed: boolean;
  submittedAt: Date;
  timeSpent: number; // in seconds
}

export interface UpcomingExam {
  id: string;
  title: string;
  course: string;
  scheduledAt: Date;
  duration: number;
}

export interface ExamHistoryItem {
  id: string;
  title: string;
  course: string;
  score: number;
  maxScore: number;
  passed: boolean;
  completedAt: Date;
}
