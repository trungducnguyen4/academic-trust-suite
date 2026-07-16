import { CourseTerm } from './course-term';

const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof import.meta !== "undefined"
    ? ((import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL as
        | string
        | undefined)
    : undefined);

export const API_BASE_URL = (rawApiBaseUrl?.trim() || 'http://localhost:3001/api').replace(/\/$/, '');

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  clearToken(): void {
    localStorage.removeItem('accessToken');
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const token = this.getToken();
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  private async waitForAiJob<T>(jobId: string, timeoutMs = 120000, intervalMs = 2000): Promise<T> {
    if (!jobId) {
      throw new Error('Cannot wait for AI job: jobId is missing.');
    }

    const startedAt = Date.now();
    let attempts = 0;
    let lastStatus = 'unknown';

    while (Date.now() - startedAt < timeoutMs) {
      attempts++;
      const job = await this.getQuestionAIGenerationJob(jobId);
      const status = String(job?.status || '').toUpperCase();
      lastStatus = status;

      console.log('[AI] Poll attempt:', { attempts, jobId, status, elapsedMs: Date.now() - startedAt });

      if (status === 'SUCCEEDED') {
        const output = job?.output || {};
        return output as T;
      }

      if (status === 'FAILED' || status === 'REJECTED') {
        throw new Error(job?.errorMessage || `AI job failed with status ${status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `AI job timed out after ${timeoutMs}ms. ` +
      `Job ID: ${jobId}. ` +
      `Last status: ${lastStatus}. ` +
      `Poll attempts: ${attempts}. ` +
      `Make sure the backend and AI worker are running.`,
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    studentId?: string;
    department?: string;
  }) {
    return this.request<{ accessToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: data,
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async updateMyProfile(data: {
    email?: string;
    fullName?: string;
    studentId?: string;
    department?: string;
  }) {
    return this.request<any>('/auth/me', {
      method: 'PATCH',
      body: data,
    });
  }

  async changeMyPassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<{ message: string }>('/auth/me/password', {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteMyProfile(data: { currentPassword: string }) {
    return this.request<{ message: string }>('/auth/me', {
      method: 'DELETE',
      body: data,
    });
  }

  // Users endpoints
  async getUsers(params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any>(`/users${query}`);
  }

  async getUser(id: string) {
    return this.request<any>(`/users/${id}`);
  }

  async getStudents() {
    return this.request<any[]>('/users/students');
  }

  async getLecturers() {
    return this.request<any[]>('/users/lecturers');
  }

  async createUser(data: {
    email: string;
    password: string;
    fullName: string;
    role: 'ADMIN' | 'LECTURER' | 'STUDENT';
    studentId?: string;
    department?: string;
    status?: 'active' | 'suspended' | 'pending';
  }) {
    return this.request<any>('/users', {
      method: 'POST',
      body: data,
    });
  }

  async updateUser(id: string, data: {
    email?: string;
    password?: string;
    fullName?: string;
    role?: 'ADMIN' | 'LECTURER' | 'STUDENT';
    studentId?: string;
    department?: string;
    status?: 'active' | 'suspended' | 'pending';
  }) {
    return this.request<any>(`/users/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteUser(id: string) {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Courses endpoints
  async getCourses(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any>(`/courses${query}`);
  }

  async getMyCourses() {
    return this.request<any>('/courses/my-courses');
  }

  async getCourse(id: string) {
    return this.request<any>(`/courses/${id}`);
  }

  async createCourse(data: {
    name: string;
    description?: string;
    credits?: number;
    academicYear: string;
    term: CourseTerm;
    lecturerId?: string;
  }) {
    return this.request<any>('/courses', {
      method: 'POST',
      body: data,
    });
  }

  async updateCourse(id: string, data: any) {
    return this.request<any>(`/courses/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteCourse(id: string) {
    return this.request<any>(`/courses/${id}`, { method: 'DELETE' });
  }

  // Enrollments endpoints
  async enrollStudent(courseId: string, studentId: string) {
    return this.request<any>('/enrollments', {
      method: 'POST',
      body: { courseId, studentId },
    });
  }

  async bulkEnroll(courseId: string, studentIds: string[]) {
    return this.request<any>('/enrollments/bulk', {
      method: 'POST',
      body: { courseId, studentIds },
    });
  }

  async getCourseEnrollments(courseId: string) {
    return this.request<any[]>(`/enrollments/course/${courseId}`);
  }

  async getMyEnrollments() {
    return this.request<any[]>('/enrollments/my-enrollments');
  }

  async removeEnrollment(id: string) {
    return this.request<any>(`/enrollments/${id}`, { method: 'DELETE' });
  }

  async bulkEnrollByEmails(courseId: string, emails: string[]) {
    return this.request<{
      success: { email: string; fullName: string; studentId: string | null }[];
      failed: { email: string; reason: string }[];
      provisioned: number;
    }>('/enrollments/bulk-by-emails', {
      method: 'POST',
      body: { courseId, emails },
    });
  }

  async bulkImportStudents(courseId: string, students: { email: string; studentId?: string; fullName?: string; className?: string }[]) {
    return this.request<{
      success: { email: string; fullName: string; studentId: string | null; row: number }[];
      failed: { email: string; reason: string; row: number }[];
      provisioned: number;
      totalProcessed: number;
    }>('/enrollments/bulk-import', {
      method: 'POST',
      body: { courseId, students },
    });
  }

  async searchTrainingSystemStudents(params: { query?: string; courseId?: string }) {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append('query', params.query);
    if (params.courseId) queryParams.append('courseId', params.courseId);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any[]>(`/enrollments/training-system/students${query}`);
  }

  // Questions endpoints (official)
  async listQuestions(filters?: {
    topicId?: string;
    tagId?: string;
    courseId?: string;
    type?: string;
    difficulty?: number;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.topicId) params.append('topicId', filters.topicId);
    if (filters?.tagId) params.append('tagId', filters.tagId);
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.difficulty) params.append('difficulty', String(filters.difficulty));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/questions${query}`);
  }

  async getQuestionById(id: string) {
    return this.request<any>(`/questions/${id}`);
  }

  async getQuestionStats() {
    return this.request<any>('/questions/stats');
  }

  async deleteQuestion(id: string) {
    return this.request<any>(`/questions/${id}`, { method: 'DELETE' });
  }

  private normalizeQuestionType(type?: string): string {
    const normalized = String(type || '').trim().toUpperCase();
    if (normalized === 'SINGLE_CHOICE') return 'MULTIPLE_CHOICE';
    const allowed = new Set([
      'MULTIPLE_CHOICE',
      'MULTI_SELECT',
      'TRUE_FALSE',
      'SHORT_ANSWER',
      'ESSAY',
      'FILL_IN_BLANK',
      'MATCHING',
      'ORDERING',
    ]);
    return allowed.has(normalized) ? normalized : 'MULTIPLE_CHOICE';
  }

  async saveQuestion(data: {
    sourceQuestionId?: string;
    type?: string;
    content: string;
    options?: Record<string, any>;
    correctAnswer?: Record<string, any>;
    explanation?: string;
    difficulty?: number;
    points?: number;
    defaultPoints?: number;
    
    courseId?: string;
    topicId?: string;
    learningObjective?: string;
    topic?: string;
  }) {
    const questionType = this.normalizeQuestionType(data.type);
    const draft = await this.createQuestionDraft({
      mode: data.sourceQuestionId ? 'DUPLICATE' : 'MANUAL',
      questionType,
      sourceQuestionId: data.sourceQuestionId,
      initialContext: {
        courseId: data.courseId,
        topicId: data.topicId || data.topic,
        topic: data.topic,
        learningObjective: data.learningObjective,
      },
    });

    let autosaveVersion = Number(draft?.autosaveVersion || 1);

    const intentRes = await this.saveQuestionDraftStep(draft.draftId, 'intent', {
      autosaveVersion,
      data: { questionType },
    });
    autosaveVersion = Number(intentRes?.autosaveVersion || autosaveVersion + 1);

    const contentRes = await this.saveQuestionDraftStep(draft.draftId, 'content', {
      autosaveVersion,
      data: { content: data.content || '' },
    });
    autosaveVersion = Number(contentRes?.autosaveVersion || autosaveVersion + 1);

    const answersRes = await this.saveQuestionDraftStep(draft.draftId, 'answers', {
      autosaveVersion,
      data: {
        options: data.options || {},
        correctAnswer: data.correctAnswer || {},
        explanation: data.explanation || '',
      },
    });
    autosaveVersion = Number(answersRes?.autosaveVersion || autosaveVersion + 1);

    const classificationRes = await this.saveQuestionDraftStep(
      draft.draftId,
      'classification',
      {
        autosaveVersion,
        data: {
          difficulty: data.difficulty,
          points: data.points,
          defaultPoints: data.defaultPoints ?? data.points ?? 1,
          courseId: data.courseId,
          
          topicId: data.topicId || data.topic,
          topic: data.topic,
          learningObjective: data.learningObjective,
          courseScopeIds: data.courseId ? [data.courseId] : [],
        },
      },
    );
    autosaveVersion = Number(
      classificationRes?.autosaveVersion || autosaveVersion + 1,
    );

    const publishRes = await this.publishQuestionDraft(draft.draftId, {
      expectedAutosaveVersion: autosaveVersion,
      publishMode: 'PUBLISHED',
    });

    if (publishRes?.questionId) {
      return this.getQuestionById(publishRes.questionId);
    }

    return publishRes;
  }

  async createQuestionDraft(data: {
    mode: 'MANUAL' | 'AI_ASSISTED' | 'DUPLICATE';
    questionType?: string;
    sourceQuestionId?: string;
    initialContext?: Record<string, any>;
  }) {
    return this.request<any>('/questions/drafts', {
      method: 'POST',
      body: data,
    });
  }

  async saveQuestionDraftStep(draftId: string, stepKey: 'intent' | 'content' | 'answers' | 'classification' | 'review', data: {
    autosaveVersion: number;
    data: Record<string, any>;
  }) {
    return this.request<any>(`/questions/drafts/${draftId}/steps/${stepKey}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async aiGenerateQuestionDraftSection(draftId: string, data: {
    section: 'CONTENT' | 'ANSWERS' | 'EXPLANATION' | 'CLASSIFICATION';
    instruction?: string;
    constraints?: {
      difficulty?: number;
      language?: string;
      optionCount?: number;
      maxLength?: number;
      forbiddenTerms?: string[];
    };
    variants?: number;
  }) {
    const response = await this.request<{
      jobId?: string;
      status?: string;
      candidates?: Array<Record<string, any>>;
    }>(`/questions/drafts/${draftId}/ai-generate-section`, {
      method: 'POST',
      body: data,
    });

    if (response?.jobId) {
      return this.waitForAiJob<{ candidates: Array<Record<string, any>> }>(response.jobId);
    }

    return response as any;
  }

  async applyQuestionDraftAICandidate(draftId: string, data: {
    jobId: string;
    candidateId: string;
    section: 'CONTENT' | 'ANSWERS' | 'EXPLANATION' | 'CLASSIFICATION';
  }) {
    return this.request<any>(`/questions/drafts/${draftId}/ai-apply`, {
      method: 'POST',
      body: data,
    });
  }

  async validateQuestionDraft(draftId: string, data?: { level?: 'SOFT' | 'STRICT' }) {
    return this.request<any>(`/questions/drafts/${draftId}/validate`, {
      method: 'POST',
      body: data || {},
    });
  }

  async publishQuestionDraft(draftId: string, data: {
    expectedAutosaveVersion: number;
    publishMode?: 'IN_REVIEW' | 'PUBLISHED';
  }) {
    return this.request<any>(`/questions/drafts/${draftId}/publish`, {
      method: 'POST',
      body: data,
    });
  }

  async getQuestionAIGenerationJob(jobId: string) {
    return this.request<any>(`/questions/ai-jobs/${jobId}?t=${Date.now()}`);
  }

  async getQuestionHistory(filters?: { courseId?: string }) {
    const params = new URLSearchParams();
    if (filters?.courseId && filters.courseId !== 'all') params.append('courseId', filters.courseId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/questions/history${query}`);
  }

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    kind?: string;
    severity?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.kind && params.kind !== 'all') query.append('kind', params.kind);
    if (params?.severity && params.severity !== 'all') query.append('severity', params.severity);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<any>(`/audit-logs${suffix}`);
  }

  async listQuestionTags(filters?: { search?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    // Tags metadata endpoint removed
    return { data: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } } as any;
  }

  async createQuestionTag(name: string) {
    // Tags creation removed
    throw new Error('Tags are not supported');
  }

  async listQuestionTopics(filters?: { search?: string; courseId?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/questions/metadata/topics${query}`);
  }

  async createQuestionTopic(data: { code: string; name: string; courseId?: string }) {
    return this.request<any>('/questions/metadata/topics', {
      method: 'POST',
      body: data,
    });
  }

  async suggestSimilarTopics(data: {
    topicName: string;
    existingTopics: string[];
    language?: string;
    courseName?: string;
  }) {
    return this.request<any>('/ai/suggest-similar-topics', {
      method: 'POST',
      body: data,
    });
  }

  async setCourseTopics(courseId: string, topicIds: string[]) {
    return this.request<any>(`/questions/metadata/courses/${courseId}/topics`, {
      method: 'PUT',
      body: { topicIds },
    });
  }

  // Exams endpoints
  async getExams(filters?: { courseId?: string; status?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/exams${query}`);
  }

  async getAvailableExams() {
    return this.request<any[]>('/exams/available');
  }

  async getExam(id: string) {
    return this.request<any>(`/exams/${id}`);
  }

  async shareExam(examId: string, emails: string[] = [], sendToCourse?: boolean) {
    return this.request<any>(`/exams/${examId}/share`, {
      method: 'POST',
      body: { emails, sendToCourse },
    });
  }

  async createExam(data: {
    title: string;
    description?: string;
    courseId: string;
    duration: number;
    timeLimitMinutes?: number | null;
    totalPoints?: number;
    passingScore?: number;
    startTime?: string;
    endTime?: string;
    maxAttempts?: number | null;
    gradingStrategy?: 'HIGHEST' | 'AVERAGE' | 'FIRST_ATTEMPT' | 'LAST_ATTEMPT' | null;
    reviewSettings?: Record<string, any> | null;
    questionSelectionConfig?: Record<string, any> | null;
    settings?: any;
    questionIds?: string[];
  }) {
    return this.request<any>('/exams', {
      method: 'POST',
      body: data,
    });
  }

  async updateExam(id: string, data: any) {
    return this.request<any>(`/exams/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async rescheduleExam(id: string, data: { startTime: string; endTime: string }) {
    return this.request<any>(`/exams/${id}/reschedule`, {
      method: 'PATCH',
      body: data,
    });
  }

  async publishExam(id: string) {
    return this.request<any>(`/exams/${id}/publish`, { method: 'POST' });
  }

  async addQuestionsToExam(examId: string, questionIds: string[]) {
    return this.request<any>(`/exams/${examId}/questions`, {
      method: 'POST',
      body: { questionIds },
    });
  }

  async removeQuestionFromExam(examId: string, questionId: string) {
    return this.request<any>(`/exams/${examId}/questions/${questionId}`, {
      method: 'DELETE',
    });
  }

  async getExamStats(examId: string) {
    return this.request<any>(`/exams/${examId}/stats`);
  }

  async deleteExam(id: string) {
    return this.request<any>(`/exams/${id}`, { method: 'DELETE' });
  }

  async generateExamLink(
    examId: string,
    data: {
      expiryDatetime?: string;
      maxUses?: number;
      password?: string;
      restrictedToCourse?: boolean;
      note?: string;
    },
  ) {
    return this.request<any>(`/exams/${examId}/generate-link`, {
      method: 'POST',
      body: data,
    });
  }

  async getExamLinks(examId: string) {
    return this.request<any[]>(`/exams/${examId}/links`);
  }

  async validateExamLink(token: string) {
    return this.request<any>(`/exam-links/validate/${token}`);
  }

  async joinExamByLink(token: string, data?: { password?: string }) {
    return this.request<any>(`/exam-links/${token}/join`, {
      method: 'POST',
      body: data || {},
    });
  }

  async updateExamLink(id: string, data: { disabled?: boolean; expiryDatetime?: string; maxUses?: number; note?: string }) {
    return this.request<any>(`/exam-links/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async getExamLinkUsage(id: string) {
    return this.request<any[]>(`/exam-links/${id}/usage`);
  }

  // Submissions endpoints
  async getSubmissions(page?: number, limit?: number) {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/submissions${query}`);
  }

  async startExam(examId: string) {
    return this.request<any>('/submissions/start', {
      method: 'POST',
      body: { examId },
    });
  }

  async submitExam(submissionId: string, answers: Array<{ questionId: string; answer: any; timeTaken?: number }>, logs?: Array<{ type: string; details?: any; ts?: number }>) {
    return this.request<any>(`/submissions/${submissionId}/submit`, {
      method: 'POST',
      body: { answers, logs },
    });
  }

  async autosaveExamAnswers(
    submissionId: string,
    payload: {
      clientBatchId?: string;
      baseSubmissionVersion?: number;
      answers: Array<{
        questionId: string;
        sequence: number;
        answer: any;
        timeTaken?: number;
      }>;
    },
  ) {
    return this.request<any>(`/submissions/${submissionId}/autosave`, {
      method: 'POST',
      body: payload,
    });
  }

  async sendExamLogs(submissionId: string, logs: Array<{ type: string; details?: any; ts?: number }>) {
    return this.request<any>(`/submissions/${submissionId}/logs`, {
      method: 'POST',
      body: { logs },
    });
  }

  async getMySubmissions() {
    return this.request<any[]>('/submissions/my-submissions');
  }

  async getMyExamSubmission(examId: string) {
    return this.request<any>(`/submissions/exam/${examId}/my-submission`);
  }

  async getMySubmissionById(submissionId: string) {
    return this.request<any>(`/submissions/my-submissions/${submissionId}`);
  }

  async getExamSubmissions(examId: string, page?: number, limit?: number) {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/submissions/exam/${examId}${query}`);
  }

  async getExamOverview(examId: string) {
    return this.request<any>(`/submissions/exam/${examId}/overview`);
  }

  async getIntegrityCases(params?: {
    page?: number;
    limit?: number;
    search?: string;
    confidence?: string;
    examTitle?: string;
    submittedFrom?: string;
    submittedTo?: string;
    timeAnomaly?: boolean;
    status?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.confidence && params.confidence !== 'all') query.append('confidence', params.confidence);
    if (params?.examTitle) query.append('examTitle', params.examTitle);
    if (params?.submittedFrom) query.append('submittedFrom', params.submittedFrom);
    if (params?.submittedTo) query.append('submittedTo', params.submittedTo);
    if (typeof params?.timeAnomaly === 'boolean') query.append('timeAnomaly', String(params.timeAnomaly));
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<any>(`/submissions/integrity/cases${suffix}`);
  }

  async getExamIntelligence(examId: string) {
    return this.request<any>(`/submissions/exam/${examId}/intelligence`);
  }

  async getSubmissionTimeline(submissionId: string) {
    return this.request<any>(`/submissions/${submissionId}/timeline`);
  }

  async getExamManualGradingStatus(examId: string) {
    return this.request<any>(`/submissions/exam/${examId}/manual-grading-status`);
  }

  async publishExamResults(examId: string) {
    return this.request<any>(`/submissions/exam/${examId}/publish-results`, {
      method: 'POST',
    });
  }

  async getSubmission(id: string) {
    return this.request<any>(`/submissions/${id}`);
  }

  async getManualGradingSubmission(submissionId: string) {
    return this.request<any>(`/submissions/${submissionId}/manual-grading`);
  }

  async gradeAnswer(submissionAnswerId: string, pointsAwarded: number, feedback?: string) {
    return this.request<any>('/submissions/grade-answer', {
      method: 'POST',
      body: { submissionAnswerId, pointsAwarded, feedback },
    });
  }

  async finalizeGrading(submissionId: string) {
    return this.request<any>(`/submissions/${submissionId}/finalize-grading`, {
      method: 'POST',
    });
  }

  async updateSubmissionStatus(submissionId: string, status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'FLAGGED') {
    return this.request<any>(`/submissions/${submissionId}/status`, {
      method: 'PATCH',
      body: { status },
    });
  }

  // Notifications endpoints
  async getMyNotifications(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.unreadOnly !== undefined) queryParams.append('unreadOnly', String(params.unreadOnly));
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any>(`/notifications/my${query}`);
  }

  async getUnreadNotificationCount() {
    return this.request<{ count: number }>('/notifications/unread-count');
  }

  async markNotificationAsRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<{ message: string }>('/notifications/read-all', {
      method: 'PATCH',
    });
  }

  async deleteNotification(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // AI endpoints
  async aiGenerateQuestion(data: {
    prompt: string;
    questionType?: string;
    difficulty?: number;
    language?: string;
    courseName?: string;
    useCase?: string;
    context?: Record<string, any>;
  }) {
    const response = await this.request<{
      jobId?: string;
      status?: string;
      content?: string;
      type?: string;
      explanation?: string;
      difficulty?: number;
      points?: number;
      topic?: string;
      learningObjective?: string;
      options?: Record<string, string> | null;
      correctAnswer?: Record<string, string> | null;
    }>('/ai/generate-question', {
      method: 'POST',
      body: data,
    });

    if (response?.jobId) {
      return this.waitForAiJob<{
        content: string;
        type: string;
        explanation: string;
        difficulty: number;
        points: number;
        topic?: string;
        learningObjective?: string;
        options: Record<string, string> | null;
        correctAnswer: Record<string, string> | null;
      }>(response.jobId);
    }

    return response as any;
  }

  async aiGenerateExamQuestions(data: {
    prompt: string;
    questionCount: number;
    difficulty?: number;
    questionType?: string;
    language?: string;
    courseName?: string;
    useCase?: string;
    courseId?: string;
    context?: Record<string, any>;
  }) {
    const response = await this.request<{
      jobId?: string;
      status?: string;
      questions?: Array<{
        content: string;
        type: string;
        explanation: string;
        difficulty: number;
        points: number;
        options: Record<string, string> | null;
        correctAnswer: Record<string, string> | null;
      }>;
    }>('/ai/generate-exam-questions', {
      method: 'POST',
      body: data,
    });

    if (response?.jobId) {
      return this.waitForAiJob<{
        questions: Array<{
          content: string;
          type: string;
          explanation: string;
          difficulty: number;
          points: number;
          options: Record<string, string> | null;
          correctAnswer: Record<string, string> | null;
        }>;
      }>(response.jobId);
    }

    return response as any;
  }

  async getMyRecentCourses() {
    return this.get('/courses/my-recent-courses');
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;

/**
 * Safely extract array data from a potentially paginated response.
 * If the response is already an array, return as-is.
 * If it's a paginated envelope { data: [...] }, return .data.
 */
export function unwrapPaginatedData<T = any>(response: any): T[] {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  return [];
}

