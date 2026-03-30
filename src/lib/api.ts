const API_BASE_URL = 'http://localhost:3001/api';

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

  // Users endpoints
  async getUsers(role?: string, page?: number, limit?: number) {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const query = params.toString() ? `?${params.toString()}` : '';
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

  // Courses endpoints
  async getCourses() {
    return this.request<any[]>('/courses');
  }

  async getMyCourses() {
    return this.request<any[]>('/courses/my-courses');
  }

  async getCourse(id: string) {
    return this.request<any>(`/courses/${id}`);
  }

  async createCourse(data: {
    code: string;
    name: string;
    description?: string;
    credits?: number;
    semester?: string;
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

  // Questions endpoints
  async getQuestions(filters?: { courseId?: string; type?: string; difficulty?: number; search?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.difficulty) params.append('difficulty', String(filters.difficulty));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/questions${query}`);
  }

  async getQuestion(id: string) {
    return this.request<any>(`/questions/${id}`);
  }

  async createQuestion(data: {
    type: string;
    content: string;
    options?: any;
    correctAnswer?: any;
    explanation?: string;
    difficulty?: number;
    points?: number;
    tags?: string[];
    courseId?: string;
  }) {
    return this.request<any>('/questions', {
      method: 'POST',
      body: data,
    });
  }

  async updateQuestion(id: string, data: any) {
    return this.request<any>(`/questions/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteQuestion(id: string) {
    return this.request<any>(`/questions/${id}`, { method: 'DELETE' });
  }

  async getQuestionStats() {
    return this.request<any>('/questions/stats');
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

  async createExam(data: {
    title: string;
    description?: string;
    courseId: string;
    duration: number;
    totalPoints?: number;
    passingScore?: number;
    startTime?: string;
    endTime?: string;
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

  async getMySubmissions() {
    return this.request<any[]>('/submissions/my-submissions');
  }

  async getMyExamSubmission(examId: string) {
    return this.request<any>(`/submissions/exam/${examId}/my-submission`);
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

  async getSubmission(id: string) {
    return this.request<any>(`/submissions/${id}`);
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

  // AI endpoints
  async aiGenerateQuestion(data: {
    prompt: string;
    questionType?: string;
    difficulty?: number;
    language?: string;
    courseName?: string;
    useCase?: string;
  }) {
    return this.request<{
      content: string;
      type: string;
      explanation: string;
      difficulty: number;
      points: number;
      tags: string[];
      topic?: string;
      learningObjective?: string;
      options: Record<string, string> | null;
      correctAnswer: Record<string, string> | null;
    }>('/ai/generate-question', {
      method: 'POST',
      body: data,
    });
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
  }) {
    return this.request<{
      questions: Array<{
        content: string;
        type: string;
        explanation: string;
        difficulty: number;
        points: number;
        tags: string[];
        options: Record<string, string> | null;
        correctAnswer: Record<string, string> | null;
      }>;
    }>('/ai/generate-exam-questions', {
      method: 'POST',
      body: data,
    });
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

